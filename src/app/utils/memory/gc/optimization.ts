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
  clearStorageCaches
} from './optimization-controller';

// 내보내지지 않은 함수들은 resource-optimizer에서 가져옵니다
export { 
  unloadNonVisibleResources,
  optimizeDOM as optimizeEventListeners,
  cleanupResources as cleanupDOMReferences
} from './resource-optimizer';

// 비상 복구 함수는 다른 모듈에서 가져옵니다
export { emergencyRecovery as emergencyMemoryRecovery } from '../emergency-recovery';

// 동적 모듈 언로드 함수 구현
export function unloadDynamicModules(): boolean {
  // 간단한 구현
  try {
    if (typeof window !== 'undefined' && window._dynamicModules) {
      // 타입 단언 사용
      const dynamicModules = window._dynamicModules as Map<string, unknown>;
      dynamicModules.clear();
      return true;
    }
    return false;
  } catch (error) {
    console.error('동적 모듈 언로드 오류:', error);
    return false;
  }
}
