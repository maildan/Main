/**
 * 네이티브 모듈 타입 정의
 * 
 * Rust 네이티브 모듈과의 상호작용에 사용되는 타입들을 정의합니다.
 */

declare module '@/types/native-module' {
  // 네이티브 모듈의 최적화 레벨 (Rust 라이브러리의 enum 대응)
  export enum OptimizationLevel {
    Normal = 0,
    Low = 1,
    Medium = 2, 
    High = 3,
    Critical = 4
  }

  // Rust 라이브러리의 MemoryInfo 구조체 대응
  export interface MemoryInfo {
    timestamp: number;
    heap_used: number;
    heap_total: number;
    heap_limit?: number;
    rss?: number;
    external?: number;
    array_buffers?: number;
    heap_used_mb: number;
    rss_mb?: number;
    percent_used: number;
  }

  // Rust 라이브러리의 OptimizationResult 구조체 대응
  export interface OptimizationResult {
    success: boolean;
    optimization_level: number;
    memory_before?: MemoryInfo;
    memory_after?: MemoryInfo;
    freed_memory?: number;
    freed_mb?: number;
    duration?: number;
    timestamp: number;
    error?: string;
  }

  // Rust 라이브러리의 GCResult 구조체 대응
  export interface GCResult {
    success: boolean;
    timestamp: number;
    freed_memory?: number;
    freed_mb?: number;
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
    acceleration_enabled: boolean;
    settings_enabled: boolean;
    processing_mode: string;
    timestamp: number;
    available: boolean;
    accelerationEnabled: boolean;
    deviceName?: string;
    deviceId?: string;
    driverVersion?: string;
    vendorId?: string;
    vendorName?: string;
    deviceType?: string;
    memorySize?: number;
    capabilities?: string[];
    apiVersion?: string;
  }

  // GPU 계산 결과 인터페이스
  export interface GpuComputationResult {
    success: boolean;
    task_type: string;
    duration_ms: number;
    result: any;
    error?: string;
    timestamp: number;
  }

  // 태스크 결과 인터페이스
  export interface TaskResult {
    task_id: string;
    task_type: string;
    duration_ms: number;
    result: any;
    error?: string;
    timestamp: number;
  }

  export interface GpuAccelerationResponse {
    success: boolean;
    enabled: boolean;
    result: boolean;
    error?: string;
    timestamp: number;
  }
}
