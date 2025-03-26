/**
 * 시스템에서 자주 사용하는 공통 타입 정의
 */

/**
 * 범용 레코드 타입 (any 대체)
 */
export type GenericRecord = Record<string, unknown>;

/**
 * 모듈 리소스 객체 타입
 */
export interface ModuleResource {
  id: string;
  name: string;
  version: string;
  loaded: boolean;
  status: 'active' | 'inactive' | 'error';
  memoryUsage?: number;
  details?: Record<string, unknown>;
}

/**
 * 메모리 정보 타입
 */
export interface DetailedMemoryInfo {
  heapUsed: number;
  heapTotal: number;
  external?: number;
  rss?: number;
  arrayBuffers?: number;
  timestamp: number;
}

/**
 * 시스템 이벤트 핸들러 타입
 */
export type EventHandlerFunction<T = unknown> = 
  (data: T, ...args: unknown[]) => void | Promise<void>;

/**
 * 워커 메시지 기본 인터페이스
 */
export interface WorkerMessageBase {
  action: string;
  requestId?: string;
  timestamp?: number;
}

/**
 * 통계 계산 요청 메시지
 */
export interface StatsCalculationMessage extends WorkerMessageBase {
  action: 'calculate-stats';
  data: {
    keyCount: number;
    typingTime: number;
    content: string;
    errors: number;
    processingMode: string;
  }
}

/**
 * 타이핑 패턴 분석 요청 메시지
 */
export interface PatternAnalysisMessage extends WorkerMessageBase {
  action: 'analyze-typing-pattern';
  data: {
    keyPresses: string[];
    timestamps: number[];
  }
}
