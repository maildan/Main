/**
 * 메모리 최적화 유틸리티 통합 모듈
 * 
 * 이 파일은 네이티브 모듈 기능을 통합하여
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

// 네이티브 모듈 브릿지 - determineOptimizationLevel 명시적 재내보내기
import { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  determineOptimizationLevel as nativeDetermineOptimizationLevel,
  setupPeriodicMemoryOptimization
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
  if (!window.__memoryOptimizer) {
    window.__memoryOptimizer = {};
  }
  
  // 모듈들 비동기 로드 및 기능 통합
  Promise.all([
    import('./memory-info'),
    import('./optimizer'),
    import('./gc-utils'),
    import('./image-optimizer'),
    import('../native-memory-bridge')
  ]).then(([memoryInfo, optimizer, gcUtils, imageOptimizer, nativeBridge]) => {
    const memOptimizer = window.__memoryOptimizer;
    
    // 메모리 정보 함수
    memOptimizer.getMemoryInfo = memoryInfo.getMemoryInfo;
    memOptimizer.getMemoryUsagePercentage = memoryInfo.getMemoryUsagePercentage;
    
    // 최적화 함수 - 네이티브 함수로 대체
    memOptimizer.optimizeMemory = async (aggressive: boolean) => {
      const level = aggressive ? 3 : 2; // 적극적이면 HIGH, 아니면 MEDIUM
      const result = await nativeBridge.requestNativeMemoryOptimization(level, aggressive);
      return result;
    };
    
    // GC 함수
    memOptimizer.suggestGarbageCollection = gcUtils.suggestGarbageCollection;
    memOptimizer.requestGC = async (emergency: boolean) => {
      const result = await nativeBridge.requestNativeGarbageCollection();
      return result;
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
  const {
    memoryOptimize = true,
    gpuAccelerate = false,
    cleanupDOM = true,
    cleanupStorage = true,
    aggressive = false
  } = options;
  
  try {
    if (memoryOptimize) {
      // 네이티브 메모리 최적화 수행
      const level = aggressive ? 3 : 2; // HIGH or MEDIUM
      await requestNativeMemoryOptimization(level, aggressive);
    }
    
    // 다른 최적화 작업도 필요하다면 추가할 수 있음
    
    return true;
  } catch (error) {
    console.error('통합 최적화 중 오류:', error);
    return false;
  }
}