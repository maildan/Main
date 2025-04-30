/**
 * 메모리 관련 인터페이스 정의
 */

import { OptimizationLevel, MemoryInfo, GCResult } from '@/types';

// 컴포넌트 최적화 설정
export interface ComponentOptimizationSettings {
  optimizeOnUnmount: boolean;
  aggressiveCleanup: boolean;
}

// 메모리 최적화 설정
export interface MemorySettings {
  // 구현 선택 옵션
  preferNativeImplementation: boolean;
  enableAutomaticFallback: boolean;
  fallbackRetryDelay: number;
  
  // 자동 최적화 설정
  enableAutomaticOptimization: boolean;
  optimizationThreshold: number;
  optimizationInterval: number;
  
  // 고급 설정
  aggressiveGC: boolean;
  enableLogging: boolean;
  enablePerformanceMetrics: boolean;
  
  // 메모리 풀 설정
  useMemoryPool: boolean;
  poolCleanupInterval: number;
  
  // GPU 관련 설정
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  
  // 컴포넌트별 최적화 설정
  componentSpecificSettings: {
    [componentId: string]: ComponentOptimizationSettings;
  };
}

// 메모리 최적화 이벤트
export interface MemoryOptimizationEvent {
  type: 'info' | 'warning' | 'error' | 'gc' | 'optimization';
  message: string;
  timestamp: number;
  level?: OptimizationLevel;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
}

// 확장된 GC 결과
export interface ExtendedGCResult extends GCResult {
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  source?: string;
  elapsedMs?: number;
  components?: string[];
}

// 메모리 풀 설정
export interface MemoryPoolSettings {
  enabled: boolean;
  maxSize: number;
  cleanupInterval: number;
  maxIdleTime: number;
}

// 메모리 풀 통계
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

/**
 * 최적화 결과 인터페이스
 */
export interface OptimizationResult {
  // 성공 여부
  success: boolean;
  
  // 적용된 최적화 수준
  optimization_level: OptimizationLevel;
  
  // 최적화 전 메모리 상태
  memory_before?: MemoryInfo;
  
  // 최적화 후 메모리 상태
  memory_after?: MemoryInfo;
  
  // 해제된 메모리 (바이트)
  freed_memory?: number;
  
  // 해제된 메모리 (MB)
  freed_mb?: number;
  
  // 소요 시간 (밀리초)
  duration?: number;
  
  // 타임스탬프 (UNIX 밀리초)
  timestamp: number;
  
  // 오류 메시지 (실패 시)
  error?: string;
}
