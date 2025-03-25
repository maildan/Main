/**
 * Rust 네이티브 모듈과 통신하는 브릿지 함수들
 * 모든 메모리 최적화 요청은 이 파일을 통해 이루어집니다.
 */
import { OptimizationLevel, MemoryInfo, OptimizationResult, GCResult } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel, safeOptimizationLevel, convertNativeMemoryInfo, convertNativeGCResult } from './enum-converters';
import { optimizeMemory, forceGarbageCollection, getMemoryInfo as fetchMemoryInfo, 
         initializeMemorySettings, updateMemorySettings, getMemorySettings } from './nativeModuleClient';

// 오류 추적을 위한 상태
const bridgeState = {
  lastError: null as Error | null,
  errorCount: 0,
  lastSuccessTime: Date.now(),
  isNativeAvailable: true
};

// 네이티브 함수 호출 래퍼
async function withErrorHandling<T>(
  operation: () => Promise<T>, 
  fallback: () => Promise<T | null> | T | null,
  operationName: string
): Promise<T | null> {
  try {
    // 네이티브 모듈 사용 불가능한 상태면 바로 폴백
    if (!bridgeState.isNativeAvailable) {
      return await fallback();
    }
    
    // 네이티브 작업 실행
    const result = await operation();
    
    // 성공 시 상태 업데이트
    bridgeState.lastSuccessTime = Date.now();
    bridgeState.lastError = null;
    return result;
  } catch (error) {
    // 오류 상태 업데이트
    bridgeState.lastError = error instanceof Error ? error : new Error(String(error));
    bridgeState.errorCount++;
    
    // 연속 오류가 많으면 네이티브 모듈을 사용 불가능한 것으로 표시
    if (bridgeState.errorCount > 5) {
      bridgeState.isNativeAvailable = false;
      console.error(`네이티브 모듈 사용 불가 상태로 전환: ${operationName} 작업 중 연속 오류`);
    }
    
    console.error(`네이티브 ${operationName} 요청 중 오류:`, error);
    
    // 폴백 실행
    return await fallback();
  }
}

/**
 * 네이티브 메모리 최적화 요청
 * @param level 최적화 레벨
 * @param emergency 긴급 상황 여부
 * @returns Promise<OptimizationResult | null>
 */
export async function requestNativeMemoryOptimization(
  level: OptimizationLevel | NativeOptimizationLevel,
  emergency: boolean = false
): Promise<OptimizationResult | null> {
  // 올바른 네이티브 레벨로 변환 (타입 안전성 보장)
  const nativeLevel = typeof level === 'number' 
    ? safeOptimizationLevel(level as number) 
    : toNativeOptimizationLevel(level as OptimizationLevel);
  
  return withErrorHandling(
    async () => {
      const response = await optimizeMemory(nativeLevel, emergency);
      
      if (response.success && response.result) {
        // 필드 이름 호환성 처리
        const result = {
          ...response.result,
          freedMemory: response.result.freed_memory || 0,
          freedMB: response.result.freed_mb || 0
        };
        return result;
      }
      
      throw new Error(response.error || '알 수 없는 최적화 오류');
    },
    // 폴백: 최소한의 결과 객체 반환
    () => ({
      success: false,
      optimization_level: nativeLevel as number,
      timestamp: Date.now(),
      error: bridgeState.lastError?.message || '네이티브 최적화 불가'
    }),
    '메모리 최적화'
  );
}

/**
 * 네이티브 가비지 컬렉션 요청
 * @returns Promise<GCResult | null>
 */
export async function requestNativeGarbageCollection(): Promise<GCResult | null> {
  return withErrorHandling(
    async () => {
      const response = await forceGarbageCollection();
      
      if (response.success && response.result) {
        return convertNativeGCResult(response.result);
      }
      
      throw new Error(response.error || '알 수 없는 가비지 컬렉션 오류');
    },
    // 폴백: 최소한의 결과 객체 반환
    () => ({
      success: false,
      timestamp: Date.now(),
      error: bridgeState.lastError?.message || '네이티브 가비지 컬렉션 불가'
    }),
    '가비지 컬렉션'
  );
}

/**
 * 네이티브 메모리 정보 요청
 * @returns Promise<MemoryInfo | null>
 */
export async function requestNativeMemoryInfo(): Promise<MemoryInfo | null> {
  return withErrorHandling(
    async () => {
      const response = await fetchMemoryInfo();
      
      if (response.success && response.memoryInfo) {
        return response.memoryInfo;
      }
      
      throw new Error(response.error || '알 수 없는 메모리 정보 오류');
    },
    // 폴백: 최소한의 결과 객체 반환
    () => ({
      percent_used: 0,
      heap_used_mb: 0,
      heap_total_mb: 0,
      timestamp: Date.now(),
      error: bridgeState.lastError?.message || '네이티브 메모리 정보 불가'
    }),
    '메모리 정보'
  );
}

/**
 * 메모리 최적화 수준 결정
 * @param memoryInfo 메모리 정보
 * @returns 최적화 수준 (0-4)
 */
export function determineOptimizationLevel(memoryInfo: MemoryInfo): OptimizationLevel {
  // 메모리 사용률에 따른 최적화 수준 결정
  const percentUsed = memoryInfo.percent_used || 0;
  
  if (percentUsed > 90) return OptimizationLevel.EXTREME;
  if (percentUsed > 80) return OptimizationLevel.HIGH;
  if (percentUsed > 70) return OptimizationLevel.MEDIUM;
  if (percentUsed > 50) return OptimizationLevel.LOW;
  return OptimizationLevel.NONE;
}

/**
 * 주기적인 메모리 최적화 수행
 * @param interval 체크 간격 (밀리초)
 * @param threshold 최적화 임계값 (MB)
 * @returns 클린업 함수
 */
export function setupPeriodicMemoryOptimization(
  interval: number = 30000,
  threshold: number = 100
): () => void {
  // 주기적인 메모리 최적화 설정
  const timerId = setInterval(async () => {
    try {
      const memoryInfo = await requestNativeMemoryInfo();
      
      if (!memoryInfo) {
        return;
      }
      
      const memoryUsedMB = memoryInfo.heap_used_mb || 0;
      
      if (memoryUsedMB > threshold) {
        // 임계값 초과 시 메모리 최적화 수행
        const level = determineOptimizationLevel(memoryInfo);
        await requestNativeMemoryOptimization(level, level === OptimizationLevel.EXTREME);
      }
    } catch (error) {
      console.error('주기적 메모리 최적화 중 오류:', error);
    }
  }, interval);
  
  // 클린업 함수 반환
  return () => {
    clearInterval(timerId);
  };
}

// 추가 함수들 내보내기
export {
  initializeNativeMemorySettings,
  updateNativeMemorySettings,
  getNativeMemorySettings
} from './memory-settings-bridge';
