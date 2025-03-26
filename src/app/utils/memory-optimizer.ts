/**
 * 메모리 최적화 유틸리티
 * 
 * 애플리케이션 메모리 사용량을 최적화하는 기능을 제공합니다.
 */

import { MemoryInfo, OptimizationResult, OptimizationLevel } from '@/types';
import { requestNativeMemoryInfo, requestNativeMemoryOptimization } from './native-memory-bridge';
import { suggestGarbageCollection, cleanAllCaches } from './memory/gc-utils';
import { isBrowser } from './memory/gc-utils';

// 최적화 상태 인터페이스
interface OptimizationState {
  lastOptimization: number | null;
  optimizationCount: number;
  enabled: boolean;
  isOptimizing: boolean;
}

// 최적화 옵션 인터페이스
interface OptimizationOptions {
  aggressive?: boolean;
  threshold?: number;
  emergency?: boolean;
}

// 최적화 상태 관리
const optimizationState: OptimizationState = {
  lastOptimization: null,
  optimizationCount: 0,
  enabled: true,
  isOptimizing: false
};

/**
 * 메모리 정보 가져오기
 * @returns 메모리 정보 객체 또는 null
 */
export async function getMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    return await requestNativeMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 메모리 사용량 기반 최적화 수준 결정
 * @param memoryInfo 메모리 정보 객체
 * @returns 최적화 수준
 */
export function determineOptimizationLevel(memoryInfo: MemoryInfo): OptimizationLevel {
  const percentUsed = memoryInfo.percentUsed;
  
  if (percentUsed >= 90) {
    return OptimizationLevel.CRITICAL;
  } else if (percentUsed >= 80) {
    return OptimizationLevel.HIGH;
  } else if (percentUsed >= 70) {
    return OptimizationLevel.MEDIUM;
  } else if (percentUsed >= 60) {
    return OptimizationLevel.LOW;
  } else {
    return OptimizationLevel.NONE;
  }
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 수준
 * @param options 최적화 옵션
 * @returns 최적화 결과 객체 또는 null
 */
export async function optimizeMemory(
  level: OptimizationLevel | number = OptimizationLevel.MEDIUM,
  options: OptimizationOptions = {}
): Promise<OptimizationResult | null> {
  // 이미 최적화 중이면 건너뛰기
  if (optimizationState.isOptimizing) {
    return null;
  }
  
  try {
    optimizationState.isOptimizing = true;
    
    // 옵션 설정
    const { aggressive = false, emergency = false } = options;
    
    // 레벨 확인
    const optimizationLevel = typeof level === 'number' 
      ? level
      : OptimizationLevel.MEDIUM;
    
    // 네이티브 메모리 최적화 요청
    const result = await requestNativeMemoryOptimization(
      optimizationLevel,
      emergency || aggressive
    );
    
    // 최적화 성공 시 후속 조치
    if (result && result.success) {
      // 브라우저 환경에서만 실행
      if (isBrowser) {
        // 추가 캐시 정리
        cleanAllCaches();
        
        // GC 제안 (가능한 경우)
        suggestGarbageCollection();
      }
      
      // 최적화 상태 업데이트
      optimizationState.lastOptimization = Date.now();
      optimizationState.optimizationCount++;
    }
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return {
      success: false,
      timestamp: Date.now(),
      optimizationLevel: level,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  } finally {
    optimizationState.isOptimizing = false;
  }
}

/**
 * 최적화 상태 가져오기
 * @returns 최적화 상태 객체
 */
export function getOptimizationState(): OptimizationState {
  return { ...optimizationState };
}

/**
 * 자동 최적화 활성화 설정
 * @param enabled 활성화 여부
 */
export function setAutoOptimizationEnabled(enabled: boolean): void {
  optimizationState.enabled = enabled;
}

/**
 * 메모리 사용량 확인 및 필요시 최적화
 * @param threshold 최적화 임계값 (%)
 * @returns 최적화 수행 여부
 */
export async function checkAndOptimize(threshold = 75): Promise<boolean> {
  // 자동 최적화 비활성화 상태면 건너뛰기
  if (!optimizationState.enabled) {
    return false;
  }
  
  try {
    // 메모리 정보 가져오기
    const memoryInfo = await getMemoryInfo();
    
    if (!memoryInfo) {
      return false;
    }
    
    // 임계값 초과 시 최적화 수행
    if (memoryInfo.percentUsed >= threshold) {
      const level = determineOptimizationLevel(memoryInfo);
      
      // 충분히 높은 레벨일 때만 최적화
      if (level >= OptimizationLevel.MEDIUM) {
        await optimizeMemory(level, {
          emergency: level >= OptimizationLevel.CRITICAL
        });
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('메모리 확인 및 최적화 오류:', error);
    return false;
  }
}
