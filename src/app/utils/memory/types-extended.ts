/**
 * 메모리 관련 확장 타입 정의
 */
import { 
  GCResult, 
  OptimizationLevel, 
  MemoryUsageInfo 
} from './types';

// ExtendedGCResult 타입 정의 - 중복 선언 해결
export interface ExtendedGCResult extends GCResult {
  // 추가 필드 정의
  optimizationLevel?: OptimizationLevel;
  memoryInfoBefore?: MemoryUsageInfo;
  memoryInfoAfter?: MemoryUsageInfo;
  detachedEventListeners?: number; 
  removedElements?: number;
  cleanedCaches?: number;
  optimizationSource?: string;
  
  // 추가 필드 (타입 일관성 유지)
  heapUsedBefore?: number;
  heapUsedAfter?: number;
  percentFreed?: number;
  source?: string;
}

// 애플리케이션 캐시 관련 확장 타입
// Window 인터페이스 확장 대신 별도 타입으로 정의
export type WindowCacheObjects = {
  __imageResizeCache?: Map<string, HTMLImageElement>;
  __objectUrls?: Map<string, string>;
  __memoryCache?: Map<string, any>;
  __styleCache?: Map<string, any>;
  __widgetCache?: Map<string, any>;
};

// 메모리 최적화 상태 인터페이스
export interface MemoryOptimizationState {
  lastRun: number | null;
  totalOptimizations: number;
  freedMemory: number;
  active: boolean;
  running: boolean;
}

// 제네릭 캐시 엔트리 인터페이스
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires?: number;
  priority?: number;
}

// 메모리 풀 옵션 인터페이스
export interface MemoryPoolOptions {
  initialSize: number;
  maxSize: number;
  growFactor: number;
  shrinkThreshold: number;
  itemType: string;
}

// 메모리 최적화 유틸리티 - 함수 정의
export interface MemoryOptimizerUtility {
  getMemoryInfo: () => Promise<MemoryUsageInfo>;
  getMemoryUsagePercentage: () => Promise<number>;
  optimizeMemory: (aggressive: boolean) => Promise<any>;
  suggestGarbageCollection: () => void;
  clearAllCaches: () => void;
  setupPeriodicOptimization: (interval?: number, threshold?: number) => () => void;
  cleanupPeriodicOptimization: () => void;
}
