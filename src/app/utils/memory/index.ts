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
 */
export async function getMemoryUsagePercentage(): Promise<number> {
  try {
    const memoryInfo = await requestNativeMemoryInfo();
    return memoryInfo ? memoryInfo.percent_used : 0;
  } catch (error) {
    console.error('메모리 사용률 가져오기 오류:', error);
    return 0;
  }
}

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
  const {
    level = OptimizationLevel.MEDIUM,
    emergency = false
  } = options;
  
  try {
    // 네이티브 메모리 최적화 수행
    const result = await requestNativeMemoryOptimization(level, emergency);
    return result !== null;
  } catch (error) {
    console.error('통합 최적화 중 오류:', error);
    return false;
  }
}

// 전역 인터페이스 노출 (이전 코드 호환성 유지)
if (typeof window !== 'undefined') {
  window.__memoryOptimizer = {
    getMemoryInfo: requestNativeMemoryInfo,
    getMemoryUsagePercentage,
    optimizeMemory: (aggressive: boolean) => 
      requestNativeMemoryOptimization(aggressive ? OptimizationLevel.HIGH : OptimizationLevel.MEDIUM, aggressive),
    setupPeriodicOptimization: setupPeriodicMemoryOptimization,
  };
}

// 이전 코드와의 호환성을 위해 필요한 유형 선언
declare global {
  interface Window {
    __memoryOptimizer?: {
      getMemoryInfo?: () => Promise<MemoryInfo | null>;
      getMemoryUsagePercentage?: () => Promise<number>;
      optimizeMemory?: (aggressive: boolean) => Promise<any>;
      setupPeriodicOptimization?: (interval?: number, threshold?: number) => () => void;
      [key: string]: any;
    };
  }
}