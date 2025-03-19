// 타입 내보내기
export * from './types';

// 메모리 정보 함수 내보내기
export {
  estimateTotalMemory,
  getMemoryInfo,
  getMemoryUsagePercentage,
  getMemoryUsage
} from './memory-info';

// DOM 최적화 함수 내보내기
export {
  isElementInViewport,
  cleanupDOM,
  unloadUnusedImages,
  cleanupEventListeners
} from './dom-optimizer';

// 스토리지 클리너 함수 내보내기
export {
  weakCache,
  hasWeakCache,
  cleanLocalStorage,
  clearLargeObjectsAndCaches
} from './storage-cleaner';

// GC 유틸리티 함수 내보내기
export {
  suggestGarbageCollection,
  requestGC
} from './gc-utils';

// 이미지 최적화 함수 내보내기
export {
  clearImageCache,
  optimizeImageResources
} from './image-optimizer';

// React 훅 내보내기
export {
  useMemoryOptimizer,
  optimizeMemory
} from './hooks';

// 각 모듈에서 필요한 함수들을 직접 가져옵니다
import { getMemoryInfo, getMemoryUsagePercentage } from './memory-info';
import { suggestGarbageCollection } from './gc-utils';
import { optimizeImageResources } from './image-optimizer';
import { optimizeMemory } from './hooks';

// 전역 메모리 최적화 유틸리티 노출
if (typeof window !== 'undefined') {
  // 메서드들을 전역 객체에 노출
  (window as any).__memoryOptimizer = {
    getMemoryInfo,
    optimizeMemory,
    suggestGarbageCollection,
    getMemoryUsagePercentage,
    optimizeImageResources
  };
}