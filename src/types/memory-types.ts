/**
 * 메모리 관련 타입 정의
 */

/**
 * 메모리 사용량 정보를 나타내는 인터페이스
 */
export interface MemoryInfo {
  // 바이트 단위 속성 (camelCase - 필수)
  heapUsed: number;
  heapTotal: number;
  rss: number;
  heapUsedMB: number;
  rssMB: number;
  percentUsed: number;
  timestamp: number;

  // 바이트 단위 속성 (snake_case - 옵셔널, 하위 호환성)
  heap_used?: number;
  heap_total?: number;
  heap_limit?: number;
  rss_mb?: number;
  heap_used_mb?: number;
  percent_used?: number;
  
  // 추가 옵셔널 속성
  heapLimit?: number;
  external?: number;
}

/**
 * 메모리 사용량 정보의 별칭 (호환성 유지)
 */
export type MemoryUsageInfo = MemoryInfo;

/**
 * 메모리 설정을 나타내는 인터페이스
 */
export interface MemorySettings {
  autoOptimize: boolean;
  optimizationThreshold: number;
  interval: number;
  checkEnabled: boolean;
  useNativeModule: boolean;
  processingMode?: string;
  maxMemoryThreshold?: number;
}

/**
 * 메모리 사용 단계 열거형
 */
export enum MemoryUsageLevel {
  NORMAL = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * 메모리 풀 통계
 */
export interface MemoryPoolStats {
  poolName: string;
  size: number;
  activeItems: number;
  idleItems: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalAllocated: number;
  totalReleased: number;
}
