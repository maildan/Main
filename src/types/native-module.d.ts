/**
 * 네이티브 모듈 타입 정의
 * 
 * Rust로 작성된 네이티브 모듈과의 인터페이스를 정의합니다.
 */

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external?: number;
  heapUsedMB: number;
  rssMB: number;
  percentUsed: number;
  timestamp: number;
  
  // 하위 호환성을 위한 snake_case 버전
  heap_used: number;
  heap_total: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;
  heap_limit?: number;
}

/**
 * 최적화 레벨 열거형
 * Ensure this enum matches the Rust enum in optimizer.rs
 */
export enum OptimizationLevel {
  Normal = 0,   // Add missing Normal to match Rust
  Low = 1,      // Match with Rust's Low
  Medium = 2,   // Match with Rust's Medium
  High = 3,     // Match with Rust's High
  Critical = 4  // Match with Rust's Critical
}

/**
 * 가비지 컬렉션 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string;
  
  // 하위 호환성을 위한 snake_case 버전
  freed_memory?: number;
  freed_mb?: number;
}

/**
 * 메모리 최적화 결과 인터페이스
 */
export interface OptimizationResult {
  success: boolean;
  optimizationLevel?: OptimizationLevel | string | number;
  timestamp: number;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string;
  
  // 하위 호환성을 위한 snake_case 버전
  optimization_level?: string | number;
  freed_memory?: number;
  freed_mb?: number;
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
 * 메모리 사용량 정보 인터페이스
 */
export interface MemoryUsageInfo {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  percentUsed: number;
  timestamp: number;
  level?: MemoryUsageLevel;
}

/**
 * 메모리 설정 인터페이스
 */
export interface MemorySettings {
  autoOptimize: boolean;
  optimizationThreshold: number;
  lowMemoryMode: boolean;
  gcInterval: number;
  processingMode?: string;
  maxMemoryThreshold?: number;
}

/**
 * GPU 작업 타입 열거형
 */
export enum GpuTaskType {
  TEXT_ANALYSIS = 'TextAnalysis',
  PATTERN_DETECTION = 'PatternDetection',
  IMAGE_PROCESSING = 'ImageProcessing',
  DATA_AGGREGATION = 'DataAggregation',
  TYPING_STATISTICS = 'TypingStatistics'
}

/**
 * GPU 정보 인터페이스
 */
export interface GpuInfo {
  available: boolean;
  accelerationEnabled: boolean;
  driverVersion: string;
  deviceName: string;
  deviceType: string;
  vendor: string;
  timestamp: number;
  
  // 호환성을 위한 snake_case 버전
  acceleration_enabled?: boolean;
  driver_version?: string;
  device_name?: string;
  device_type?: string;
}

/**
 * 처리 모드 열거형
 */
export enum ProcessingMode {
  AUTO = 'auto',
  NORMAL = 'normal',
  CPU_INTENSIVE = 'cpu-intensive',
  GPU_INTENSIVE = 'gpu-intensive',
  LOW_POWER = 'low-power'
}

/**
 * 메모리 최적화 결과 인터페이스
 */
export interface MemoryOptimizationResult {
  success: boolean;
  optimizationLevel: number;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string;
  timestamp: number;
}

/**
 * 가비지 컬렉션 결과 인터페이스
 */
export interface GarbageCollectionResult {
  success: boolean;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string;
  timestamp: number;
}

/**
 * GPU 기능 인터페이스
 */
export interface GpuCapabilities {
  max_buffer_size: number;
  max_compute_workgroups: [number, number, number];
  max_invocations: number;
  supports_timestamp_query: boolean;
  supports_pipeline_statistics_query: boolean;
  compute_supported: boolean;
  shading_supported: boolean;
}

/**
 * GPU 계산 결과 인터페이스
 */
export interface GpuComputationResult<T = any> {
  success: boolean;
  task_type: string;
  duration_ms: number;
  result: T;
  error?: string;
  timestamp: number;
  gpu_info?: {
    name: string;
    type: string;
    backend: string;
  };
  used_gpu_acceleration: boolean;
}

/**
 * 네이티브 모듈 정보 인터페이스
 */
export interface NativeModuleInfo {
  name: string;
  version: string;
  description: string;
  features: {
    memory_optimization: boolean;
    gpu_acceleration: boolean;
    worker_threads: boolean;
  };
  system: {
    os: string;
    arch: string;
    cpu_cores: number;
    node_version: string;
  };
}

/**
 * 네이티브 모듈 상태 인터페이스
 */
export interface NativeModuleStatus {
  available: boolean;
  fallbackMode: boolean;
  version?: string;
  info?: NativeModuleInfo;
  features: {
    memory: boolean;
    gpu: boolean;
    worker: boolean;
  };
  timestamp: number;
}

/**
 * 태스크 결과 인터페이스
 */
export interface TaskResult {
  task_id: string;
  task_type: string;
  duration_ms: number;
  result: any;
  error?: string;
  timestamp: number;
}

/**
 * GPU 가속 응답 인터페이스
 */
export interface GpuAccelerationResponse {
  success: boolean;
  enabled: boolean;
  result: boolean;
  error?: string;
  timestamp: number;
}
