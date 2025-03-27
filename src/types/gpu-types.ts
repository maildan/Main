/**
 * GPU 관련 타입 정의
 */

// GPU 작업 타입
export enum GpuTaskType {
  MatrixMultiplication = 'matrix',
  TextAnalysis = 'text',
  PatternDetection = 'pattern',
  ImageProcessing = 'image',
  DataAggregation = 'data',
  TypingStatistics = 'typing',
  Custom = 'custom'
}

// GPU 워크로드 크기 타입
export enum GpuWorkloadSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'xl'
}

// GPU 장치 정보 인터페이스
export interface GpuDeviceInfo {
  name: string;
  vendor: string;
  driver_info: string;
  device_type: string;
  backend: string;
  timestamp: number;
}

// GPU 기능 인터페이스
export interface GpuCapabilities {
  max_buffer_size: number;
  max_compute_workgroups: [number, number, number];
  max_invocations: number;
  supports_timestamp_query: boolean;
  supports_pipeline_statistics_query: boolean;
  compute_supported: boolean;
  shading_supported: boolean;
}

// GPU 계산 결과 인터페이스
export interface GpuComputationResult<T = any> {
  success: boolean;
  task_type: string;
  duration_ms: number;
  result: T;
  error: string | null;
  timestamp: number;
  gpu_info?: {
    name: string;
    type: string;
    backend: string;
  };
  used_gpu_acceleration: boolean;
}

/**
 * GPU 정보를 나타내는 인터페이스
 */
export interface GpuInfo {
  /** GPU 장치 이름 */
  deviceName: string;
  
  /** GPU 메모리 크기 (MB) */
  memorySize?: number;
  
  /** 드라이버 버전 */
  driverVersion?: string;
  
  /** 가속 가능 여부 */
  accelerationAvailable: boolean;
  
  /** 현재 사용 여부 */
  accelerationActive: boolean;
  
  /** GPU 가속 사용 가능한 기능 목록 */
  features?: string[];
  
  /** 조회 시간 */
  timestamp: number;
}

/**
 * GPU 설정을 나타내는 인터페이스
 */
export interface GpuSettings {
  /** GPU 가속 사용 여부 */
  useHardwareAcceleration: boolean;
  
  /** 처리 모드 (auto, cpu, gpu) */
  processingMode: 'auto' | 'cpu' | 'gpu';
  
  /** 가속을 적용할 작업 유형 */
  acceleratedOperations?: string[];
}
