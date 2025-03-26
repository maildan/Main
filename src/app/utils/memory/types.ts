/**
 * 메모리 관련 타입 정의
 */

// 메모리 정보 인터페이스 - 외부 모듈 대신 직접 정의
export interface MemoryUsageInfo {
  heapUsed: number;       // 바이트 단위 힙 사용량 
  heapTotal: number;      // 바이트 단위 총 힙 크기
  heapUsedMB: number;     // MB 단위 힙 사용량
  rss: number;            // 바이트 단위 RSS
  rssMB: number;          // MB 단위 RSS
  percentUsed: number;    // 사용량 비율 (%)
  timestamp: number;      // 타임스탬프
}

// GC 결과 인터페이스 추가
export interface GCResult {
  success: boolean;       // 성공 여부
  timestamp: number;      // 실행 시간
  freedMemory?: number;   // 해제된 메모리 (바이트)
  freedMB?: number;       // 해제된 메모리 (MB)
  duration?: number;      // 실행 시간 (ms)
  error?: string;         // 오류 메시지
}

// 메모리 최적화 유틸리티 인터페이스 정의 - 기존 정의와 별도
export interface MemoryOptimizer {
  optimize(): Promise<boolean>;
  getMemoryInfo(): any;
  cleanup(): void;
}

// 확장 GC 결과 인터페이스
export interface ExtendedGCResult extends GCResult {
  heapUsedBefore?: number;  // GC 전 힙 사용량
  heapUsedAfter?: number;   // GC 후 힙 사용량
  percentReduced?: number;  // 감소 비율 (%)
}

// 최적화 레벨 열거형
export enum AppOptimizationLevel {
  NONE = 0,     // 최적화 없음
  LOW = 1,      // 낮은 수준 최적화
  MEDIUM = 2,   // 중간 수준 최적화
  HIGH = 3,     // 높은 수준 최적화
  EXTREME = 4   // 극단적 최적화
}

// 최적화 레벨 열거형
export enum OptimizationLevel {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Extreme = 4
}

// 최적화 결과 인터페이스
export interface OptimizationResult {
  success: boolean;
  timestamp: number;
  optimizationLevel?: OptimizationLevel;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  error?: string | null;
}

/**
 * 이벤트 리스너 데이터 인터페이스
 */
export interface EventListenerData {
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  lastUsed: number;
}

/**
 * 동적 모듈 인터페이스
 */
export interface DynamicModule {
  id: string;
  load: () => Promise<any>; 
  unload: () => void;
  lastUsed: number;
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
 * 제네릭 결과 인터페이스
 */
export interface OperationResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  timestamp: number;
}
