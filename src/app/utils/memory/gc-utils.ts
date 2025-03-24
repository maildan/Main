/**
 * 가비지 컬렉션 유틸리티 인덱스 파일
 * 모든 모듈을 내보냅니다.
 */

// 메모리 풀 관련 기능
export { 
  acquireFromPool, 
  releaseToPool, 
  releaseAllPooledObjects,
  memoryPools
} from './pool/memory-pool';

// 가비지 컬렉션 기능
export {
  determineOptimizationLevel,
  ensureMemoryInfo,
  induceGarbageCollection
} from './gc/garbage-collector';

/**
 * 가비지 컬렉션 관련 유틸리티
 * GC 관련 함수들을 제공합니다.
 */
import { GCResult, MemoryInfo } from './types'; 
import { getMemoryUsage } from './memory-info';

/**
 * 메모리 해제를 권장하는 함수
 * 실제 GC를 강제하지는 않지만, 힌트를 제공함
 */
export function suggestGarbageCollection(): void {
  try {
    // 대형 배열 생성 및 삭제로 GC 유도
    if (!window.gc) {
      const arr = [];
      for (let i = 0; i < 10; i++) {
        arr.push(new ArrayBuffer(1024 * 1024)); // 각 1MB
      }
      // 배열 참조 해제
      arr.length = 0;
    } else {
      // window.gc가 있는 경우 직접 호출
      window.gc();
    }
    
    // Electron IPC를 통한 GC 요청
    if (window.electronAPI) {
      window.electronAPI.requestGC && window.electronAPI.requestGC();
    }
  } catch (error) {
    console.warn('GC 제안 중 오류:', error);
  }
}

/**
 * 수동으로 가비지 컬렉션을 요청합니다.
 * @param {boolean} emergency - 긴급 모드 여부
 * @returns Promise<GCResult>
 */
export async function requestGC(emergency = false): Promise<GCResult> {
  try {
    // 메모리 정보 수집 (GC 전)
    const memoryBefore = await getMemoryUsage();
    
    // Electron API를 통한 GC 요청
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      await window.electronAPI.requestGC();
    }
    
    // 브라우저 창 객체를 통한 메모리 힌트
    if (window.gc) {
      window.gc();
    }
    
    // 약간의 지연 후 메모리 정보 다시 수집 (GC 이후)
    await new Promise(resolve => setTimeout(resolve, 100));
    const memoryAfter = await getMemoryUsage();
    
    const freedMemory = memoryBefore.heapUsed - memoryAfter.heapUsed;
    const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
    
    return {
      success: true,
      memoryBefore,
      memoryAfter,
      freedMemory,
      freedMB,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('GC 요청 오류:', error);
    return {
      success: false,
      timestamp: Date.now(),
      error: String(error)
    };
  }
}

// 최적화 관련 기능 - 새로운 모듈 구조 사용
export {
  performOptimizationByLevel,
  clearImageCaches,
  cleanupDOMReferences,
  clearStorageCaches,
  unloadNonVisibleResources,
  optimizeEventListeners,
  unloadDynamicModules,
  emergencyMemoryRecovery
} from './gc/optimization-controller';

// 상수
export { MEMORY_THRESHOLDS } from './constants/memory-thresholds';

// 창에 전역 메모리 최적화 도구 노출 (디버깅용)
if (typeof window !== 'undefined') {
  import('./pool/memory-pool').then(memoryPool => {
    import('./gc/garbage-collector').then(gc => {
      import('./gc/optimization-controller').then(optimization => {
        // 전역 객체에 함수 추가
        (window as any).__memoryOptimizer = {
          ...(window as any).__memoryOptimizer || {},
          // 가비지 컬렉션 기능
          requestGC: requestGC, // 로컬 함수 참조로 변경
          suggestGarbageCollection: suggestGarbageCollection, // 로컬 함수 참조로 변경
          determineOptimizationLevel: gc.determineOptimizationLevel,
          // 메모리 풀 기능
          acquireFromPool: memoryPool.acquireFromPool,
          releaseToPool: memoryPool.releaseToPool,
          // 최적화 기능
          performOptimizationByLevel: optimization.performOptimizationByLevel,
          clearImageCaches: optimization.clearImageCaches,
          cleanupDOMReferences: optimization.cleanupDOMReferences,
          clearStorageCaches: optimization.clearStorageCaches,
          emergencyMemoryRecovery: optimization.emergencyMemoryRecovery
        };
      });
    });
  });
}
