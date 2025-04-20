/**
 * 애플리케이션에서 사용하는 공통 타입 정의
 */

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

// 네이티브 모듈 타입 정의 (네임스페이스 제거)
export interface NativeModuleMemoryInfo {
    heap_used: number;
    heap_total: number;
    // ... 기타 속성
  }

export interface NativeModuleGPUInfo {
    name: string;
    vendor: string;
    // ... 기타 속성
}

/**
 * 최적화 레벨 enum - 충돌 방지를 위해 이름 변경
 */
export enum AppOptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  timestamp: number;
  heap_used: number;
  heap_total: number;
  heap_limit: number;
  rss: number;
  external?: number;
  array_buffers?: number;
  heap_used_mb: number;
  rss_mb: number;
  percent_used: number;

  // 선택적 별칭 추가 - 코드 호환성을 위함
  heapUsed?: number;
  heapTotal?: number;
  heapLimit?: number;
  heapUsedMB?: number;
  percentUsed?: number;
  rssMB?: number;
}

/**
 * 가비지 컬렉션 결과 인터페이스 (missing type 추가)
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory: number;
  freedMB: number;
  duration?: number;
  error?: string;
}

/**
 * 최적화 결과 인터페이스
 */
export interface OptimizationResult {
  success: boolean;
  optimizationLevel: OptimizationLevel | string | number;
  timestamp: number;
  freedMemory: number; // 모든 속성 일관되게 필수로 변경
  freedMB?: number;
  duration?: number;
  error?: string;

  // 하위 호환성을 위한 snake_case 버전
  optimization_level?: string | number;
  freed_memory?: number;
  freed_mb?: number;
  
  // 타입 확장: 메모리 정보 및 레벨 필드
  memory_before?: MemoryInfo;
  memory_after?: MemoryInfo;
  level?: OptimizationLevel | string | number;
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
  // 추가된 이벤트 타입들
  PERIODIC_CHECK = 'periodic_check',
  PAGE_NAVIGATION = 'page_navigation',
  COMPONENT_MOUNT = 'component_mount',
  GARBAGE_COLLECTION = 'garbage_collection',
  // 추가 누락된 이벤트 타입들
  COMPONENT_UNMOUNT = 'component_unmount',
  USER_ACTION = 'user_action',
  RESOURCE_LOADING = 'resource_loading',
  CUSTOM = 'custom'
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
  data?: unknown;
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
  // NORMAL = 0, // NONE의 별칭으로 추가 - 중복 오류 방지를 위해 주석 처리
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4,
  // CRITICAL = 4, // AGGRESSIVE의 별칭으로 추가 - 중복 오류 방지를 위해 주석 처리
  EXTREME = 5 // 추가: 극단적인 최적화 레벨
}

/**
 * GPU 작업 타입 열거형
 */
export enum GpuTaskType {
  MATRIX_MULTIPLICATION = 0,
  TEXT_ANALYSIS = 1,
  PATTERN_DETECTION = 2,
  IMAGE_PROCESSING = 3, 
  DATA_AGGREGATION = 4,
  TYPING_STATISTICS = 5,
  CUSTOM = 6
}

/**
 * 시스템 상태 인터페이스
 */
export interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  memoryUsageMB: number;
  totalMemoryMB: number;
  memoryLevel: MemoryUsageLevel;
  processingMode: ProcessingMode;
  isOptimizing: boolean;
  lastOptimizationTime?: number;
  uptime: number;
  
  // 확장 필드
  memory?: {
    percentUsed: number;
    level: MemoryUsageLevel;
    heapUsedMB: number;
    rssMB: number;
  };
  
  processing?: {
    mode: string;
    gpuEnabled: boolean;
  };
  
  optimizations?: {
    count: number;
    lastTime: number;
  };
}

/**
 * 네이티브 최적화 레벨 열거형
 */
export enum NativeOptimizationLevel {
  Normal = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

/**
 * 메모리 설정 인터페이스
 */
export interface MemorySettings {
  // 자동 최적화 설정
  enableAutoOptimization: boolean;
  // 호환성을 위한 별칭
  enableAutomaticOptimization?: boolean;
  autoOptimizationInterval: number;
  // 호환성을 위한 별칭
  optimizationInterval?: number;
  memoryThreshold: number;
  // 호환성을 위한 별칭
  optimizationThreshold?: number;
  aggressiveCleanup: boolean;
  // 호환성을 위한 별칭
  aggressiveGC?: boolean;
  
  // 컴포넌트 최적화 설정
  optimizeOnUnmount: boolean;
  releaseResourcesOnHide: boolean;
  
  // 캐시 설정
  cacheLifetime: number;
  maxCacheSize: number;
  
  // 네이티브 통합 설정
  enableNativeOptimization: boolean;
  preferNativeImplementation?: boolean;
  processingMode: ProcessingMode;
  
  // 고급 설정
  enableLogging: boolean;
  debugMode: boolean;
  
  // 추가 필드
  componentSpecificSettings?: Record<string, any>;
  enablePerformanceMetrics?: boolean;
  useMemoryPool?: boolean;
  fallbackRetryDelay?: number;
  poolCleanupInterval?: number;
  enableAutomaticFallback?: boolean;
}

/**
 * 최적화 레벨 매핑
 */
export const APP_TO_NATIVE_LEVEL_MAP = {
  [OptimizationLevel.NONE]: NativeOptimizationLevel.Normal,
  // NORMAL은 NONE과 같은 값이므로 중복 매핑 방지
  [OptimizationLevel.LOW]: NativeOptimizationLevel.Low,
  [OptimizationLevel.MEDIUM]: NativeOptimizationLevel.Medium,
  [OptimizationLevel.HIGH]: NativeOptimizationLevel.High,
  [OptimizationLevel.AGGRESSIVE]: NativeOptimizationLevel.Critical,
  // CRITICAL은 AGGRESSIVE와 같은 값이므로 중복 매핑 방지
  [OptimizationLevel.EXTREME]: NativeOptimizationLevel.Critical
} as Record<number, NativeOptimizationLevel>;

// 모든 최적화 레벨에 대해 안전하게 네이티브 레벨을 가져오는 함수
export function getNativeLevelForOptimizationLevel(level: OptimizationLevel): NativeOptimizationLevel {
  return APP_TO_NATIVE_LEVEL_MAP[level] || NativeOptimizationLevel.Medium;
}

/**
 * 네이티브 레벨을 앱 레벨로 변환하는 매핑
 */
export const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, OptimizationLevel> = {
  [NativeOptimizationLevel.Normal]: OptimizationLevel.NONE,
  [NativeOptimizationLevel.Low]: OptimizationLevel.LOW,
  [NativeOptimizationLevel.Medium]: OptimizationLevel.MEDIUM,
  [NativeOptimizationLevel.High]: OptimizationLevel.HIGH,
  [NativeOptimizationLevel.Critical]: OptimizationLevel.AGGRESSIVE
};

/**
 * GPU 계산 결과 인터페이스
 */
export interface GpuComputationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
  taskType: GpuTaskType;
}

/**
 * 작업 결과 인터페이스
 */
export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * GPU 정보 인터페이스
 */
export interface GpuInfo {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  isHardwareAccelerated: boolean;
  maxTextureSize: number;
  extensions: string[];
  capabilities: {
    webgl2: boolean;
    webgl: boolean;
    floatTextures: boolean;
    instancedArrays: boolean;
    drawBuffers: boolean;
  };
}
