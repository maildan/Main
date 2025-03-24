/**
 * 메모리 및 GPU 최적화 유틸리티 모듈
 * 실무 최적화 전략을 따르는 통합 API 제공
 */

// 메모리 정보 및 내부 타입
export * from './types';
export * from './memory-info';

// 가비지 컬렉션 및 메모리 최적화
export * from './gc-utils';
export { internalOptimizeMemory, optimizeMemory } from './optimizer';

// DOM 및 스토리지 최적화
export * from './dom-optimizer';

// 스토리지 관련 - 명시적으로 내보내기
export { 
  cleanLocalStorage, 
  clearLargeObjectsAndCaches,
  cleanSessionStorage 
} from './storage-cleaner';

// 캐시 유틸리티 - 명시적으로 내보내기
export { weakCache, hasWeakCache, reusableObject } from './cache-utils';

// 이미지 최적화
export * from './image-optimizer';

// React 훅
export * from './hooks';

// GPU 가속화
export * from './gpu-accelerator';

// 전역 메모리 최적화 API 설정
if (typeof window !== 'undefined') {
  import('./memory-info').then(memoryInfo => {
    import('./optimizer').then(optimizer => {
      import('./gc-utils').then(gcUtils => {
        import('./image-optimizer').then(imageOptimizer => {
          // 전역 객체에 함수 추가
          (window as any).__memoryOptimizer = {
            ...(window as any).__memoryOptimizer || {},
            // 메모리 정보 함수
            getMemoryInfo: memoryInfo.getMemoryInfo,
            getMemoryUsagePercentage: memoryInfo.getMemoryUsagePercentage,
            
            // 최적화 함수
            optimizeMemory: optimizer.internalOptimizeMemory,
            
            // GC 함수
            suggestGarbageCollection: gcUtils.suggestGarbageCollection,
            requestGC: gcUtils.requestGC,
            
            // 이미지 최적화
            optimizeImageResources: imageOptimizer.optimizeImageResources
          };
        });
      });
    });
  });
}

/**
 * 성능 및 메모리 최적화 세트 적용 (간편 API)
 * 단일 호출로 여러 최적화 기법 적용
 */
export async function applyPerformanceOptimizations(
  options: {
    memoryOptimize?: boolean;
    gpuAccelerate?: boolean;
    cleanupDOM?: boolean;
    cleanupStorage?: boolean;
    aggressive?: boolean;
  } = {}
): Promise<boolean> {
  try {
    const {
      memoryOptimize = true,
      gpuAccelerate = true,
      cleanupDOM = true,
      cleanupStorage = true,
      aggressive = false
    } = options;
    
    // 메모리 최적화
    if (memoryOptimize) {
      const { optimizeMemory } = await import('./optimizer');
      await optimizeMemory(aggressive);
    }
    
    // DOM 정리
    if (cleanupDOM) {
      const { cleanupDOM, unloadUnusedImages } = await import('./dom-optimizer');
      cleanupDOM();
      unloadUnusedImages();
    }
    
    // 스토리지 정리
    if (cleanupStorage) {
      const { cleanLocalStorage, clearLargeObjectsAndCaches } = await import('./storage-cleaner');
      cleanLocalStorage();
      clearLargeObjectsAndCaches();
    }
    
    // GPU 가속화
    if (gpuAccelerate) {
      const { enableGPUAcceleration } = await import('./gpu-accelerator');
      enableGPUAcceleration();
    }
    
    // GC 권장
    const { suggestGarbageCollection } = await import('./gc-utils');
    suggestGarbageCollection();
    
    return true;
  } catch (error) {
    console.error('성능 최적화 적용 중 오류:', error);
    return false;
  }
}