/**
 * 가비지 컬렉션 관련 타입 정의
 */

import { GCResult, OptimizationResult, OptimizationLevel } from '@/types';

/**
 * GC 수행 옵션
 */
export interface GCOptions {
  emergency?: boolean;
  timeout?: number;
  forceNative?: boolean;
}

/**
 * GC 확장 결과 타입
 */
export interface ExtendedGCResult extends GCResult {
  source?: 'native' | 'js';
  heapBefore?: number;
  heapAfter?: number;
  details?: Record<string, any>;
}

/**
 * 이벤트 최적화 설정
 */
export interface EventOptimizationOptions {
  cleanupDetachedEvents?: boolean;
  cleanupDuplicateEvents?: boolean;
  throttleFrequentEvents?: boolean;
}

/**
 * 리소스 최적화 설정
 */
export interface ResourceOptimizationOptions {
  cleanupImages?: boolean;
  cleanupDomElements?: boolean;
  cleanupCaches?: boolean;
  cleanupTimers?: boolean;
}

/**
 * 메모리 최적화 요청 옵션
 */
export interface MemoryOptimizationRequest {
  level: OptimizationLevel;
  emergency?: boolean;
  componentId?: string;
  source?: string;
  eventOptions?: EventOptimizationOptions;
  resourceOptions?: ResourceOptimizationOptions;
}

/**
 * 메모리 최적화 응답
 */
export interface MemoryOptimizationResponse {
  success: boolean;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string;
  level: OptimizationLevel;
  timestamp: number;
}

/**
 * GC 결과 확장 인터페이스
 */
export interface DetailedGCResult extends GCResult {
  optimizationLevel?: OptimizationLevel;
  totalFreed?: number; // 총 해제된 메모리 (바이트)
  durationMs?: number; // 소요된 시간 (밀리초)
  actions?: string[]; // 수행된 작업 목록
}
