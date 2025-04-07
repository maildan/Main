/**
 * 메모리 관련 타입 정의
 */

// 메모리 이벤트 타입 열거형 - 사용되지 않는 변수이므로 이름 변경
export enum _MemoryEventType {
  PERIODIC_CHECK = 'periodic_check',
  OPTIMIZATION = 'optimization',
  MANUAL_REQUEST = 'manual_request',
  ERROR = 'error'
}

/**
 * 메모리 사용량 단위 타입
 */
export type MemoryUnit = 'Bytes' | 'KB' | 'MB' | 'GB';

/**
 * 메모리 최적화 결과 인터페이스
 */
export interface MemoryOptimizationResult {
  /** 최적화 성공 여부 */
  success: boolean;

  /** 해제된 메모리 양 (바이트) */
  freedMemory: number;

  /** 해제된 메모리 양 (MB) */
  freedMB: number;

  /** 최적화 레벨 */
  level: number;

  /** 타임스탬프 */
  timestamp: number;

  /** 오류 메시지 (실패 시) */
  error?: string;
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  /** 힙 사용량 (바이트) */
  heapUsed: number;

  /** 힙 총량 (바이트) */
  heapTotal: number;

  /** RSS (바이트) - 선택 사항 */
  rss?: number;

  /** 외부 메모리 (바이트) - 선택 사항 */
  external?: number;

  /** 배열 버퍼 메모리 (바이트) - 선택 사항 */
  arrayBuffers?: number;

  /** 힙 사용량 (MB) */
  heapUsedMB: number;

  /** RSS (MB) - 선택 사항 */
  rssMB?: number;

  /** 힙 사용 비율 (%) */
  percentUsed: number;

  /** 힙 한도 (바이트) - 선택 사항 */
  heapLimit?: number;

  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 이벤트 리스너 데이터 인터페이스
 */
export interface EventListenerData {
  /** 이벤트 리스너 함수 */
  listener: EventListener;

  /** 이벤트 리스너 옵션 */
  options?: boolean | AddEventListenerOptions;

  /** 마지막 사용 시간 */
  lastUsed: number;
}

/**
 * 동적 모듈 인터페이스
 */
export interface DynamicModule {
  /** 모듈 ID */
  id: string;

  /** 모듈 로드 함수 */
  load: () => Promise<any>;

  /** 모듈 언로드 함수 */
  unload: () => void;

  /** 마지막 사용 시간 */
  lastUsed: number;
}

/**
 * 메모리 최적화 옵션 인터페이스
 */
export interface MemoryOptimizerOptions {
  /** 최적화 임계값 (%) */
  threshold?: number;

  /** 검사 간격 (ms) */
  checkInterval?: number;

  /** 경고 표시 여부 */
  showWarnings?: boolean;

  /** 자동 최적화 여부 */
  autoOptimize?: boolean;

  /** 디버그 모드 여부 */
  debug?: boolean;

  /** 네이티브 구현 사용 여부 */
  preferNative?: boolean;
}

/**
 * 제네릭 결과 인터페이스
 */
export interface OperationResult<T = any> {
  /** 성공 여부 */
  success: boolean;

  /** 결과 데이터 */
  result?: T;

  /** 오류 메시지 */
  error?: string;

  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 메모리 최적화 설정 인터페이스
 */
export interface MemoryOptimizerSettings {
  /** 자동 최적화 활성화 여부 */
  enableAutoOptimization: boolean;

  /** 최적화 발동 임계값 (퍼센트) */
  optimizationThreshold: number;

  /** 메모리 최적화 확인 간격 (밀리초) */
  checkInterval: number;

  /** 네이티브 구현 사용 여부 */
  useNativeImplementation: boolean;

  /** 디버그 로깅 활성화 여부 */
  enableDebugLogging: boolean;

  /** 메모리 풀 사용 여부 */
  useMemoryPool: boolean;

  /** 메모리 풀 정리 간격 (밀리초) */
  poolCleanupInterval: number;

  /** DOM 요소 최적화 활성화 */
  enableDomOptimization: boolean;

  /** 이벤트 리스너 최적화 활성화 */
  optimizeEventListeners: boolean;
}

/**
 * 메모리 리소스 정리 결과 인터페이스
 */
export interface CleanupResult {
  /** 성공 여부 */
  success: boolean;

  /** 정리된 항목 수 */
  cleanedItems: number;

  /** 해제된 메모리 추정치 (바이트) */
  estimatedFreedMemory?: number;

  /** 정리 유형 */
  cleanupType: string;

  /** 오류 메시지 */
  error?: string;

  /** 타임스탬프 */
  timestamp: number;
}

/**
 * 메모리 경고 수준 열거형
 */
export enum MemoryWarningLevel {
  /** 안전한 수준 */
  SAFE = 'safe',

  /** 주의 수준 */
  WARNING = 'warning',

  /** 위험 수준 */
  DANGER = 'danger',

  /** 심각한 수준 */
  CRITICAL = 'critical'
}
