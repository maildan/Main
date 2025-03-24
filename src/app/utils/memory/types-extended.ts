/**
 * 메모리 최적화 관련 확장 타입 정의
 * 모든 메모리 관련 타입의 중앙 집중화 및 재사용성 증가
 */
import { MemoryInfo, GCResult, ExtendedGCResult } from './types';

/**
 * 메모리 최적화 유틸리티 인터페이스
 * window.__memoryOptimizer의 타입 정의
 */
export interface MemoryOptimizerUtility {
  // 메모리 최적화 기본 기능
  optimizeMemory?: (aggressive: boolean) => void;
  optimizeImageResources?: () => Promise<boolean>;
  getMemoryInfo?: () => MemoryInfo | null;
  suggestGarbageCollection?: () => void;
  getMemoryUsagePercentage?: () => number;
  
  // GC 컨트롤러 기능
  requestGC?: (emergency?: boolean) => Promise<GCResult>;
  determineOptimizationLevel?: (memoryInfo: MemoryInfo) => number;
  
  // 메모리 풀 기능
  acquireFromPool?: (type: string) => any;
  releaseToPool?: (obj: any) => void;
  
  // 최적화 관련 유틸리티
  optimizeEvents?: () => void;
  cleanupDOM?: () => void;
  clearCaches?: () => void;
  
  // 이벤트 최적화
  optimizeEventListeners?: () => void;
  unloadDynamicModules?: () => void;
  
  // 모니터링 기능
  startMemoryMonitoring?: (interval?: number) => () => void;
  getMemoryUsageStats?: () => {
    current: number;
    peak: number;
    optimizations: number;
  };
  
  // 추가 기능
  setupPeriodicOptimization?: (interval?: number, threshold?: number) => () => void;
}

/**
 * 최적화 수준 설명 인터페이스
 */
export interface OptimizationLevelDescriptions {
  [level: number]: string;
}

/**
 * 캐시 항목 인터페이스
 */
export interface CacheItem<T> {
  // 필요한 캐시 항목 속성 정의
}

/**
 * 메모리 리소스 해제 핸들러 인터페이스
 */
export interface MemoryReleaseHandler {
  // 필요한 메모리 리소스 해제 핸들러 속성 정의
}

// HTML 요소 확장을 위한 타입 정의
export interface HTMLElementWithEventHandlers extends HTMLElement {
  // 필요한 HTML 요소 확장 속성 정의
}

// 메모리 풀 항목 인터페이스
export interface MemoryPoolItem {
  // 필요한 메모리 풀 항목 속성 정의
}

// 메모리 풀 인터페이스
export interface MemoryPool {
  [type: string]: MemoryPoolItem[];
}

// global.d.ts와 충돌하는 인터페이스 제거
// 전역 Window 인터페이스 확장을 직접 정의하는 대신,
// 필요한 경우 global.d.ts에 정의된 것을 사용
