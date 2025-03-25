/**
 * 메모리 임계값 상수
 * 
 * 메모리 최적화에 사용되는 다양한 임계값을 정의합니다.
 */

// 기본 임계값 (MB)
export const DEFAULT_THRESHOLD = 100;

// 최적화 수준별 임계값 (MB)
export const LEVEL_THRESHOLDS = {
  // 최적화 수준별 메모리 임계값 (MB)
  NONE: 50,      // 50MB 미만 - 최적화 필요 없음
  LOW: 100,      // 50-100MB - 낮은 수준 최적화
  MEDIUM: 200,   // 100-200MB - 중간 수준 최적화
  HIGH: 300,     // 200-300MB - 높은 수준 최적화
  EXTREME: 400   // 300MB 이상 - 긴급 최적화
};

// 자동 최적화 수준별 임계값 (%)
export const PERCENTAGE_THRESHOLDS = {
  NONE: 50,      // 50% 미만 - 최적화 필요 없음
  LOW: 70,       // 50-70% - 낮은 수준 최적화
  MEDIUM: 80,    // 70-80% - 중간 수준 최적화
  HIGH: 90,      // 80-90% - 높은 수준 최적화
  EXTREME: 95    // 90% 이상 - 긴급 최적화
};

// GC 주기 간격 (밀리초)
export const GC_INTERVAL = {
  NORMAL: 60000,   // 일반 상황 - 1분
  LOW: 30000,      // 메모리 주의 상황 - 30초
  CRITICAL: 10000  // 메모리 위험 상황 - 10초
};

// 자동 최적화 간격 (밀리초)
export const AUTO_OPTIMIZE_INTERVAL = 60000; // 1분

// 메모리 체크 간격 (밀리초)
export const MEMORY_CHECK_INTERVAL = 15000; // 15초

// 이벤트 최적화 임계값 (밀리초)
export const EVENT_OPTIMIZATION_THRESHOLD = 300000; // 5분

// 최적화 타임아웃 (밀리초)
export const OPTIMIZATION_TIMEOUT = 5000; // 5초

// 기타 임계값
export const MAX_CACHED_RESULTS = 50; // 최대 캐시 결과 수
export const MAX_HISTORY_ENTRIES = 100; // 최대 히스토리 항목 수
export const MIN_GC_INTERVAL = 5000; // 최소 GC 요청 간격 (5초)

// 환경별 최적화 전략
export const OPTIMIZATION_STRATEGY = {
  DEVELOPMENT: 'moderate', // 개발 환경
  PRODUCTION: 'aggressive', // 프로덕션 환경
  TEST: 'minimal' // 테스트 환경
};

// 메모리 사용량 상태 레벨
export const MEMORY_LEVEL = {
  OK: 'ok',            // 정상
  WARNING: 'warning',  // 경고
  DANGER: 'danger',    // 위험
  CRITICAL: 'critical' // 심각
};

// 현재 환경에 맞는 최적화 전략 반환
export function getCurrentOptimizationStrategy(): string {
  if (process.env.NODE_ENV === 'production') {
    return OPTIMIZATION_STRATEGY.PRODUCTION;
  } else if (process.env.NODE_ENV === 'test') {
    return OPTIMIZATION_STRATEGY.TEST;
  }
  return OPTIMIZATION_STRATEGY.DEVELOPMENT;
}

/**
 * 최적화 수준에 따른 설명
 */
export const OPTIMIZATION_LEVEL_DESCRIPTIONS = {
  0: '정상 단계 (최적화 필요 없음)',
  0.5: '관찰 단계 (경량 최적화)',
  1: '주의 단계 (중간 수준 최적화)',
  2: '경고 단계 (고수준 최적화)', 
  3: '위험 단계 (최대 수준 최적화)'
};

/**
 * 메모리 임계값 상수
 */

export const MEMORY_THRESHOLDS = {
  // 최적화 임계값 (MB)
  LOW: 50,      // 가벼운 최적화 시작
  MEDIUM: 100,  // 중간 수준 최적화 시작
  HIGH: 200,    // 높은 수준 최적화 시작
  CRITICAL: 300, // 긴급 최적화 시작
  
  // 사용량 비율 임계값 (%)
  USAGE_LOW: 50,  // 낮은 사용량
  USAGE_MEDIUM: 70, // 중간 사용량
  USAGE_HIGH: 85,   // 높은 사용량
  USAGE_CRITICAL: 95, // 위험 수준 사용량
  
  // 가비지 컬렉션 관련
  MIN_GC_INTERVAL: 30000, // 최소 GC 간격 (ms)
  
  // 메모리 풀 관련
  POOL_LOW_WATER_MARK: 0.3,  // 낮은 수위 마크 (30%)
  POOL_HIGH_WATER_MARK: 0.7, // 높은 수위 마크 (70%)
  
  // 타임아웃 관련
  CLEANUP_TIMEOUT: 5000,    // 정리 작업 타임아웃 (ms)
  RECOVERY_TIMEOUT: 10000,  // 복구 작업 타임아웃 (ms)
  
  // 주기적 최적화 간격
  DEFAULT_OPTIMIZATION_INTERVAL: 60000, // 기본 1분
  IDLE_OPTIMIZATION_INTERVAL: 300000,   // 유휴 상태 5분
  
  // 기타 상수
  DEFAULT_BUFFER_SIZE: 4096, // 기본 버퍼 크기 (바이트)
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 최대 캐시 크기 (50MB)
  MAX_POOL_SIZE: 100 * 1024 * 1024  // 최대 풀 크기 (100MB)
};
