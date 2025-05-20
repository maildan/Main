/**
 * 애플리케이션에서 사용하는 공통 타입 정의
 */

/**
 * 메모리 사용 수준 열거형
 */
export enum MemoryUsageLevel {
  NORMAL = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// 네이티브 모듈 타입은 네임스페이스로 분리
export namespace NativeModule {
  export interface MemoryInfo {
    heap_used: number;
    heap_total: number;
    // ... 기타 속성
  }

  export interface GPUInfo {
    name: string;
    vendor: string;
    // ... 기타 속성
  }
}

/**
 * 최적화 레벨 enum - 충돌 방지를 위해 이름 변경
 */
export enum AppOptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4,
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  heapUsed?: number;
  heapTotal?: number;
  rss?: number;
  percentUsed?: number;
  heapUsedMB?: number;
  rssMB?: number;
  heapLimit?: number;
  external?: number;
  timestamp: number;
}

/**
 * 가비지 컬렉션 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory?: number;
  freedMB?: number;
  duration: number;
  error?: string;
}

/**
 * 최적화 결과 인터페이스
 */
export interface OptimizationResult {
  success: boolean;
  optimizationLevel?: number;
  optimization_level?: number; // 네이티브 모듈 응답과 호환
  timestamp: number;
  freedMemory?: number;
  freed_memory?: number; // 네이티브 모듈 응답과 호환
  freedMB?: number;
  freed_mb?: number; // 네이티브 모듈 응답과 호환
  duration?: number;
  error?: string;
}

/**
 * 처리 모드 열거형
 */
export enum ProcessingMode {
  AUTO = 'auto',
  NORMAL = 'normal',
  CPU_INTENSIVE = 'cpu-intensive',
  GPU_INTENSIVE = 'gpu-intensive',
  MEMORY_SAVING = 'memory-saving'
}

/**
 * 메모리 이벤트 타입 열거형 (missing type 추가)
 */
export enum MemoryEventType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  GC = 'gc',
  OPTIMIZATION = 'optimization',
  THRESHOLD = 'threshold',
  STATE_CHANGE = 'state_change',
}

/**
 * 메모리 최적화 이벤트 인터페이스
 * level과 memoryFreed 속성 한정자 통일 (일관성)
 */
export interface MemoryOptimizationEvent {
  timestamp: number;
  level: OptimizationLevel | string | number; // 모두 필수 속성으로 통일
  memoryFreed: number; // 모두 필수 속성으로 통일
  message: string;
}

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
 * 메모리 이벤트 인터페이스
 */
export interface MemoryEvent {
  type: MemoryEventType;
  message: string;
  timestamp: number;
  data?: any;
}

/**
 * 메모리 최적화 옵션 인터페이스
 */
export interface MemoryOptimizerOptions {
  threshold?: number;
  checkInterval?: number;
  showWarnings?: boolean;
  autoOptimize?: boolean;
  debug?: boolean;
  preferNative?: boolean;
}

/**
 * 메모리 최적화 유틸리티 인터페이스
 */
export interface MemoryOptimizerUtility {
  getMemoryInfo: () => MemoryInfo | null;
  optimizeMemory: (emergency?: boolean) => Promise<GCResult>;
}

/**
 * 메모리 최적화 레벨 정의
 */
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4,
  // 이전 코드와 호환되도록 별칭 추가
  NORMAL = 0,
  CRITICAL = 4,
}

/**
 * GPU 작업 타입 열거형 (missing type 추가)
 */
export enum GpuTaskType {
  MATRIX_MULTIPLICATION = 0,
  TEXT_ANALYSIS = 1,
  PATTERN_DETECTION = 2,
  IMAGE_PROCESSING = 3,
  DATA_AGGREGATION = 4,
  TYPING_STATISTICS = 5,
  CUSTOM = 6,
}

/**
 * 시스템 상태 인터페이스
 */
export interface SystemStatus {
  memoryInfo?: {
    heapUsed?: number;
    heapTotal?: number;
    rss?: number;
    percentUsed?: number;
    heapUsedMB?: number;
    rssMB?: number;
    timestamp?: number;
  };
  cpuUsage?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  memoryUsageLevel: MemoryUsageLevel;
  processingMode: ProcessingMode;
  timestamp: number;
  optimizationCount?: number;
  lastOptimization?: number;
}

/**
 * GPU 정보 인터페이스 (missing type 추가)
 */
export interface GpuInfo {
  name: string;
  vendor: string;
  driverVersion: string;
  memoryMB?: number;
  available: boolean;
}

/**
 * GPU 계산 결과 인터페이스 (missing type 추가)
 */
export interface GpuComputationResult {
  success: boolean;
  executionTime: number;
  result?: any;
  error?: string;
}

/**
 * 작업 결과 인터페이스 (missing type 추가)
 */
export interface TaskResult {
  success: boolean;
  timestamp: number;
  executionTime: number;
  taskType: string;
  error?: string;
  data?: any;
}

/**
 * 메모리 설정 인터페이스
 */
export interface MemorySettings {
  preferNativeImplementation: boolean;
  enableAutomaticFallback: boolean;
  enableAutomaticOptimization: boolean;
  optimizationThreshold: number;
  optimizationInterval: number;
  aggressiveGC: boolean;
  enableLogging: boolean;
  enablePerformanceMetrics: boolean;
  useHardwareAcceleration: boolean;
  useMemoryPool: boolean;
  fallbackRetryDelay: number;
  poolCleanupInterval: number;
  processingMode: string;
  componentSpecificSettings: Record<string, any>;
}
