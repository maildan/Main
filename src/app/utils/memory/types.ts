import { MemoryUsageInfo } from '../../../types/app-types';
import { MemoryOptimizerUtility } from './types-extended';

/**
 * 메모리 최적화 설정 인터페이스
 */
export interface MemoryOptimizerOptions {
  /** 메모리 사용량 임계치 (MB) */
  threshold?: number;
  /** 모니터링 간격 (ms) */
  checkInterval?: number;
  /** 경고 표시 여부 */
  showWarnings?: boolean;
  /** 자동 최적화 활성화 여부 */
  autoOptimize?: boolean;
  /** 디버그 로그 활성화 여부 */
  debug?: boolean;
  /** 네이티브 구현 선호 여부 */
  preferNative?: boolean;
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryUsageInfo {
  timestamp: number;
  heap_used: number;
  heap_total: number;
  heap_limit?: number; // 선택적으로 설정
  rss: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;
}

/**
 * GC 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory: number; // 일관된 이름 사용
  freedMB: number; // 수정: number | undefined -> number
  duration?: number;
  error?: string;
}

/**
 * 확장 GC 결과 인터페이스
 */
export interface ExtendedGCResult extends GCResult {
  optimizationLevel?: number;
  heapUsedBefore?: number;
  heapUsedAfter?: number;
  percentFreed?: number;
  source?: string;
}

/**
 * 메모리 관련 타입 정의
 */

export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

// 최적화 결과 인터페이스
export interface OptimizationResult {
  success: boolean;
  optimization_level: OptimizationLevel;
  freed_memory?: number;
  freed_mb?: number;
  freedMemory?: number;  // 호환성 유지
  freedMB?: number;      // 호환성 유지
  duration?: number;
  memory_before?: MemoryInfo;
  memory_after?: MemoryInfo;
  timestamp: number;
  error?: string | null;
}

// 메모리 정보 인터페이스
export interface MemoryInfo {
  heap_used: number;
  heapUsed?: number;    // 호환성 유지
  heap_total: number;
  heapTotal?: number;   // 호환성 유지
  heap_used_mb: number;
  heapUsedMB?: number;  // 호환성 유지
  rss: number;
  rss_mb: number;
  rssMB?: number;       // 호환성 유지
  percent_used: number;
  percentUsed?: number; // 호환성 유지
  heap_limit?: number;
  timestamp: number;
}

// 가비지 컬렉션 결과 인터페이스
export interface GCResult {
  success: boolean;
  freed_memory: number;
  freedMemory?: number;  // 호환성 유지
  freed_mb: number;
  freedMB?: number;      // 호환성 유지
  duration: number;
  timestamp: number;
  error?: string | null;
}

// 이벤트 리스너 데이터
export interface EventListenerData {
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  lastUsed: number;
}

// 동적 모듈 정의
export interface DynamicModule {
  id: string;
  lastUsed: number;
  unload: () => void;
}

// 메모리 사용량 정보
export interface MemoryUsageInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

// 최적화 레벨 열거형
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

// 메모리 설정 인터페이스
export interface MemorySettings {
  enableAutomaticOptimization: boolean;
  optimizationThreshold: number;
  optimizationInterval: number;
  aggressiveGC: boolean;
  enableLogging: boolean;
  enablePerformanceMetrics: boolean;
  useHardwareAcceleration: boolean;
  processingMode: string;
  useMemoryPool: boolean;
  poolCleanupInterval: number;
}

// DOM 정리 결과 인터페이스
export interface DOMCleanupResult {
  elementsRemoved: number;
  listenersDetached: number;
  memoryFreed: number;
}

// 함수 유형 정의
export type MemoryInfoProvider = () => MemoryUsageInfo | Promise<MemoryUsageInfo>;
export type MemoryOptimizer = (aggressive: boolean) => Promise<ExtendedGCResult>;
export type GarbageCollector = (emergency: boolean) => Promise<GCResult>;
