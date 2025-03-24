// 중앙 타입 익스포트 파일 추가

// 네이티브 모듈 타입 재내보내기
export * from './native-module';

/**
 * 앱 전체에서 사용하는 공통 타입 정의
 */

// 메모리 최적화 레벨 열거형
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

// 가비지 컬렉션 결과 인터페이스
export interface GCResult {
  success: boolean;
  timestamp: number;
  freedMemory: number;
  freedMB: number;
  error?: string;
}

// 메모리 최적화 결과 인터페이스
export interface OptimizationResult {
  success: boolean;
  level: OptimizationLevel;
  freedMemory?: number;
  freedMB?: number;
  timestamp: number;
  duration?: number;
  error?: string;
}

// 메모리 정보 인터페이스
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

// GPU 정보 인터페이스
export interface GpuInfo {
  name: string;
  vendor: string;
  driver_info: string;
  device_type: string;
  backend: string;
  available: boolean;
}

// GPU 연산 결과 인터페이스
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

// 다른 타입 정의들도 필요한 경우 여기서 재내보내기
// export * from './app-types';
// export * from './electron-types';
