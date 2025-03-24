/**
 * 메모리 최적화 유틸리티 통합 모듈
 * 
 * 이 파일은 기존 메모리 최적화 기능과 새로운 네이티브 모듈 기능을 통합하여
 * 애플리케이션에 단일 인터페이스를 제공합니다.
 */

// 기본 메모리 최적화 기능
export * from './memory-info';
export * from './optimizer';
export * from './gc-utils';

// 이미지 최적화
export * from './image-optimizer';

// React 훅
export * from './hooks';

// GPU 가속화
export * from './gpu-accelerator';

// 네이티브 모듈 브릿지 (새 기능) - determineOptimizationLevel 명시적 재내보내기
import { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  setupPeriodicMemoryOptimization,
  determineOptimizationLevel as nativeDetermineOptimizationLevel 
} from '../native-memory-bridge';
export { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  setupPeriodicMemoryOptimization,
  nativeDetermineOptimizationLevel 
};

// 전역 메모리 최적화 API 설정 - 중복 등록 방지 및 통합
if (typeof window !== 'undefined') {
  // 이미 초기화되었는지 확인
  if (!(window as any).__memoryOptimizer) {
    (window as any).__memoryOptimizer = {};
  }
  
  // 모듈들 비동기 로드 및 기능 통합
  Promise.all([
    import('./memory-info'),
    import('./optimizer'),
    import('./gc-utils'),
    import('./image-optimizer'),
    import('../native-memory-bridge')
  ]).then(([memoryInfo, optimizer, gcUtils, imageOptimizer, nativeBridge]) => {
    const memOptimizer = (window as any).__memoryOptimizer;
    
    // 메모리 정보 함수
    memOptimizer.getMemoryInfo = memoryInfo.getMemoryInfo;
    memOptimizer.getMemoryUsagePercentage = memoryInfo.getMemoryUsagePercentage;
    
    // 최적화 함수 - 기존 함수를 새 네이티브 함수로 점진적 대체
    memOptimizer.optimizeMemory = async (aggressive: boolean) => {
      // 네이티브 모듈 최적화 시도
      try {
        const level = aggressive ? 3 : 2; // 적극적이면 HIGH, 아니면 MEDIUM
        const result = await nativeBridge.requestNativeMemoryOptimization(level, aggressive);
        if (result) return result;
      } catch (e) {
        console.warn('네이티브 최적화 실패, 폴백 사용:', e);
      }
      
      // 폴백: 기존 JS 기반 최적화
      return optimizer.internalOptimizeMemory(aggressive);
    };
    
    // GC 함수
    memOptimizer.suggestGarbageCollection = gcUtils.suggestGarbageCollection;
    memOptimizer.requestGC = async (emergency: boolean) => {
      // 네이티브 GC 시도 후 폴백
      try {
        const result = await nativeBridge.requestNativeGarbageCollection();
        if (result) return result;
      } catch (e) {
        console.warn('네이티브 GC 실패, 폴백 사용:', e);
      }
      
      return gcUtils.requestGC(emergency);
    };
    
    // 이미지 최적화
    memOptimizer.optimizeImageResources = imageOptimizer.optimizeImageResources;
    
    // 네이티브 모듈 특정 기능
    memOptimizer.determineOptimizationLevel = nativeBridge.determineOptimizationLevel;
    memOptimizer.setupPeriodicOptimization = nativeBridge.setupPeriodicMemoryOptimization;
    
    console.log('메모리 최적화 통합 유틸리티 초기화 완료');
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