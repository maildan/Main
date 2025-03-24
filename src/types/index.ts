// 중앙 타입 익스포트 파일 추가

// 네이티브 모듈 타입 재내보내기
export * from './native-module';

// 메모리 정보 인터페이스
export interface MemoryInfo {
  // 공통 필수 속성
  timestamp: number;
  
  // Rust 스타일 속성 (snake_case)
  heap_used: number;
  heap_total: number;
  heap_used_mb: number;
  rss: number;
  rss_mb: number;
  percent_used: number;
  
  // 선택적 속성
  heap_limit?: number;
  external?: number;
  
  // JavaScript 스타일 속성 (camelCase)
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  rssMB: number;
  percentUsed: number;
  heapLimit?: number;
  
  // 추가 정보
  error?: string;
  unavailable?: boolean;
}

// 앱 레벨 최적화 레벨 열거형 (0-4)
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  EXTREME = 4
}

// 네이티브 모듈과의 호환성을 위한 타입 매핑
export type OptimizationLevelType = OptimizationLevel;

// 네이티브 OptimizationLevel 값을 AppOptimizationLevel로 안전하게 변환하는 런타임 타입 가드
export function isValidOptimizationLevel(level: number): level is OptimizationLevel {
  return level >= 0 && level <= 4;
}

// 최적화 결과 인터페이스
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

// 가비지 컬렉션 결과 인터페이스
export interface GCResult {
  success: boolean;
  timestamp: number;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
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
