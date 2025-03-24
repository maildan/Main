/**
 * 메모리 최적화 컨트롤러 - Rust 네이티브 모듈 통합
 */
import { 
  requestNativeMemoryOptimization, 
  determineOptimizationLevel 
} from '@/app/utils/native-memory-bridge';
import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel } from '@/app/utils/enum-converters';
import { reportMemoryUsage } from './optimization-levels';
import { getMemoryInfo } from '../memory-info';
import { toggleGpuAcceleration, isGpuComputationActive } from '@/app/utils/gpu-acceleration';
import { normalizeMemoryInfo } from '../format-utils';

// 글로벌 선언 추가 - 전역 객체에 접근하는 오류 해결을 위한 인터페이스 선언
interface WindowWithCache extends Window {
  __cachedData?: Record<string, any>;
  __bufferCache?: Record<string, any>;
  __animationFrameIds?: number[];
  __intervalIds?: number[];
  __timeoutIds?: number[];
  __appRecovery?: any;
  __loadedModules?: Map<string, any>;
  __memoryCache?: Map<string, any>;
  __taskScheduler?: any;
  __store?: any;
  __errorBoundaries?: any[];
  __apiClient?: any;
}

// 메모리 최적화 설정
const MEMORY_THRESHOLDS = {
  HIGH: 85, // 85% 이상 사용 시 높은 수준 최적화
  CRITICAL: 92, // 92% 이상 사용 시 긴급 최적화
  GPU_DISABLE: 90, // 90% 이상 사용 시 GPU 비활성화
  RESTORE_GPU: 75 // 75% 미만으로 내려가면 GPU 재활성화
};

// 최적화 시도 상태 추적
let lastOptimizationAttempt = 0;
let consecutiveFailures = 0;
let gpuDisabledDueToMemory = false;

/**
 * 최적화 수준에 따른 메모리 최적화 작업 수행
 * 이제 모든 최적화 작업은 Rust 네이티브 모듈을 통해 처리되며,
 * 메모리 임계치 초과 시 GPU에서 CPU로 전환합니다.
 * 
 * @param level 최적화 수준 (0-4)
 * @param emergency 긴급 상황 여부
 * @returns Promise<void>
 */
export async function performOptimizationByLevel(level: number, emergency: boolean = false): Promise<void> {
  try {
    // 현재 시간
    const now = Date.now();
    
    // 연속 시도 제한 (초당 최대 1회)
    if (now - lastOptimizationAttempt < 1000 && !emergency) {
      console.log('최적화 요청이 너무 빈번합니다. 이전 요청 무시');
      return;
    }
    
    lastOptimizationAttempt = now;
    
    // 현재 메모리 상태 확인
    const memoryInfo = await getMemoryInfo();
    if (!memoryInfo) {
      console.warn('메모리 정보를 얻을 수 없습니다');
      return;
    }
    
    const memoryUsagePercent = memoryInfo.percentUsed || 0;
    
    console.log(`현재 메모리 사용률: ${memoryUsagePercent.toFixed(1)}%`);
    
    // 메모리 사용량에 따른 긴급 상황 자동 감지
    if (memoryUsagePercent > MEMORY_THRESHOLDS.CRITICAL) {
      console.warn(`메모리 사용량 임계치 초과: ${memoryUsagePercent.toFixed(1)}% > ${MEMORY_THRESHOLDS.CRITICAL}%`);
      emergency = true;
      level = 4; // 최고 수준 최적화 강제
    } else if (memoryUsagePercent > MEMORY_THRESHOLDS.HIGH) {
      console.warn(`메모리 사용량 높음: ${memoryUsagePercent.toFixed(1)}% > ${MEMORY_THRESHOLDS.HIGH}%`);
      level = Math.max(level, 3); // 최소 높은 수준 최적화 보장
    }
    
    // GPU 가속화 관리 - 메모리 사용량이 높을 때 GPU 비활성화
    await manageGpuAcceleration(memoryUsagePercent);
    
    // 최적화 수준 매핑
    const appLevel = emergency ? AppOptimizationLevel.EXTREME :
                   level >= 3 ? AppOptimizationLevel.HIGH :
                   level >= 2 ? AppOptimizationLevel.MEDIUM :
                   level >= 1 ? AppOptimizationLevel.LOW :
                   AppOptimizationLevel.NONE;
    
    // 네이티브 최적화 모듈 호출 (최대 3번 재시도)
    const nativeLevel = toNativeOptimizationLevel(appLevel);
    let result = null;
    let retries = 0;
    
    while (retries < 3 && result === null) {
      try {
        console.log(`Rust 네이티브 메모리 최적화 실행 (레벨: ${nativeLevel}, 긴급: ${emergency})`);
        result = await requestNativeMemoryOptimization(nativeLevel, emergency);
        
        if (result) {
          console.log(`메모리 최적화 성공: ${result.freed_mb?.toFixed(2) || 0}MB 해제됨`);
          consecutiveFailures = 0;
        } else {
          throw new Error("네이티브 최적화 실패: 결과가 null");
        }
      } catch (error) {
        retries++;
        console.error(`네이티브 최적화 시도 ${retries}/3 실패:`, error);
        
        if (retries === 3) {
          consecutiveFailures++;
          console.warn(`연속 ${consecutiveFailures}회 최적화 실패. 폴백 없음 - 네이티브 모듈만 사용`);
        } else {
          // 재시도 전 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // 메모리 사용 보고
    reportMemoryUsage(level);
    
    // 긴급 상황이 해결되었는지 확인
    if (emergency) {
      const afterMemoryInfo = await getMemoryInfo();
      if (!afterMemoryInfo) return;
      
      const afterUsagePercent = afterMemoryInfo.percentUsed || 0;
      
      if (afterUsagePercent > MEMORY_THRESHOLDS.CRITICAL) {
        console.error(`긴급 메모리 상황이 지속됨: ${afterUsagePercent.toFixed(1)}%. 추가 조치 필요`);
        // 추가 비상 조치 수행
        await performEmergencyMeasures();
      } else {
        console.log(`메모리 상황 개선됨: ${afterUsagePercent.toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('메모리 최적화 중 예기치 않은 오류:', error);
    consecutiveFailures++;
    
    // 심각한 상황에서는 전체 애플리케이션 재초기화 고려
    if (consecutiveFailures > 5) {
      console.error('연속된 최적화 실패로 인한 심각한 메모리 상황. 앱 재로드를 권장합니다.');
      
      if (typeof window !== 'undefined') {
        const shouldReload = window.confirm('메모리 최적화에 반복적으로 실패했습니다. 페이지를 새로고침하시겠습니까?');
        if (shouldReload) {
          window.location.reload();
        }
      }
    }
  }
}

/**
 * GPU 가속화 상태 관리 
 * 메모리 사용량에 따라 GPU 활성화/비활성화
 */
async function manageGpuAcceleration(memoryUsagePercent: number): Promise<void> {
  try {
    const isGpuActive = await isGpuComputationActive();
    
    // 메모리 사용량이 높을 때 GPU 비활성화
    if (memoryUsagePercent > MEMORY_THRESHOLDS.GPU_DISABLE && isGpuActive && !gpuDisabledDueToMemory) {
      console.warn(`메모리 사용량이 높아 GPU 가속화 비활성화: ${memoryUsagePercent.toFixed(1)}%`);
      const result = await toggleGpuAcceleration(false);
      gpuDisabledDueToMemory = result;
    } 
    // 메모리 상황이 개선되면 GPU 재활성화
    else if (memoryUsagePercent < MEMORY_THRESHOLDS.RESTORE_GPU && gpuDisabledDueToMemory) {
      console.log(`메모리 상황 개선되어 GPU 가속화 재활성화: ${memoryUsagePercent.toFixed(1)}%`);
      const result = await toggleGpuAcceleration(true);
      if (result) {
        gpuDisabledDueToMemory = false;
      }
    }
  } catch (error) {
    console.error('GPU 가속화 상태 관리 중 오류:', error);
  }
}

/**
 * 긴급 상황에 대한 추가 조치
 */
async function performEmergencyMeasures(): Promise<void> {
  console.warn('긴급 메모리 복구 조치 수행 중...');
  
  try {
    // 1. GPU 비활성화 (이미 관리 로직에 있지만 긴급 상황에서 강제 적용)
    if (await isGpuComputationActive()) {
      await toggleGpuAcceleration(false);
      gpuDisabledDueToMemory = true;
    }
    
    // 2. 강제 가비지 컬렉션 요청
    if (window.gc) {
      window.gc();
    }
    
    // 3. 최고 수준 최적화 재시도
    const result = await requestNativeMemoryOptimization(
      NativeOptimizationLevel.Critical, 
      true
    );
    
    console.log('긴급 메모리 복구 조치 결과:', result ? '성공' : '실패');
  } catch (error) {
    console.error('긴급 메모리 복구 조치 중 오류:', error);
  }
}

/**
 * 앱 내부 자원 정리
 */
function cleanupAppResources(): void {
  try {
    console.log('앱 내부 자원 정리 중...');
    
    // DOM 참조 정리
    if (typeof document !== 'undefined') {
      // 나중에 정리 필요한 참조 목록
      const cleanupSelectors = [
        '.cleanup-target',
        '[data-memory-cleanup="true"]',
        '.cached-content'
      ];
      
      cleanupSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el instanceof HTMLElement) {
            el.innerHTML = '';
          }
        });
      });
    }
    
    // 캐시 정리 (네이티브 모듈이 제공하는 기능에 의존)
  } catch (error) {
    console.error('앱 자원 정리 중 오류:', error);
  }
}

/**
 * 메모리 최적화 수준 결정
 * 현재 메모리 사용량에 기반하여 최적화 수준 결정
 */
export async function determineMemoryOptimizationLevel(): Promise<number> {
  try {
    // 현재 메모리 정보 가져오기 
    const memoryInfo = await getMemoryInfo();
    
    // 네이티브 모듈 호출 (memoryInfo가 null일 경우 기본값 사용)
    if (memoryInfo) {
      // 적절한 타입으로 변환 후 전달
      try {
        const { normalizeMemoryInfo } = await import('../format-utils');
        const convertedMemoryInfo = normalizeMemoryInfo(memoryInfo);
        const nativeLevel = await determineOptimizationLevel(convertedMemoryInfo);
        if (typeof nativeLevel === 'number') {
          return nativeLevel;
        }
      } catch (error) {
        console.error('네이티브 최적화 레벨 결정 오류:', error);
      }
    }
    
    // 폴백: 자체 최적화 수준 결정
    const usagePercent = memoryInfo?.percentUsed || 0;
    
    if (usagePercent > MEMORY_THRESHOLDS.CRITICAL) return 4;
    if (usagePercent > MEMORY_THRESHOLDS.HIGH) return 3;
    if (usagePercent > 70) return 2;
    if (usagePercent > 50) return 1;
    return 0;
  } catch (error) {
    console.error('최적화 수준 결정 중 오류:', error);
    return 2; // 기본값으로 중간 수준 반환
  }
}

// 모든 export 함수를 한 곳에서 관리 (기존 코드와 동일)
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
    // 기본 DOM 정리 함수 사용
    cleanupDOM();
    
    // 사용하지 않는 이미지 언로드
    unloadUnusedImages();
    
    // 추가적인 DOM 참조 정리 수행
    internalCleanupDOMReferences();
  } catch (error) {
    console.warn('DOM 참조 정리 중 오류:', error);
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
