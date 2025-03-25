/**
 * 메모리 최적화 유틸리티 통합 모듈
 * 
 * 이 모듈은 네이티브 메모리 최적화 모듈을 호출하는 브릿지 역할을 합니다.
 * 모든 메모리 최적화 작업은 Rust 네이티브 모듈을 통해 처리됩니다.
 */

import { MemoryInfo, GCResult, OptimizationLevel } from '@/types';

// 네이티브 모듈 브릿지 - 모든 메모리 관련 함수 가져오기
import { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  requestNativeMemoryInfo,
  setupPeriodicMemoryOptimization,
  determineOptimizationLevel as nativeDetermineOptimizationLevel 
} from '../native-memory-bridge';

// 필수 함수들만 재내보내기
export { 
  requestNativeMemoryOptimization as optimizeMemory,
  requestNativeGarbageCollection as performGarbageCollection,
  requestNativeMemoryInfo as getMemoryInfo,
  setupPeriodicMemoryOptimization,
  nativeDetermineOptimizationLevel as determineOptimizationLevel
};

/**
 * 메모리 사용률 퍼센트 가져오기
 * 비동기 함수에서 동기 함수로 변경 (캐시된 값 반환)
 */
// 메모리 사용률을 캐싱할 변수
let cachedMemoryUsage = 0;
let lastUpdateTime = 0;
const CACHE_TTL = 5000; // 5초 캐시

export const getMemoryUsagePercentage = (): number => {
  // 캐시된 값이 유효하면 반환
  const now = Date.now();
  if (now - lastUpdateTime < CACHE_TTL) {
    return cachedMemoryUsage;
  }

  // 캐시 갱신 (비동기로 호출하고 현재 캐시값 반환)
  requestNativeMemoryInfo().then(info => {
    if (info) {
      cachedMemoryUsage = info.percent_used || 0;
      lastUpdateTime = now;
    }
  }).catch(err => {
    console.error('메모리 정보 가져오기 오류:', err);
  });

  // 현재 캐시된 값 반환
  return cachedMemoryUsage;
};

/**
 * 성능 및 메모리 최적화 세트 적용 (간편 API)
 * 단일 호출로 여러 최적화 기법 적용
 */
export async function applyPerformanceOptimizations(
  options: {
    level?: OptimizationLevel;
    emergency?: boolean;
  } = {}
): Promise<boolean> {
  const { level = OptimizationLevel.MEDIUM, emergency = false } = options;
  
  try {
    // 네이티브 메모리 최적화 수행
    const result = await requestNativeMemoryOptimization(level, emergency);
    return result !== null;
  } catch (error) {
    console.error('통합 최적화 중 오류:', error);
    return false;
  }
}

// 메모리 유틸리티 설정
export const setupMemoryUtils = () => {
  if (typeof window !== 'undefined') {
    // 초기 메모리 정보 가져오기
    requestNativeMemoryInfo().then(info => {
      if (info) {
        cachedMemoryUsage = info.percent_used || 0;
        lastUpdateTime = Date.now();
      }
    }).catch(() => {});

    window.__memoryOptimizer = {
      // 명시적으로 async/await 사용하여 Promise 반환
      getMemoryInfo: async () => {
        return await requestNativeMemoryInfo();
      },
      getMemoryUsagePercentage: () => {
        return getMemoryUsagePercentage();
      },
      optimizeMemory: (aggressive: boolean) => 
        requestNativeMemoryOptimization(
          aggressive ? OptimizationLevel.HIGH : OptimizationLevel.MEDIUM,
          aggressive
        ),
      setupPeriodicOptimization: setupPeriodicMemoryOptimization
    };
  }
};