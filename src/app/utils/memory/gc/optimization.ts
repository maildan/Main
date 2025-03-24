/**
 * 메모리 최적화 기능 모듈 (호환성 모듈)
 * 
 * 이 파일은 이전 API와의 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 직접 하위 모듈을 사용하세요.
 */

// 기존 API를 모두 다시 내보내어 호환성 유지
export {
  performOptimizationByLevel,
  clearImageCaches,
  cleanupDOMReferences,
  clearStorageCaches,
  clearAllCache,
  releaseAllCaches,
  unloadNonVisibleResources,
  releaseUnusedResources,
  freeUnusedMemory,
  optimizeDOM,
  optimizeEventListeners,
  unloadDynamicModules,
  emergencyMemoryRecovery
} from './optimization-controller';
