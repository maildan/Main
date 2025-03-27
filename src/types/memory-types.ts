/**
 * 메모리 관련 타입 정의
 */

/**
 * 메모리 사용량 정보를 나타내는 인터페이스
 */
export interface MemoryInfo {
  /** 현재 힙 사용량 (바이트) */
  heapUsed: number;
  
  /** 총 힙 크기 (바이트) */
  heapTotal: number;
  
  /** 실제 메모리 사용량 (바이트) */
  rss: number;
  
  /** 외부 메모리 사용량 (바이트) */
  external: number;
  
  /** 메모리 사용량 측정 시간 */
  timestamp: number;
  
  /** MB 단위의 힙 사용량 */
  heapUsedMB: number;
  
  /** MB 단위의 RSS 사용량 */
  rssMB: number;
  
  /** 힙 사용 비율 (%) */
  percentUsed: number;
}

/**
 * 메모리 설정을 나타내는 인터페이스
 */
export interface MemorySettings {
  /** 최대 메모리 사용 임계값 (MB) */
  maxMemoryThreshold: number;
  
  /** 메모리 최적화 활성화 여부 */
  enableMemoryOptimization: boolean;
  
  /** 자동 가비지 컬렉션 활성화 여부 */
  enableAutoGC: boolean;
  
  /** 가비지 컬렉션 주기 (밀리초) */
  gcInterval: number;
  
  /** 백그라운드에서 메모리 사용 최소화 여부 */
  reduceMemoryInBackground: boolean;
}
