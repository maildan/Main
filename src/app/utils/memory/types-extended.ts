/**
 * 확장된 메모리 관련 타입 정의
 */

import {
  GCResult,
  OptimizationLevel,
  MemoryInfo
} from '@/types';

// ExtendedGCResult 타입 정의 - 중복 선언 해결
export interface ExtendedGCResult extends GCResult {
  // 추가 필드 정의
  optimizationLevel?: OptimizationLevel;
  memoryInfoBefore?: MemoryInfo;
  memoryInfoAfter?: MemoryInfo;
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
  __memoryCache?: Map<string, unknown>;
  __styleCache?: Map<string, unknown>;
  __widgetCache?: Map<string, unknown>;
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
  getMemoryInfo: () => Promise<MemoryInfo>;
  getMemoryUsagePercentage: () => Promise<number>;
  optimizeMemory: (aggressive: boolean) => Promise<any>;
  suggestGarbageCollection: () => void;
  clearAllCaches: () => void;
  setupPeriodicOptimization: (interval?: number, threshold?: number) => () => void;
  cleanupPeriodicOptimization: () => void;
}

/**
 * 확장된 윈도우 인터페이스 정의
 * 메모리 관리 및 캐시 관련 속성 추가
 */

// 전역 윈도우 객체에 캐시 관련 속성 추가
export interface WindowWithCache extends Window {
  // Object URL 관련
  __objectUrls?: Map<string, string>;

  // 위젯 캐시 관련
  __widgetCache?: Map<string, unknown>;

  // 스타일 캐시 관련 - Map<string, unknown>으로 수정
  __styleCache?: Map<string, unknown>;

  // 이미지 리사이즈 캐시 관련
  __imageResizeCache?: Map<string, string>;

  // 메모리 캐시 관련
  __memoryCache?: Map<string, unknown>;

  // 버퍼 캐시 관련
  __bufferCache?: Record<string, unknown>;

  // 텍스처 캐시 관련
  __textureCache?: Map<string, unknown>;

  // 객체 캐시 관련
  __objectCache?: Map<string, unknown>;

  // 동적 모듈 관리
  _dynamicModules?: Map<string, unknown>;

  // 가비지 콜렉션
  gc?: () => void;
}
