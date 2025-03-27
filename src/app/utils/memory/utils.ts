/**
 * 메모리 관리를 위한 유틸리티 함수
 */

/**
 * 메모리 유틸리티 초기화
 * 앱 실행 시 메모리 관리 시스템을 설정합니다.
 */
export function setupMemoryUtils(): void {
  // 글로벌 메모리 최적화 객체가 없는 경우 초기화
  if (typeof window !== 'undefined' && !window.__memoryOptimizer) {
    window.__memoryOptimizer = {
      getMemoryInfo: async () => {
        try {
          const memoryInfo = await getMemoryUsage();
          return memoryInfo;
        } catch (e) {
          console.error('메모리 정보 가져오기 오류:', e);
          return null;
        }
      },
      getMemoryUsagePercentage: async () => {
        const memoryInfo = await getMemoryUsage();
        return memoryInfo ? memoryInfo.percent_used : 0;
      },
      optimizeMemory: async (aggressive = false) => {
        // 최적화 로직 구현
        return { success: true };
      },
      suggestGarbageCollection: () => {
        if (typeof window.gc === 'function') {
          window.gc();
        }
      },
      clearAllCaches: () => {
        // 캐시 정리 로직
        return true;
      },
      setupPeriodicOptimization: (interval = 60000, threshold = 80) => {
        // 주기적 최적화 설정
        return () => {}; // 정리 함수
      },
      cleanupPeriodicOptimization: () => {
        // 정리 로직
      },
      settings: {}
    };
  }
}

/**
 * 현재 메모리 사용량 백분율 가져오기
 */
export async function getMemoryUsagePercentage(): Promise<number> {
  if (typeof window !== 'undefined' && window.__memoryOptimizer?.getMemoryUsagePercentage) {
    return window.__memoryOptimizer.getMemoryUsagePercentage();
  }
  
  try {
    const memoryInfo = await getMemoryUsage();
    return memoryInfo ? memoryInfo.percent_used : 0;
  } catch (e) {
    console.error('메모리 사용량 가져오기 오류:', e);
    return 0;
  }
}

/**
 * 현재 메모리 사용량 정보 가져오기
 */
async function getMemoryUsage() {
  if (typeof window !== 'undefined') {
    // 브라우저 환경에서는 performance.memory API 사용 시도
    if (performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        heap_used: mem.usedJSHeapSize,
        heap_total: mem.totalJSHeapSize,
        heap_limit: mem.jsHeapSizeLimit,
        heap_used_mb: mem.usedJSHeapSize / (1024 * 1024),
        percent_used: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };
    }
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
    timestamp: data.timestamp || Date.now()
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
      } catch (e) {
        // 리소스 해제 에러 무시
      }
    }
  }
}
