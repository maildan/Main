/**
 * 메모리 최적화 임계값 상수
 */
export const MEMORY_THRESHOLDS = {
  // 기본 임계값 (MB)
  DEFAULT_THRESHOLD: 100,
  
  // 최적화 수준별 임계값 (%)
  LEVEL_THRESHOLDS: {
    NONE: 50,      // 50% 미만: 최적화 불필요
    LOW: 65,       // 50~65%: 낮은 수준 최적화
    MEDIUM: 80,    // 65~80%: 중간 수준 최적화
    HIGH: 90,      // 80~90%: 높은 수준 최적화
    EXTREME: 90    // 90% 이상: 극단적 최적화
  },
  
  // 메모리 권장 GC 간격 (밀리초)
  GC_INTERVAL: {
    NORMAL: 30000,  // 일반: 30초
    LOW: 20000,     // 낮은 메모리: 20초
    CRITICAL: 10000 // 위험 상태: 10초
  },
  
  // 자동 최적화 간격 (밀리초)
  AUTO_OPTIMIZE_INTERVAL: 60000, // 1분
  
  // 메모리 상태 체크 간격 (밀리초)
  MEMORY_CHECK_INTERVAL: 5000 // 5초
};

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
