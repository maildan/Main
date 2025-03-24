/**
 * 네이티브 모듈 인터페이스 타입 정의
 */

// 메모리 최적화 수준
export enum OptimizationLevel {
  Normal = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

// 메모리 정보 인터페이스
export interface MemoryInfo {
  heap_used: number;
  heap_total: number;
  heap_limit?: number;
  rss: number;
  external?: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;
  timestamp: number;
}

// 메모리 최적화 결과 인터페이스
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

// 가비지 컬렉션 결과 인터페이스
export interface GCResult {
  success: boolean;
  timestamp: number;
  freed_memory?: number;
  freed_mb?: number;
  duration?: number;
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
  result?: string;
  error?: string;
  timestamp: number;
}

// 워커 작업 결과 인터페이스
export interface TaskResult {
  success: boolean;
  task_id: string;
  task_type: string;
  duration_ms: number;
  result?: string;
  error?: string;
  timestamp: number;
}

// 워커 풀 통계 인터페이스
export interface WorkerPoolStats {
  active_workers: number;
  idle_workers: number;
  pending_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_tasks: number;
  uptime_ms: number;
  timestamp: number;
}

// 네이티브 모듈 상태 인터페이스
export interface NativeModuleStatus {
  available: boolean;
  fallbackMode: boolean;
  version: string | null;
  info: {
    name: string;
    version: string;
    description: string;
    features: {
      memory_optimization: boolean;
      gpu_acceleration: boolean;
      worker_threads: boolean;
    };
    system?: {
      os: string;
      arch: string;
      cpu_cores: number;
      rust_version: string;
    };
  } | null;
  timestamp: number;
  error?: string;
}

// 네이티브 모듈 인터페이스
export interface NativeModule {
  // 기본 함수
  isNativeModuleAvailable(): boolean;
  isFallbackMode(): boolean;
  getNativeModuleVersion(): string | null;
  getNativeModuleInfo(): NativeModuleInfo | null;
  
  // 메모리 최적화 관련
  getMemoryInfo(): MemoryInfo | null;
  determineOptimizationLevel(): number;
  optimizeMemory(level?: number, emergency?: boolean): Promise<OptimizationResult | null>;
  forceGarbageCollection(): GCResult | null;
  
  // GPU 가속 관련
  isGpuAccelerationAvailable(): boolean;
  enableGpuAcceleration(): boolean;
  disableGpuAcceleration(): boolean;
  getGpuInfo(): GpuInfo | null;
  performGpuComputation(dataJson: string, computationType: string): Promise<GpuComputationResult | null>;
  
  // 워커 스레드 관련
  initializeWorkerPool(threadCount?: number): boolean;
  shutdownWorkerPool(): boolean;
  submitTask(taskType: string, data: string): Promise<TaskResult | null>;
  getWorkerPoolStats(): WorkerPoolStats | null;
  
  // 유틸리티
  getTimestamp(): number;
}

// 모듈 선언
declare module '@/server/native' {
  export const isNativeModuleAvailable: () => boolean;
  export const isFallbackMode: () => boolean;
  export const getNativeModuleVersion: () => string | null;
  export const getNativeModuleInfo: () => NativeModuleInfo | null;
  
  export const getMemoryInfo: () => MemoryInfo | null;
  export const determineOptimizationLevel: () => number;
  export const optimizeMemory: (level?: number, emergency?: boolean) => Promise<OptimizationResult | null>;
  export const forceGarbageCollection: () => GCResult | null;
  
  export const isGpuAccelerationAvailable: () => boolean;
  export const enableGpuAcceleration: () => boolean;
  export const disableGpuAcceleration: () => boolean;
  export const getGpuInfo: () => GpuInfo | null;
  export const performGpuComputation: (dataJson: string, computationType: string) => Promise<GpuComputationResult | null>;
  
  export const initializeWorkerPool: (threadCount?: number) => boolean;
  export const shutdownWorkerPool: () => boolean;
  export const submitTask: (taskType: string, data: string) => Promise<TaskResult | null>;
  export const getWorkerPoolStats: () => WorkerPoolStats | null;
  
  export const getTimestamp: () => number;
}
