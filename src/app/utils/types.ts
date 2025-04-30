/**
 * 애플리케이션 공통 타입 정의
 */

export interface MemoryInfo {
  timestamp: number;
  heap_used: number;
  heap_total: number;
  heap_used_mb: number;
  rss?: number;
  rss_mb?: number;
  percent_used: number;
  heap_limit?: number;
}

export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory: number;
  freedMB: number;
  error?: string;
}

export interface MemoryUsageInfo {
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  rssMB?: number;
  percentUsed: number;
  timestamp: number;
  heapLimit?: number;
  rss?: number;
}
