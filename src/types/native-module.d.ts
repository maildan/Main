/**
 * 네이티브 모듈 타입 정의
 * 
 * Rust 네이티브 모듈과의 상호작용에 사용되는 타입들을 정의합니다.
 */

// 최적화 레벨 열거형
export enum OptimizationLevel {
  Normal = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

// 메모리 정보 인터페이스 - snake_case와 camelCase 모두 지원
export interface MemoryInfo {
  // snake_case 속성 (Rust와 호환)
  heap_used: number;
  heap_total: number;
  heap_limit?: number;
  rss: number;
  external?: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;
  
  // camelCase 속성 (TypeScript 규칙)
  heapUsed: number;
  heapTotal: number;
  heapLimit?: number;
  rssMB: number;
  percentUsed: number;
  heapUsedMB: number;
  
  // 공통 속성
  timestamp: number;
  error?: string;
  unavailable?: boolean;
}

// 최적화 결과 인터페이스
export interface OptimizationResult {
  success: boolean;
  optimization_level: OptimizationLevel;
  memory_before?: MemoryInfo;
  memory_after?: MemoryInfo;
  freed_memory?: number;
  freed_mb?: number;
  duration?: number;
  timestamp: number;
  error?: string;
}

// GC 결과 인터페이스
export interface GCResult {
  success: boolean;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
  timestamp: number;
  error?: string;
}

// GPU 정보 인터페이스
export interface GpuInfo {
  name: string;
  vendor: string;
  driver_info: string;
  device_type: string;
  backend: string;
  available: boolean;
}

// GPU 계산 결과 인터페이스
export interface GpuComputationResult {
  success: boolean;
  task_type: string;
  duration_ms: number;
  result: any;
  error?: string;
  accelerated: boolean;
  timestamp: number;
}

// 작업 결과 인터페이스
export interface TaskResult {
  success: boolean;
  task_id: string;
  task_type: string;
  duration_ms: number;
  result: any;
  error?: string;
  timestamp: number;
}

// 워커 풀 상태 인터페이스
export interface WorkerPoolStats {
  thread_count: number;
  active_tasks: number;
  completed_tasks: number;
  active_workers: number;
  idle_workers: number;
  pending_tasks: number;
  failed_tasks: number;
  total_tasks: number;
  uptime_ms: number;
  timestamp: number;
}

// 성능 지표 인터페이스
export interface PerformanceMetrics {
  calls: number;
  errors: number;
  avgExecutionTime: number;
  lastGcTime: number;
  totalExecutionTime: number;
  timestamp: number;
}

// ElectronAPI 확장 (window.electronAPI)
declare global {
  interface Window {
    electronAPI?: {
      requestGC: () => Promise<void>;
      optimizeMemory: (aggressive: boolean) => Promise<void>;
      getMemoryUsage: () => Promise<MemoryInfo>;
      onRequestGC: (callback: (data: { emergency: boolean }) => void) => (() => void);
      rendererGCCompleted: (data: { timestamp: number, success: boolean, memoryInfo: any }) => void;
    };
    
    // 전역 메모리 최적화 유틸리티
    __memoryOptimizer?: {
      getMemoryInfo: () => any;
      optimizeMemory: (aggressive: boolean) => any;
      suggestGarbageCollection: () => void;
      requestGC: (emergency?: boolean) => Promise<GCResult>;
      getMemoryUsagePercentage: () => number;
      optimizeImageResources: () => Promise<boolean>;
      determineOptimizationLevel?: (memoryInfo: MemoryInfo) => number;
      acquireFromPool?: (poolName: string) => any;
      releaseToPool?: (obj: any) => void;
      setupPeriodicOptimization?: (interval?: number, threshold?: number) => () => void;
    };
    
    // Chrome 브라우저 메모리 정보 인터페이스
    performance?: {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    
    // V8 GC 접근 (--expose-gc 옵션 사용 시)
    gc?: () => void;
  }
}
