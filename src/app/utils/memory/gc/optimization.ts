/**
 * 메모리 최적화 기능 모듈 (호환성 모듈)
 * 
 * 이 파일은 이전 API와의 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 직접 하위 모듈을 사용하세요.
 */

// import 구문 수정 (optimization-controller에서 개별 함수 가져오기)
import {
  performOptimizationByLevel,
  clearImageCaches,
} from './optimization-controller';

// DOM 정리 함수 가져오기
import { cleanupDom as cleanupDOMReferences } from '../dom-cleanup';

// 스토리지 클리너에서 가져오기
import { clearStorageCaches } from '../storage-cleaner';

// 리소스 최적화 유틸리티 함수 가져오기
import { unloadNonVisibleResources } from './resource-optimizer';

// 이벤트 최적화 함수 가져오기 - 경로 수정
// './event-optimizer' 대신 올바른 경로 '../event-optimizer' 사용
import { optimizeEventListeners } from '../event-optimizer';

// 모듈 관리 유틸리티에서 가져오기
import { unloadDynamicModules } from '@/app/utils/module-utils';

// 긴급 복구 유틸리티에서 가져오기
import { emergencyRecovery as emergencyMemoryRecovery } from '../emergency-recovery';

// 재내보내기
export {
  performOptimizationByLevel,
  clearImageCaches,
  cleanupDOMReferences,
  clearStorageCaches,
  unloadNonVisibleResources,
  optimizeEventListeners,
  unloadDynamicModules,
  emergencyMemoryRecovery
};
