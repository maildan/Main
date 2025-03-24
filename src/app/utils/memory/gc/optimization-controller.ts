/**
 * 메모리 최적화 컨트롤러
 * 다양한 최적화 레벨에 따른 메모리 최적화 기능 제공
 */

import { MemoryInfo, OptimizationLevel, GCResult } from '../../types';
import { OptimizationResult } from '../../interfaces/memory-types';
import { cleanupDOM } from './dom-cleanup-util';
import { clearAllCache as clearCache } from './cache-optimizer';
import { cleanupResources as cleanupDynamicResources } from './resource-optimizer';
import { requestGC, suggestGarbageCollection } from './garbage-collector';
import { emergencyMemoryRecovery } from './emergency-recovery';
import { enableGPUAcceleration as gpuAccelerate } from '../gpu-accelerator';
import { getMemoryInfo as fetchMemoryInfo } from '../memory-info';

// 최적화 상태
let isOptimizing = false;
let lastOptimizationTime = 0;
let optimizationCount = 0;

/**
 * 메모리 최적화 컨트롤러 초기화
 */
export function initializeOptimizationController(): void {
  // 필요한 초기화 작업 수행
  lastOptimizationTime = Date.now();
  optimizationCount = 0;
}

/**
 * 기본 최적화 수행
 * 경량 메모리 정리 및 가비지 컬렉션 제안
 */
export async function performBasicOptimization(): Promise<OptimizationResult> {
  if (isOptimizing) {
    console.warn('이미 최적화가 진행 중입니다.');
    return {
      success: false,
      optimization_level: OptimizationLevel.NONE,
      error: '이미 최적화가 진행 중입니다.',
      timestamp: Date.now()
    };
  }
  
  try {
    isOptimizing = true;
    const startTime = Date.now();
    
    // 1. 메모리 사용량 정보 수집
    const memoryBefore = await getMemoryInfo();
    
    // 2. 기본 최적화 작업 수행
    console.log('기본 메모리 최적화 수행 중...');
    
    // 2.1. 미사용 메모리 해제
    const clearedUnused = releaseUnusedMemory();
    
    // 2.2. GC 제안
    suggestGarbageCollection();
    
    // 3. 최적화 후 메모리 정보 수집
    await new Promise(resolve => setTimeout(resolve, 300));
    const memoryAfter = await getMemoryInfo();
    
    // 4. 해제된 메모리 계산
    const freedMemory = memoryBefore && memoryAfter 
      ? memoryBefore.heap_used - memoryAfter.heap_used
      : 0;
    
    const freedMB = freedMemory > 0 
      ? Math.round(freedMemory / (1024 * 1024) * 100) / 100
      : 0;
    
    // 5. 최적화 결과 반환
    const duration = Date.now() - startTime;
    lastOptimizationTime = Date.now();
    optimizationCount++;
    
    console.log(`기본 최적화 완료: ${freedMB}MB 해제됨, ${duration}ms 소요됨`);
    
    return {
      success: true,
      optimization_level: OptimizationLevel.NONE,
      memory_before: memoryBefore,
      memory_after: memoryAfter,
      freed_memory: freedMemory > 0 ? freedMemory : 0,
      freed_mb: freedMB,
      duration,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('기본 최적화 중 오류:', error);
    return {
      success: false,
      optimization_level: OptimizationLevel.NONE,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  } finally {
    isOptimizing = false;
  }
}

/**
 * 중간 수준 최적화 수행
 * 기본 최적화 + 캐시 정리
 */
export async function performMediumOptimization(): Promise<OptimizationResult> {
  if (isOptimizing) {
    console.warn('이미 최적화가 진행 중입니다.');
    return {
      success: false,
      optimization_level: OptimizationLevel.MEDIUM,
      error: '이미 최적화가 진행 중입니다.',
      timestamp: Date.now()
    };
  }
  
  try {
    isOptimizing = true;
    const startTime = Date.now();
    
    // 1. 메모리 사용량 정보 수집
    const memoryBefore = await getMemoryInfo();
    
    // 2. 중간 수준 최적화 작업 수행
    console.log('중간 수준 메모리 최적화 수행 중...');
    
    // 2.1. 기본 최적화 먼저 수행
    await performBasicOptimization();
    
    // 2.2. 캐시 정리
    clearCache();
    
    // 2.3. 동적 리소스 정리
    cleanupDynamicResources();
    
    // 2.4. GC 요청
    await requestGC(false);
    
    // 3. 최적화 후 메모리 정보 수집
    await new Promise(resolve => setTimeout(resolve, 500));
    const memoryAfter = await getMemoryInfo();
    
    // 4. 해제된 메모리 계산
    const freedMemory = memoryBefore && memoryAfter 
      ? memoryBefore.heap_used - memoryAfter.heap_used
      : 0;
    
    const freedMB = freedMemory > 0 
      ? Math.round(freedMemory / (1024 * 1024) * 100) / 100
      : 0;
    
    // 5. 최적화 결과 반환
    const duration = Date.now() - startTime;
    lastOptimizationTime = Date.now();
    optimizationCount++;
    
    console.log(`중간 수준 최적화 완료: ${freedMB}MB 해제됨, ${duration}ms 소요됨`);
    
    return {
      success: true,
      optimization_level: OptimizationLevel.MEDIUM,
      memory_before: memoryBefore,
      memory_after: memoryAfter,
      freed_memory: freedMemory > 0 ? freedMemory : 0,
      freed_mb: freedMB,
      duration,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('중간 수준 최적화 중 오류:', error);
    return {
      success: false,
      optimization_level: OptimizationLevel.MEDIUM,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  } finally {
    isOptimizing = false;
  }
}

/**
 * 높은 수준 최적화 수행
 * 중간 수준 최적화 + DOM 최적화
 */
export async function performHighOptimization(): Promise<OptimizationResult> {
  if (isOptimizing) {
    console.warn('이미 최적화가 진행 중입니다.');
    return {
      success: false,
      optimization_level: OptimizationLevel.HIGH,
      error: '이미 최적화가 진행 중입니다.',
      timestamp: Date.now()
    };
  }
  
  try {
    isOptimizing = true;
    const startTime = Date.now();
    
    // 1. 메모리 사용량 정보 수집
    const memoryBefore = await getMemoryInfo();
    
    // 2. 높은 수준 최적화 작업 수행
    console.log('높은 수준 메모리 최적화 수행 중...');
    
    // 2.1. 중간 수준 최적화 먼저 수행
    await performMediumOptimization();
    
    // 2.2. DOM 최적화
    cleanupDOM();
    
    // 2.3. DOM 참조 정리
    cleanupInactiveReferences();
    
    // 2.4. GC 요청 (약간의 공격성)
    await requestGC(true);
    
    // 3. 최적화 후 메모리 정보 수집
    await new Promise(resolve => setTimeout(resolve, 800));
    const memoryAfter = await getMemoryInfo();
    
    // 4. 해제된 메모리 계산
    const freedMemory = memoryBefore && memoryAfter 
      ? memoryBefore.heap_used - memoryAfter.heap_used
      : 0;
    
    const freedMB = freedMemory > 0 
      ? Math.round(freedMemory / (1024 * 1024) * 100) / 100
      : 0;
    
    // 5. 최적화 결과 반환
    const duration = Date.now() - startTime;
    lastOptimizationTime = Date.now();
    optimizationCount++;
    
    console.log(`높은 수준 최적화 완료: ${freedMB}MB 해제됨, ${duration}ms 소요됨`);
    
    return {
      success: true,
      optimization_level: OptimizationLevel.HIGH,
      memory_before: memoryBefore,
      memory_after: memoryAfter,
      freed_memory: freedMemory > 0 ? freedMemory : 0,
      freed_mb: freedMB,
      duration,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('높은 수준 최적화 중 오류:', error);
    return {
      success: false,
      optimization_level: OptimizationLevel.HIGH,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  } finally {
    isOptimizing = false;
  }
}

/**
 * 위험 수준 최적화 수행
 * 긴급 메모리 복구
 */
export async function performCriticalOptimization(): Promise<OptimizationResult> {
  if (isOptimizing) {
    console.warn('이미 최적화가 진행 중입니다.');
    return {
      success: false,
      optimization_level: OptimizationLevel.EXTREME,
      error: '이미 최적화가 진행 중입니다.',
      timestamp: Date.now()
    };
  }
  
  try {
    isOptimizing = true;
    const startTime = Date.now();
    
    // 1. 메모리 사용량 정보 수집
    const memoryBefore = await getMemoryInfo();
    
    // 2. 위험 수준 최적화 작업 수행
    console.warn('위험 수준 메모리 최적화 수행 중...');
    
    // 2.1. 긴급 메모리 복구 수행
    const emergencyResult = await emergencyMemoryRecovery();
    
    // 3. 최적화 후 메모리 정보 수집
    await new Promise(resolve => setTimeout(resolve, 1000));
    const memoryAfter = await getMemoryInfo();
    
    // 4. 해제된 메모리 계산
    const freedMemory = memoryBefore && memoryAfter 
      ? memoryBefore.heap_used - memoryAfter.heap_used
      : 0;
    
    const freedMB = freedMemory > 0 
      ? Math.round(freedMemory / (1024 * 1024) * 100) / 100
      : 0;
    
    // 5. 최적화 결과 반환
    const duration = Date.now() - startTime;
    lastOptimizationTime = Date.now();
    optimizationCount++;
    
    console.warn(`위험 수준 최적화 완료: ${freedMB}MB 해제됨, ${duration}ms 소요됨`);
    
    return {
      success: true,
      optimization_level: OptimizationLevel.EXTREME,
      memory_before: memoryBefore,
      memory_after: memoryAfter,
      freed_memory: freedMemory > 0 ? freedMemory : 0,
      freed_mb: freedMB,
      duration,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('위험 수준 최적화 중 오류:', error);
    return {
      success: false,
      optimization_level: OptimizationLevel.EXTREME,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  } finally {
    isOptimizing = false;
  }
}

/**
 * 최적화 레벨에 따른 메모리 최적화 수행
 * @param level 최적화 레벨
 */
export async function performOptimization(level: OptimizationLevel): Promise<OptimizationResult> {
  switch (level) {
    case OptimizationLevel.NONE:
      return performBasicOptimization();
    case OptimizationLevel.LOW:
      return performBasicOptimization();
    case OptimizationLevel.MEDIUM:
      return performMediumOptimization();
    case OptimizationLevel.HIGH:
      return performHighOptimization();
    case OptimizationLevel.EXTREME:
      return performCriticalOptimization();
    default:
      return performBasicOptimization();
  }
}

/**
 * 메모리 정보 가져오기
 */
async function getMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    return await fetchMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 실패:', error);
    return null;
  }
}

/**
 * 미사용 메모리 해제 함수
 */
function releaseUnusedMemory(): boolean {
  try {
    // 해제할 수 있는 미사용 메모리 처리
    // 1. 이미지 캐시 비우기
    cleanImageCache();
    
    // 2. 객체 참조 정리
    clearObjectReferences();
    
    return true;
  } catch (error) {
    console.error('미사용 메모리 해제 중 오류:', error);
    return false;
  }
}

/**
 * 이미지 캐시 정리
 */
function cleanImageCache(): void {
  if (window.__imageResizeCache) {
    window.__imageResizeCache = {};
  }
}

/**
 * 객체 참조 정리
 */
function clearObjectReferences(): void {
  if (window.__objectUrls) {
    // URL.revokeObjectURL 호출 후 Map 비우기
    try {
      const urls = window.__objectUrls;
      if (urls instanceof Map) {
        urls.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // 무시
          }
        });
        urls.clear();
      }
    } catch (e) {
      console.warn('Object URL 참조 정리 중 오류:', e);
    }
  }
}

/**
 * 비활성 참조 정리
 */
function cleanupInactiveReferences(): void {
  try {
    // 메모리 누수 가능성이 있는 DOM 참조 정리
    if (window.__widgetCache) {
      const cache = window.__widgetCache;
      if (cache instanceof Map) {
        // 일정 시간 이후 참조 제거
        const now = Date.now();
        const CACHE_EXPIRY = 10 * 60 * 1000; // 10분
        
        cache.forEach((value, key) => {
          if (value && typeof value === 'object' && value.lastAccess && 
              (now - value.lastAccess > CACHE_EXPIRY)) {
            cache.delete(key);
          }
        });
      }
    }
  } catch (e) {
    console.warn('비활성 참조 정리 중 오류:', e);
  }
}

/**
 * 최적화 상태 가져오기
 */
export function getOptimizationStatus() {
  return {
    isOptimizing,
    lastOptimizationTime,
    optimizationCount
  };
}

/**
 * 타입 호환성 문제 수정 - 타입 변환/변경
 */
const memoryInfoFromNative = (nativeInfo: any): MemoryInfo => {
  if (!nativeInfo) return null;
  
  return {
    heapUsed: nativeInfo.heap_used,
    heapTotal: nativeInfo.heap_total,
    heapUsedMB: nativeInfo.heap_used_mb,
    percentUsed: nativeInfo.percent_used,
    // ...기타 필요한 속성들
  } as MemoryInfo;
};
