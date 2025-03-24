/**
 * 유틸리티 함수 통합 인덱스
 * 
 * 모든 유틸리티 모듈을 재내보내 일관된 접근점을 제공합니다.
 */

// 기본 메모리 유틸리티 - 선택적 내보내기로 이름 충돌 해결
export { 
  getMemoryUsagePercentage,
  getMemoryInfo as getJsMemoryInfo
} from './memory/memory-info';

export {
  internalOptimizeMemory,
  optimizeMemory as jsOptimizeMemory,
  getFromMemoryPool,
  returnToMemoryPool
} from './memory/optimizer';

export {
  requestGC,
  suggestGarbageCollection
} from './memory/gc-utils';

// 네이티브 통합 모듈 
export { 
  initializeMemoryManager,
  optimizeMemoryWithFallback as optimizeMemory, // 기본 최적화 함수로 사용
  collectGarbageWithFallback,
  getMemoryInfoWithFallback as getMemoryInfo,  // 기본 메모리 정보 함수로 사용
  getMemoryManagerState,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  setFallbackMode,
  optimizeOnComponentUnmount
} from './memory-management';

export {
  getGpuInfo as getGpuAccelerationInfo,  // 이름 충돌 방지를 위한 재명명
  toggleGpuAcceleration,
  executeGpuComputation,
  getGpuAccelerationState,
  setGpuFallbackMode,
  initializeGpuAcceleration
} from './gpu-acceleration';

// 통합 성능 최적화
export * from './performance-optimizer';

// 네이티브 모듈 통신
export { 
  getMemoryInfo as fetchNativeMemoryInfo,
  optimizeMemory as nativeOptimizeMemory,
  forceGarbageCollection,
  getGpuInfo as fetchGpuInfo
} from './nativeModuleClient';

// 명시적 이름 재내보내기를 통한 충돌 해결
export { 
  requestNativeMemoryOptimization,
  requestNativeGarbageCollection,
  requestNativeMemoryInfo,
  determineOptimizationLevel as nativeDetermineOptimizationLevel,
  setupPeriodicMemoryOptimization,
  addMemoryOptimizationListeners
} from './native-memory-bridge';

// 성능 측정
export * from './performance-metrics';

// GPU 컴퓨팅 비교 헬퍼 함수
export function isBrowserGpuAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    // WebGL 지원 확인
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || 
               canvas.getContext('webgl') ||
               canvas.getContext('experimental-webgl');
               
    return !!gl;
  } catch (e) {
    return false;
  }
}

// 메모리 최적화 도우미
export async function optimizeMemoryOnDemand(aggressive = false): Promise<boolean> {
  try {
    const { optimizePerformance } = await import('./performance-optimizer');
    await optimizePerformance({
      aggressive,
      memoryOptimizationLevel: aggressive ? 3 : 2, // HIGH or MEDIUM
      enableGpuAcceleration: true,
      cleanupDOM: aggressive
    });
    return true;
  } catch (error) {
    console.error('온디맨드 메모리 최적화 오류:', error);
    return false;
  }
}
