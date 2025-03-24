/**
 * 네이티브 모듈 타입 정의
 * 
 * Rust 네이티브 모듈과의 상호작용에 사용되는 타입들을 정의합니다.
 */

// 네이티브 모듈 최적화 레벨 열거형 (Rust enum과 일치)
export enum OptimizationLevel {
  Normal = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

// 네이티브 모듈 메모리 정보 인터페이스 (Rust struct와 일치)
export interface MemoryInfo {
  timestamp: number;
  heap_used: number;
  heap_total: number;
  rss: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;
  heap_limit?: number;
}

// 네이티브 모듈 GC 결과 인터페이스 (Rust struct와 일치)
export interface GCResult {
  success: boolean;
  timestamp: number;
  freed_memory?: number; // Rust에서는 snake_case 사용
  freed_mb?: number;     // Rust에서는 snake_case 사용
  error?: string;
}

// 네이티브 모듈 최적화 결과 인터페이스 (Rust struct와 일치)
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

// 네이티브 GPU 타입 (Rust enum과 일치)
export enum GPUType {
  Unknown = 0,
  Integrated = 1,
  Discrete = 2,
  Software = 3
}

// 네이티브 GPU 정보 인터페이스 (Rust struct와 일치)
export interface GPUInfo {
  name: string;
  vendor: string;
  device_type: GPUType;
  available: boolean;
  acceleration_enabled: boolean;
  renderer?: string;
  driver_info?: string;
  backend?: string;
  timestamp: number;
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

// 네이티브 모듈 상태 인터페이스
export interface NativeModuleStatus {
  available: boolean;
  fallbackMode: boolean;
  version: string | null;
  info: any;
  timestamp: number;
  error?: string;
}

// GPU 작업 유형 열거형
export enum GpuTaskType {
  MatrixMultiplication = 'matrix',
  TextAnalysis = 'text',
  ImageProcessing = 'image',
  DataAggregation = 'data',
  PatternDetection = 'pattern',
  TypingStatistics = 'typing',
  Custom = 'custom'
}

// GPU 가속 상태 인터페이스
export interface GpuAccelerationStatus {
  available: boolean;
  enabled: boolean;
  info?: GpuInfo;
}
