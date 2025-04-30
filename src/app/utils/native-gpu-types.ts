/**
 * GPU 네이티브 모듈 타입 정의
 */

export interface GpuDeviceInfo {
  vendor: string;
  device: string;
  driver: string;
  device_type: string;
  backend: string;
  timestamp: number;
}

export interface GpuCapabilities {
  compute_supported: boolean;
  shading_supported: boolean;
  max_compute_size: number;
  max_memory_size: number;
  device_name: string;
  device_type: string;
  backend_type: string;
  timestamp: number;
}

export enum WorkloadSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  Custom = 'custom'
}

export interface GpuComputationOptions {
  workloadSize?: WorkloadSize;
  useAcceleration?: boolean;
  timeout?: number;
}

export interface GpuComputationResult {
  success: boolean;
  used_gpu_acceleration: boolean;
  computation_time_ms: number;
  result: any;
  workload_size: string;
  gpu_info?: {
    name: string;
    type: string;
    backend: string;
  };
  timestamp: number;
}

export interface PatternDetectionResult extends GpuComputationResult {
  key_count: number;
  average_typing_speed_ms: number;
  typing_speed_variance: number;
  typing_pattern: string;
  consistency_score: number;
}

export interface MatrixMultiplicationResult extends GpuComputationResult {
  dimensions: number;
}

export interface ArrayProcessingResult extends GpuComputationResult {
  items_processed: number;
}

export interface DataAnalysisResult extends GpuComputationResult {
  complexity: string;
  analysis_type: string;
}
