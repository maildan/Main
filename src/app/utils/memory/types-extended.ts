/**
 * 메모리 관련 확장 타입 정의
 */
import { 
  GCResult, 
  OptimizationLevel, 
  MemorySettings, 
  MemoryUsageInfo 
} from './types';

// ExtendedGCResult 타입 정의 
export interface ExtendedGCResult extends GCResult {
  // 추가 필드 정의
  optimizationLevel?: OptimizationLevel;
  memoryInfoBefore?: MemoryUsageInfo;
  memoryInfoAfter?: MemoryUsageInfo;
  detachedEventListeners?: number; 
  removedElements?: number;
  cleanedCaches?: number;
  optimizationSource?: string;
}

/**
 * 확장된 GC 결과 인터페이스
 */
export interface ExtendedGCResult extends GCResult {
  /**
   * 최적화 레벨
   */
  optimizationLevel?: number;
  
  /**
   * GC 전 힙 사용량
   */
  heapUsedBefore?: number;
  
  /**
   * GC 후 힙 사용량
   */
  heapUsedAfter?: number;
  
  /**
   * 해제된 메모리 비율
   */
  percentFreed?: number;
  
  /**
   * 소스 정보
   */
  source?: string;
}

// Window 인터페이스 확장 (캐시 관련)
export interface WindowWithCache extends Window {
  __cachedData?: Record<string, any>;
  __bufferCache?: Record<string, ArrayBuffer>;
  __memoryCache?: Map<string, any>;
  __animationFrameIds?: number[];
  __intervalIds?: number[];
  __timeoutIds?: number[];
  
  // GC 관련
  gc?: () => void;
}

// 메모리 최적화 상태 인터페이스
export interface MemoryOptimizationState {
  isOptimizing: boolean;
  lastOptimization: number;
  optimizationCount: number;
  totalFreedMemory: number;
  gcCount: number;
  lastGC: number;
}

// 제네릭 캐시 엔트리 인터페이스
export interface CacheEntry<T> {
  data: T;
  expiry: number;
  size: number;
  lastAccess: number;
  accessCount: number;
}

// 메모리 풀 옵션 인터페이스
export interface MemoryPoolOptions {
  maxSize: number;
  cleanupInterval: number;
  ttl: number;
}

// 최적화 작업 관리자 인터페이스
export interface OptimizationTaskManager {
  scheduleTask: (task: () => Promise<void>, priority: number) => void;
  cancelAllTasks: () => void;
  pauseTasks: () => void;
  resumeTasks: () => void;
}

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
  /**
   * 메모리 정보 가져오기
   */
  getMemoryInfo: () => Promise<MemoryInfo | null>;
  
  /**
   * 메모리 사용률 가져오기
   */
  getMemoryUsagePercent: () => Promise<number>;
  
  /**
   * 메모리 최적화 수행
   */
  optimizeMemory: (aggressive: boolean) => Promise<OptimizationResult>;
  
  /**
   * 가비지 컬렉션 제안
   */
  suggestGarbageCollection: () => Promise<GCResult>;
  
  /**
   * 자동 최적화 설정
   */
  setupAutomaticOptimization: (options: MemoryOptimizerOptions) => () => void;
}

/**
 * 메모리 최적화 옵션 인터페이스
 */
export interface MemoryOptimizerOptions {
  /**
   * 모니터링 간격 (ms)
   */
  interval?: number;
  
  /**
   * 최적화 임계값 (MB)
   */
  threshold?: number;
  
  /**
   * 힙 사용률 임계값 (%)
   */
  usageThreshold?: number;
  
  /**
   * 자동 최적화 활성화 여부
   */
  enableAutoOptimize?: boolean;
  
  /**
   * 네이티브 GC 선호 여부
   */
  preferNativeGC?: boolean;
  
  /**
   * 메모리 최적화 모드
   */
  mode?: 'conservative' | 'balanced' | 'aggressive';
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

// 메모리 최적화 옵션
export interface MemoryOptimizationOptions {
  aggressive?: boolean;
  targets?: string[];
  timeout?: number;
  includeEventListeners?: boolean;
  includeImageCache?: boolean;
  includeObjectCache?: boolean;
}

// 추가 타입 정의 (중복 제거)
export interface DynamicModule<T = any> {
  name: string;
  instance: T;
  lastAccessed: number;
  size?: number;
  priority?: number; 
}

// 제네릭 타입 확장
export interface PooledObject<T> {
  object: T;
  createdAt: number;
  lastUsed: number;
  usageCount: number;
}

// global.d.ts와 충돌하는 인터페이스 제거
// 전역 Window 인터페이스 확장을 직접 정의하는 대신,
// 필요한 경우 global.d.ts에 정의된 것을 사용
