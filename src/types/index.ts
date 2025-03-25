// 중앙 타입 익스포트 파일 추가

// 네이티브 모듈 타입 재내보내기
export * from './native-module';

/**
 * 전역 타입 정의
 */

/**
 * 공통 타입 정의
 */

// 메모리 최적화 레벨 정의
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

// 메모리 정보 인터페이스
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

// 최적화 결과 인터페이스
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

// 가비지 컬렉션 결과 인터페이스
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory?: number;
  freedMB?: number;
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

// 추가 타입들이 있다면 여기에 정의

/**
 * 머신 정보 인터페이스
 */
export interface MachineInfo {
  /** CPU 정보 */
  cpuInfo: {
    /** CPU 코어 수 */
    cores: number;
    /** 모델 이름 */
    model: string;
    /** 아키텍처 */
    arch: string;
  };
  
  /** 메모리 정보 */
  memoryInfo: {
    /** 총 메모리 (MB) */
    totalMemoryMB: number;
    /** 여유 메모리 (MB) */
    freeMemoryMB: number;
  };
  
  /** 운영체제 정보 */
  osInfo: {
    /** 운영체제 유형 */
    type: string;
    /** 운영체제 플랫폼 */
    platform: string;
    /** 운영체제 버전 */
    release: string;
  };
}

/**
 * 성능 정보 인터페이스
 */
export interface PerformanceInfo {
  /** 앱 실행 시간 (초) */
  uptime: number;
  
  /** 평균 CPU 사용률 (%) */
  avgCpuUsage: number;
  
  /** 현재 메모리 사용량 (MB) */
  memoryUsageMB: number;
  
  /** 최대 메모리 사용량 (MB) */
  peakMemoryUsageMB: number;
  
  /** 마지막 최적화 시간 */
  lastOptimizationTime?: number;
  
  /** 최적화 횟수 */
  optimizationCount: number;
}

/**
 * Electron Window Mode
 */
export type WindowMode = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';

/**
 * 처리 모드 타입
 */
export type ProcessingMode = 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';

// 메모리 이벤트 타입 열거형
export enum MemoryEventType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  GC = 'gc',
  OPTIMIZATION = 'optimization'
}

// 메모리 이벤트 인터페이스
export interface MemoryEvent {
  type: MemoryEventType;
  message: string;
  timestamp: number;
  data?: any;
}

// 메모리 최적화 옵션 인터페이스
export interface MemoryOptimizerOptions {
  threshold?: number;
  checkInterval?: number;
  showWarnings?: boolean;
  autoOptimize?: boolean;
  debug?: boolean;
  preferNative?: boolean;
}

// 메모리 최적화 유틸리티 인터페이스
export interface MemoryOptimizerUtility {
  getMemoryInfo: () => MemoryInfo | null;
  optimizeMemory: (emergency?: boolean) => Promise<GCResult>;
}

// 다른 타입 정의들도 필요한 경우 여기서 재내보내기
// export * from './app-types';
// export * from './electron-types';
