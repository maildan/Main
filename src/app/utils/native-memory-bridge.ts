/**
 * Rust 네이티브 모듈과 통신하는 브릿지 함수들
 * 모든 메모리 최적화 요청은 이 파일을 통해 이루어집니다.
 */
import { optimizeMemory, forceGarbageCollection, getMemoryInfo } from './nativeModuleClient';
import type { OptimizationLevel, OptimizationResult, GCResult, MemoryInfo } from '@/types/native-module';

/**
 * 네이티브 메모리 최적화 요청
 * @param level 최적화 레벨
 * @param emergency 긴급 상황 여부
 * @returns Promise<OptimizationResult | null>
 */
export async function requestNativeMemoryOptimization(
  level: OptimizationLevel,
  emergency: boolean = false
): Promise<OptimizationResult | null> {
  try {
    const response = await optimizeMemory(level, emergency);
    
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
      return response.result;
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
    const response = await getMemoryInfo();
    
    if (response.success && response.memoryInfo) {
      return response.memoryInfo;
    }
    
    console.warn('네이티브 메모리 정보 요청 실패:', response.error);
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
  const percentUsed = memoryInfo.percentUsed || 0;
  
  if (percentUsed > 90) return OptimizationLevel.Critical;
  if (percentUsed > 80) return OptimizationLevel.High;
  if (percentUsed > 70) return OptimizationLevel.Medium;
  if (percentUsed > 50) return OptimizationLevel.Low;
  return OptimizationLevel.Normal;
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
        console.warn('메모리 정보를 얻지 못했습니다. 최적화 건너뜁니다.');
        return;
      }
      
      const memoryUsedMB = memoryInfo.heapUsedMB || 0;
      
      if (memoryUsedMB > threshold) {
        console.log(`메모리 사용량(${memoryUsedMB}MB)이 임계값(${threshold}MB)을 초과했습니다. 최적화 수행 중...`);
        
        const level = determineOptimizationLevel(memoryInfo);
        await requestNativeMemoryOptimization(level, level === OptimizationLevel.Critical);
      }
    } catch (error) {
      console.error('주기적 메모리 최적화 중 오류:', error);
    }
  }, interval);
  
  // 클린업 함수 반환
  return () => clearInterval(timerId);
}
