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
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit?: number;
  heapUsedMB: number;
  percentUsed: number;
  unavailable?: boolean;
  error?: string;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

/**
 * GC 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
  error?: string;
}

/**
 * GC 결과 확장 인터페이스
 */
export interface ExtendedGCResult extends GCResult {
  duration?: number;
  optimizationLevel?: number;
}

/**
 * 메모리 관련 타입 정의
 */

// ElectronAPI 메모리 최적화 응답 타입
export interface MemoryOptimizationResult {
  success: boolean;
  memoryInfo?: MemoryInfo;
  error?: string;
}

// 전역 타입 확장은 global.d.ts 파일에 통합되었으므로 여기서는 제거
// declare global {
//   interface Window {
//     __memoryOptimizer?: MemoryOptimizerUtility;
//     ...
//   }
// }
