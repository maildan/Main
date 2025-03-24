/**
 * 메모리 최적화 컨트롤러
 * 최적화 수준에 따른 최적화 작업 조정
 */
import { MemoryInfo } from '../types';

// 각 최적화 모듈 가져오기
import {
  lightOptimization,
  mediumOptimization,
  highOptimization,
  aggressiveOptimization,
  reportMemoryUsage
} from './optimization-levels';

// DOM 최적화 모듈에서 필요한 함수들을 가져옵니다
import {
  cleanupDOM,
  unloadUnusedImages
} from '../dom-optimizer';

// 이미지 최적화 모듈에서 필요한 함수들을 가져옵니다
import {
  clearImageCache,
  optimizeImageResources
} from '../image-optimizer';

// 스토리지 관련 함수들 가져오기
import {
  cleanLocalStorage,
  clearLargeObjectsAndCaches
} from '../storage-cleaner';

// 캐시 관련 최적화 함수 가져오기
import {
  clearStorageCaches,
  clearAllCache,
  releaseAllCaches
} from './cache-optimizer';

// 리소스 관련 최적화 함수 가져오기
import {
  unloadNonVisibleResources,
  releaseUnusedResources,
  freeUnusedMemory,
  optimizeDOM
} from './resource-optimizer';

// 이벤트 관련 최적화 함수 가져오기
import {
  optimizeEventListeners,
  unloadDynamicModules
} from './event-optimizer';

// 긴급 복구 모듈 가져오기
import { emergencyMemoryRecovery } from './emergency-recovery';

// 로컬에서만 사용하는 함수 - 외부 모듈에서 사용할 수 있는 함수들을 만듭니다
/**
 * DOM 참조 정리 함수
 * 외부에서 사용할 수 있는 통합 함수
 */
export function cleanupDOMReferences(): void {
  try {
    cleanupDOM();
    unloadUnusedImages();
  } catch (error) {
    console.warn('DOM 참조 정리 중 오류:', error);
  }
}

/**
 * 이미지 캐시 정리 함수
 * 외부에서 사용할 수 있는 통합 함수
 */
export function clearImageCaches(): void {
  try {
    clearImageCache();
    optimizeImageResources();
  } catch (error) {
    console.warn('이미지 캐시 정리 중 오류:', error);
  }
}

/**
 * 최적화 수준에 따른 메모리 최적화 작업 수행
 * @param level 최적화 수준 (0-3: 정상, 주의, 경고, 위험)
 * @param emergency 긴급 상황 여부
 * @returns Promise<void>
 */
export async function performOptimizationByLevel(level: number, emergency: boolean = false): Promise<void> {
  try {
    switch(level) {
      case 0:
        await lightOptimization();
        break;
      case 1:
        await mediumOptimization();
        break;
      case 2:
        await highOptimization();
        break;
      case 3:
        await aggressiveOptimization();
        break;
      default:
        await lightOptimization();
    }

    if (emergency) {
      await emergencyMemoryRecovery();
    }

    // 메모리 사용량 보고
    reportMemoryUsage(level);
  } catch (error) {
    console.error('최적화 수행 중 오류:', error);
  }
}

// 모든 export 함수를 한 곳에서 관리
export {
  cleanupDOM,
  unloadUnusedImages,
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
};
