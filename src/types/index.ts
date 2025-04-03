/**
 * 애플리케이션에서 사용하는 공통 타입 정의
 */

import { MemoryInfo, MemoryUsageInfo } from './memory-types';
import { GpuInfo } from './gpu-types';
import { NativeModuleInfo, NativeModuleConfig } from './native-module';

// MemoryUsageInfo를 명시적으로 export
export { MemoryInfo, MemoryUsageInfo } from './memory-types';

// 기존의 타입들은 유지

// 네이티브 모듈 타입 재내보내기
export * from './native-module';

// OptimizationLevel enum을 re-export
export {
  OptimizationLevel,
  NativeOptimizationLevel,
  OPTIMIZATION_LEVEL_DESCRIPTIONS,
  APP_TO_NATIVE_LEVEL_MAP,
  NATIVE_TO_APP_LEVEL_MAP
} from './optimization-level';

/**
 * 앱 내 사용되는 타입 정의의 중앙 집중화 파일
 */

// 기본 타입 정의들 내보내기
export * from './common';
export * from './native-module';

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  heap_used: number;
  heap_total: number;
  heap_limit: number;
  heap_used_mb: number;
  percent_used: number;
  rss: number;
  rss_mb: number;
  timestamp: number;
}

/**
 * 최적화 결과 인터페이스
 * Rust 코드와 호환성을 위해 정의
 */
export interface OptimizationResult {
  // 성공 여부
  success: boolean;

  // 최적화 레벨 (Rust와 호환성)
  optimizationLevel: OptimizationLevel;

  // JS 측 호환성을 위한 별칭
  level?: OptimizationLevel;

  // 해제된 메모리 (바이트)
  memoryFreed?: number;
  freedMemory?: number;

  // 해제된 메모리 (MB)
  freedMB?: number;
  freed_mb?: number;

  // 소요 시간 (밀리초)
  duration?: number;

  // 타임스탬프 (UNIX 밀리초)
  timestamp: number;

  // 오류 메시지 (실패 시)
  error?: string;

  // 메모리 정보
  memory_before?: MemoryInfo;
  memory_after?: MemoryInfo;
}

/**
 * 가비지 컬렉션 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  timestamp: number;
  error?: string;
}

/**
 * 메모리 상태 타입
 */
export type MemoryState = 'normal' | 'warning' | 'critical';

/**
 * 코드 처리 모드 타입
 */
export type ProcessingMode = 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';

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
  useMemoryPool: boolean;
  fallbackRetryDelay: number;
  poolCleanupInterval: number;
  processingMode: ProcessingMode;
  componentSpecificSettings: {
    [componentId: string]: {
      optimizeOnUnmount: boolean;
      aggressiveCleanup: boolean;
    }
  };
}

// 사용자 설정 관련 타입 정의
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  memoryOptimization: {
    autoOptimize: boolean;
    threshold: number;
    interval: number;
  };
  performance: {
    usePrefetch: boolean;
    usePreload: boolean;
    useGpuAcceleration: boolean;
    processingMode: 'auto' | 'cpu' | 'gpu' | 'balanced';
  };
  notifications: {
    enabled: boolean;
    showMemoryWarnings: boolean;
    showOptimizationResults: boolean;
  };
}

// 앱 상태 관련 타입 정의
export interface AppState {
  isInitialized: boolean;
  lastMemoryCheck: number | null;
  memoryUsage: {
    current: number;
    threshold: number;
  };
  nativeSupport: {
    available: boolean;
    fallbackMode: boolean;
  };
  gpuAcceleration: {
    enabled: boolean;
    available: boolean;
  };
}

// 로그 항목 타입 정의
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

// 시스템 정보 타입 정의
export interface SystemInfo {
  os: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  nodeVersion: string;
}

// 성능 지표 타입 정의
export interface PerformanceMetrics {
  fps: number;
  memory: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  cpu: {
    usage: number;
    processes: number;
  };
  timestamp: number;
}

// 통계 데이터 타입 정의
export interface StatsData {
  id?: number;
  timestamp: number;
  keyCount: number;
  typingTime: number;
  windowTitle?: string;
  application?: string;
  browser?: string;
  appCategory?: string;
}

// 메모리 이벤트 타입
export enum MemoryEventType {
  PERIODIC_CHECK = 'periodic_check',
  PAGE_NAVIGATION = 'page_navigation',
  OPTIMIZATION = 'optimization',
  COMPONENT_MOUNT = 'component_mount',
  COMPONENT_UNMOUNT = 'component_unmount',
  USER_ACTION = 'user_action',
  GARBAGE_COLLECTION = 'garbage_collection',
  RESOURCE_LOADING = 'resource_loading',
  ERROR = 'error',
  WARNING = 'warning',
  CUSTOM = 'custom',
  INFO = 'info',
  GC = 'gc'
}

// 최적화 프로필 타입
export type OptimizationProfile = 'performance' | 'balanced' | 'memory-saving' | 'custom';

// 메모리 사용량 레벨 열거형
export enum MemoryUsageLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 처리 모드 타입
export type ProcessingMode = 'normal' | 'cpu-intensive' | 'gpu-intensive' | 'memory-saving' | 'auto';

// GPU 작업 타입 열거형
export enum GpuTaskType {
  MATRIX_MULTIPLICATION = 'matrix',
  TEXT_ANALYSIS = 'text',
  PATTERN_DETECTION = 'pattern',
  IMAGE_PROCESSING = 'image',
  DATA_AGGREGATION = 'data',
  TYPING_STATISTICS = 'typing',
  CUSTOM = 'custom'
}

// 시스템 상태 인터페이스
export interface SystemStatus {
  memory: {
    percentUsed: number;
    level: MemoryUsageLevel;
    heapUsedMB: number;
    rssMB: number;
  };
  processing: {
    mode: ProcessingMode;
    gpuEnabled: boolean;
  };
  optimizations: {
    count: number;
    lastTimestamp: number;
    freedMemoryMB: number;
  };
  timestamp: number;
}

/**
 * 공통 타입 정의
 */

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

  // 선택적 별칭 추가 - 코드 호환성을 위함
  heapUsed?: number;
  heapTotal?: number;
  heapLimit?: number;
  heapUsedMB?: number;
  percentUsed?: number;
  rssMB?: number;
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

// 중앙화된 타입 내보내기
export type {
  MemoryInfo,
  MemoryUsageInfo,
  GpuInfo,
  NativeModuleInfo,
  NativeModuleConfig
};

// 메모리 최적화 레벨 정의 (memory-optimizer.ts와 memory/optimization-utils.ts 간 공유)
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4,
  // 이전 코드와 호환되도록 별칭 추가
  NORMAL = 0,
  CRITICAL = 4
}

// 메모리 최적화 결과 타입
export interface OptimizationResult {
  level: OptimizationLevel;
  memoryFreed: number;
  timestamp: number;
  success: boolean;
  error?: string;
}
