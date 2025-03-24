/**
 * 메모리 최적화 컨트롤러 - Rust 네이티브 모듈 통합
 */
import { 
  requestNativeMemoryOptimization, 
  determineOptimizationLevel 
} from '@/app/utils/native-memory-bridge';
import { OptimizationLevel } from '@/types/native-module';
import { reportMemoryUsage } from './optimization-levels';

/**
 * 최적화 수준에 따른 메모리 최적화 작업 수행
 * 이제 모든 최적화 작업은 Rust 네이티브 모듈을 통해 처리됩니다.
 * 
 * @param level 최적화 수준 (0-3: 정상, 주의, 경고, 위험)
 * @param emergency 긴급 상황 여부
 * @returns Promise<void>
 */
export async function performOptimizationByLevel(level: number, emergency: boolean = false): Promise<void> {
  try {
    // 최적화 수준 매핑
    const nativeOptLevel = emergency ? OptimizationLevel.Critical :
                         level >= 3 ? OptimizationLevel.High :
                         level >= 2 ? OptimizationLevel.Medium :
                         level >= 1 ? OptimizationLevel.Low :
                         OptimizationLevel.Normal;
    
    // Rust 네이티브 모듈을 통한 최적화 수행
    const result = await requestNativeMemoryOptimization(nativeOptLevel, emergency);
    
    // 로깅 용도로만 사용
    reportMemoryUsage(level);
    
    // 최적화 결과 로깅
    if (result) {
      const freedMB = result.freed_mb || 0;
      console.log(`[메모리 최적화] 레벨 ${level} 완료: ${freedMB}MB 메모리 해제됨`);
    }
  } catch (error) {
    console.error('메모리 최적화 중 오류:', error);
  }
}

// 모든 export 함수를 한 곳에서 관리 (기존 코드와 동일)
import { MemoryInfo } from '../types';

// 각 최적화 모듈 가져오기
import {
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
