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
