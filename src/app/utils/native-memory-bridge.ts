/**
 * Rust 네이티브 모듈과 통신하는 브릿지 함수들
 * 모든 메모리 최적화 요청은 이 파일을 통해 이루어집니다.
 */
import { OptimizationLevel, MemoryInfo, OptimizationResult, GCResult } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel, convertNativeMemoryInfo, convertNativeGCResult } from './enum-converters';
import { optimizeMemory, forceGarbageCollection, getMemoryInfo as fetchMemoryInfo, 
         initializeMemorySettings, updateMemorySettings, getMemorySettings } from './nativeModuleClient';

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
  try {
    // AppOptimizationLevel을 NativeOptimizationLevel로 변환
    const nativeLevel = typeof level === 'number' && level >= 0 && level <= 4
      ? level as NativeOptimizationLevel
      : toNativeOptimizationLevel(level as OptimizationLevel);
    
    const response = await optimizeMemory(nativeLevel, emergency);
    
    if (response.success && response.result) {
      return response.result;
    }
    
    console.warn('네이티브 메모리 최적화 실패:', response.error);
    return null;
  } catch (error) {
    console.error('네이티브 메모리 최적화 요청 중 오류:', error);
    return null;
  }
}

/**
 * 네이티브 가비지 컬렉션 요청
 * @returns Promise<GCResult | null>
 */
export async function requestNativeGarbageCollection(): Promise<GCResult | null> {
  try {
    const response = await forceGarbageCollection();
    
    if (response.success && response.result) {
      return convertNativeGCResult(response.result);
    }
    
    console.warn('네이티브 가비지 컬렉션 실패:', response.error);
    return null;
  } catch (error) {
    console.error('네이티브 가비지 컬렉션 요청 중 오류:', error);
    return null;
  }
}

/**
 * 네이티브 메모리 정보 요청
 * @returns Promise<MemoryInfo | null>
 */
export async function requestNativeMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    const response = await fetchMemoryInfo();
    
    if (response.success && response.memoryInfo) {
      return response.memoryInfo;
    }
    
    console.warn('네이티브 메모리 정보 가져오기 실패:', response.error);
    return null;
  } catch (error) {
    console.error('네이티브 메모리 정보 요청 중 오류:', error);
    return null;
  }
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
