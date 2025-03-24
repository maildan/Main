/**
 * 메모리 최적화 유틸리티 통합 모듈
 * 
 * 이 파일은 네이티브 모듈 기능을 통합하여
 * 애플리케이션에 단일 인터페이스를 제공합니다.
 */

import { MemoryInfo, GCResult, OptimizationLevel } from './types';
import { suggestGarbageCollection, requestGC } from './gc/garbage-collector';
import { 
  freeUnusedMemory, 
  optimizeDOM, 
  clearLargeObjectsAndCaches 
} from './gc/resource-optimizer';
import { 
  performBasicOptimization,
  performMediumOptimization,
  performHighOptimization,
  performCriticalOptimization
} from './gc/optimization-controller';

// 기본 메모리 최적화 기능
export * from './memory-info';
export * from './optimizer';
export * from './gc-utils';

// 이미지 최적화
export * from './image-optimizer';

// React 훅
export * from './hooks';

// GPU 가속화
export * from './gpu-accelerator';

// 네이티브 모듈 브릿지 - determineOptimizationLevel 명시적 재내보내기
import { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  determineOptimizationLevel as nativeDetermineOptimizationLevel,
  setupPeriodicMemoryOptimization
} from '../native-memory-bridge';
export { 
  requestNativeMemoryOptimization, 
  requestNativeGarbageCollection,
  setupPeriodicMemoryOptimization,
  nativeDetermineOptimizationLevel 
};

// 메모리 최적화 모듈 초기화 상태
let memOptimizer: any = null;

/**
 * 메모리 최적화 모듈 초기화
 */
export function initializeMemoryOptimizer() {
  try {
    // 이미 초기화되었는지 확인
    if (memOptimizer) return true;
    
    // 전역 객체에서 메모리 최적화 모듈 가져오기
    if (window.__memoryOptimizer) {
      memOptimizer = window.__memoryOptimizer;
      return true;
    }
    
    // 전역 객체에 메모리 최적화 모듈이 없는 경우 생성
    memOptimizer = {
      getMemoryInfo: getMemoryInfo,
      getMemoryUsagePercentage: getMemoryUsagePercentage,
      optimizeMemory: optimizeMemory,
      suggestGarbageCollection: suggestGarbageCollection,
      requestGC: (emergency: boolean) => requestGC(emergency),
      setupPeriodicOptimization: setupPeriodicOptimization,
      cleanupPeriodicOptimization: cleanupPeriodicOptimization
    };
    
    // 전역 객체에 등록
    window.__memoryOptimizer = memOptimizer;
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 모듈 초기화 오류:', error);
    return false;
  }
}

/**
 * 메모리 정보 가져오기
 * @returns 메모리 정보
 */
export function getMemoryInfo(): MemoryInfo | null {
  try {
    // 네이티브 구현 사용 시도
    if (memOptimizer && typeof memOptimizer.getMemoryInfo === 'function') {
      return memOptimizer.getMemoryInfo();
    }
    
    // 자바스크립트 구현 (폴백)
    return getFallbackMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 폴백 메모리 정보 가져오기
 */
function getFallbackMemoryInfo(): MemoryInfo {
  // 성능 API를 사용하여 메모리 정보 추정
  const memory = (performance as any).memory;
  const timestamp = Date.now();
  
  if (memory) {
    const heapUsed = memory.usedJSHeapSize;
    const heapTotal = memory.totalJSHeapSize;
    const heapLimit = memory.jsHeapSizeLimit;
    
    return {
      timestamp,
      heap_used: heapUsed,
      heap_total: heapTotal,
      heap_limit: heapLimit,
      rss: heapTotal,
      heap_used_mb: Math.round(heapUsed / (1024 * 1024) * 100) / 100,
      rss_mb: Math.round(heapTotal / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((heapUsed / heapTotal) * 100)
    };
  }
  
  // 성능 API를 사용할 수 없는 경우 기본값 반환
  return {
    timestamp,
    heap_used: 0,
    heap_total: 100 * 1024 * 1024,
    rss: 0,
    heap_used_mb: 0,
    rss_mb: 0,
    percent_used: 0
  };
}

/**
 * 메모리 사용률 퍼센트 가져오기
 */
export function getMemoryUsagePercentage(): number {
  try {
    // 네이티브 구현 사용 시도
    if (memOptimizer && typeof memOptimizer.getMemoryUsagePercentage === 'function') {
      return memOptimizer.getMemoryUsagePercentage();
    }
    
    // 자바스크립트 구현 (폴백)
    const memoryInfo = getMemoryInfo();
    return memoryInfo ? memoryInfo.percent_used : 0;
  } catch (error) {
    console.error('메모리 사용률 가져오기 오류:', error);
    return 0;
  }
}

/**
 * 메모리 최적화 수행
 * @param aggressive 적극적인 최적화 여부
 */
export async function optimizeMemory(aggressive: boolean = false): Promise<any> {
  try {
    // 네이티브 구현 사용 시도
    if (memOptimizer && typeof memOptimizer.optimizeMemory === 'function') {
      return await memOptimizer.optimizeMemory(aggressive);
    }
    
    // 자바스크립트 구현 (폴백)
    return aggressive ? await performHighOptimization() : await performBasicOptimization();
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    // 오류 발생 시 기본 정리 수행
    freeUnusedMemory();
    return { success: false, error: String(error) };
  }
}

/**
 * 주기적 메모리 최적화 설정
 * @param interval 간격 (ms)
 * @param threshold 임계값 (%)
 */
export function setupPeriodicOptimization(interval: number = 60000, threshold: number = 70): void {
  try {
    // 네이티브 구현 사용 시도
    if (memOptimizer && typeof memOptimizer.setupPeriodicOptimization === 'function') {
      memOptimizer.setupPeriodicOptimization(interval, threshold);
      return;
    }
    
    // 자바스크립트 구현 (폴백)
    // 구현 코드 추가...
  } catch (error) {
    console.error('주기적 메모리 최적화 설정 오류:', error);
  }
}

/**
 * 주기적 메모리 최적화 정리
 */
export function cleanupPeriodicOptimization(): void {
  try {
    // 네이티브 구현 사용 시도
    if (memOptimizer && typeof memOptimizer.cleanupPeriodicOptimization === 'function') {
      memOptimizer.cleanupPeriodicOptimization();
      return;
    }
    
    // 자바스크립트 구현 (폴백)
    // 구현 코드 추가...
  } catch (error) {
    console.error('주기적 메모리 최적화 정리 오류:', error);
  }
}

// 최적화 레벨별 함수 export
export {
  performBasicOptimization as performLowOptimization,
  performMediumOptimization,
  performHighOptimization,
  performCriticalOptimization,
  suggestGarbageCollection,
  requestGC as forceGarbageCollection,
  optimizeDOM,
  freeUnusedMemory,
  clearLargeObjectsAndCaches
};

// 초기화 자동 실행
initializeMemoryOptimizer();

// 전역 메모리 최적화 API 설정 - 중복 등록 방지 및 통합
if (typeof window !== 'undefined') {
  // 이미 초기화되었는지 확인
  if (!window.__memoryOptimizer) {
    window.__memoryOptimizer = {};
  }
  
  // 모듈들 비동기 로드 및 기능 통합
  Promise.all([
    import('./memory-info'),
    import('./optimizer'),
    import('./gc-utils'),
    import('./image-optimizer'),
    import('../native-memory-bridge')
  ]).then(([memoryInfo, optimizer, gcUtils, imageOptimizer, nativeBridge]) => {
    const memOptimizer = window.__memoryOptimizer;
    
    // 메모리 정보 함수
    memOptimizer.getMemoryInfo = memoryInfo.getMemoryInfo;
    memOptimizer.getMemoryUsagePercentage = memoryInfo.getMemoryUsagePercentage;
    
    // 최적화 함수 - 네이티브 함수로 대체
    memOptimizer.optimizeMemory = async (aggressive: boolean) => {
      const level = aggressive ? 3 : 2; // 적극적이면 HIGH, 아니면 MEDIUM
      const result = await nativeBridge.requestNativeMemoryOptimization(level, aggressive);
      return result;
    };
    
    // GC 함수
    memOptimizer.suggestGarbageCollection = gcUtils.suggestGarbageCollection;
    memOptimizer.requestGC = async (emergency: boolean) => {
      const result = await nativeBridge.requestNativeGarbageCollection();
      return result;
    };
    
    // 이미지 최적화
    memOptimizer.optimizeImageResources = imageOptimizer.optimizeImageResources;
    
    // 네이티브 모듈 특정 기능
    memOptimizer.determineOptimizationLevel = nativeBridge.determineOptimizationLevel;
    memOptimizer.setupPeriodicOptimization = nativeBridge.setupPeriodicMemoryOptimization;
    
    console.log('메모리 최적화 통합 유틸리티 초기화 완료');
  });
}

/**
 * 성능 및 메모리 최적화 세트 적용 (간편 API)
 * 단일 호출로 여러 최적화 기법 적용
 */
export async function applyPerformanceOptimizations(
  options: {
    memoryOptimize?: boolean;
    gpuAccelerate?: boolean;
    cleanupDOM?: boolean;
    cleanupStorage?: boolean;
    aggressive?: boolean;
  } = {}
): Promise<boolean> {
  const {
    memoryOptimize = true,
    gpuAccelerate = false,
    cleanupDOM = true,
    cleanupStorage = true,
    aggressive = false
  } = options;
  
  try {
    if (memoryOptimize) {
      // 네이티브 메모리 최적화 수행
      const level = aggressive ? 3 : 2; // HIGH or MEDIUM
      await requestNativeMemoryOptimization(level, aggressive);
    }
    
    // 다른 최적화 작업도 필요하다면 추가할 수 있음
    
    return true;
  } catch (error) {
    console.error('통합 최적화 중 오류:', error);
    return false;
  }
}

// 메모리 정보 변환 함수 수정
function convertToMemoryInfo(nativeInfo: any): MemoryInfo {
  if (!nativeInfo) return null;
  
  return {
    heapUsed: nativeInfo.heap_used,
    heapTotal: nativeInfo.heap_total,
    heapUsedMB: nativeInfo.heap_used_mb,
    percentUsed: nativeInfo.percent_used,
    // 추가 필드들
    timestamp: nativeInfo.timestamp || Date.now()
  } as MemoryInfo;
}

// Null 체크 추가 - undefined 참조 오류 수정
export function setupMemoryOptimizer(options?: MemoryOptimizerOptions): MemoryOptimizerUtility {
  // 메모리 최적화 함수
  const optimizeMemory = async (emergency: boolean = false): Promise<GCResult> => {
    // null 체크 추가
    if (memOptimizer && memOptimizer.optimizeMemory) {
      return memOptimizer.optimizeMemory(emergency);
    }
    
    // 기본 구현
    return {
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: 'Memory optimizer not initialized'
    };
  };
  
  // null 체크 추가
  const forceGC = async (): Promise<void> => {
    if (memOptimizer && memOptimizer.requestGC) {
      await memOptimizer.requestGC(false);
    }
  };
  
  // null 체크 추가
  const forceEmergencyGC = async (): Promise<void> => {
    if (memOptimizer && memOptimizer.requestGC) {
      await memOptimizer.requestGC(true);
    }
  };
  
  return {
    getMemoryInfo,
    optimizeMemory,
  };
}