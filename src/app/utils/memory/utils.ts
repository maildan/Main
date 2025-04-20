/**
 * 메모리 관리를 위한 유틸리티 함수
 */
import { OptimizationLevel } from '@/types/optimization-level';
import { optimizationController } from './gc/optimization-controller';

// 브라우저 환경 확인 변수 추가
const isBrowser = typeof window !== 'undefined';

/**
 * 메모리 유틸리티 초기화
 * 앱 실행 시 메모리 관리 시스템을 설정합니다.
 */
export function setupMemoryUtils(): void {
  if (typeof window !== 'undefined') {
    // window 객체에 최적화 컨트롤러 등록
    (window as any).__memoryOptimizer = {
      ...optimizationController,

      // 메모리 사용량 관련 유틸리티 추가
      getMemoryUsagePercentage: async () => {
        return getMemoryUsagePercentage();
      },

      // 메모리 최적화 유틸리티 추가
      optimizeMemory: async (_level: number = 0, _aggressive: boolean = false) => {
        return optimizationController.performMediumOptimization();
      }
    };
  }
}

/**
 * 주기적인 메모리 모니터링 설정
 * @param callback 콜백 함수
 * @param _interval 실행 간격 (밀리초)
 * @param _threshold 최적화 임계값 (%)
 */
export function setupPeriodicMonitoring(
  callback: (percentage: number) => void,
  _interval: number = 30000,
  _threshold: number = 80
): () => void {
  let intervalId: NodeJS.Timeout | null = null;

  const checkMemory = async () => {
    const percentage = await getMemoryUsagePercentage();
    if (typeof callback === 'function') {
      callback(percentage);
    }
  };

  // 초기 실행
  checkMemory();

  // 주기적 실행 설정
  if (typeof window !== 'undefined') {
    intervalId = setInterval(checkMemory, _interval);
  }

  // 정리 함수 반환
  return () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * 현재 메모리 사용량 백분율 가져오기
 */
export async function getMemoryUsagePercentage(): Promise<number> {
  try {
    // 브라우저 환경에서 performance.memory API 사용 시도
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      const mem = (window.performance as any).memory;
      return Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100);
    }

    // 대체 구현: 저장된 메모리 정보 사용
    const memoryInfo = await getMemoryUsage();
    return memoryInfo ? memoryInfo.percent_used : 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * 현재 메모리 사용량 정보 가져오기
 */
async function getMemoryUsage() {
  try {
    // 브라우저 환경에서는 performance.memory API 사용 시도
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      const mem = (window.performance as any).memory;
      return {
        heap_used: mem.usedJSHeapSize,
        heap_total: mem.totalJSHeapSize,
        heap_limit: mem.jsHeapSizeLimit,
        heap_used_mb: mem.usedJSHeapSize / (1024 * 1024),
        percent_used: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };
    }
  } catch (_e) {
    // 오류 시 기본값 반환
  }

  // 기본값 반환
  return {
    heap_used: 0,
    heap_total: 0,
    heap_limit: 0,
    heap_used_mb: 0,
    percent_used: 0,
    timestamp: Date.now()
  };
}

/**
 * 메모리 정보 객체 생성
 */
export function createMemoryInfo(data: Partial<{
  heap_used: number;
  heap_total: number;
  heap_limit: number;
  heap_used_mb: number;
  percent_used: number;
  timestamp: number;
}>) {
  return {
    heap_used: data.heap_used || 0,
    heap_total: data.heap_total || 0,
    heap_limit: data.heap_limit || 0,
    heap_used_mb: data.heap_used_mb || 0,
    percent_used: data.percent_used || 0,
    timestamp: data.timestamp || Date.now(),
    // camelCase 별칭 추가 (호환성)
    heapUsed: data.heap_used || 0,
    heapTotal: data.heap_total || 0,
    heapLimit: data.heap_limit || 0,
    heapUsedMB: data.heap_used_mb || 0,
    percentUsed: data.percent_used || 0
  };
}

/**
 * 자원 해제 헬퍼 함수
 */
export function cleanupResources(resources: any[]): void {
  for (const resource of resources) {
    if (resource && typeof resource.dispose === 'function') {
      try {
        resource.dispose();
      } catch (_e) {
        // 리소스 해제 에러 무시
      }
    }
  }
}

export function scheduleGarbageCollection(delay = 100): void {
  if (isBrowser) {
    setTimeout(() => {
      if (typeof window.gc === 'function') {
        try {
          window.gc();
          console.log('Scheduled garbage collection executed.');
        } catch (e) {
          console.warn('Garbage collection failed:', e);
        }
      } else {
        console.warn('Garbage collection API not available.');
      }
    }, delay);
  }
}
