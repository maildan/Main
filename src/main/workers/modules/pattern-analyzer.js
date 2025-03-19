/**
 * 타이핑 패턴 분석 모듈
 * 메모리 사용 최적화와 코드 관리를 위해 별도 모듈로 분리
 */

// 재사용 가능한 버퍼를 위한 객체 - 추가 메모리 풀링 설정
const reusableBuffers = {
  keyIntervals: [],
  frequencyMap: {},
  tempArray: [],
  resultArray: [], // 결과 배열 재사용을 위해 추가
  sequenceCache: {}, // 시퀀스 캐싱을 위한 객체
  analysisContext: {} // 분석 컨텍스트 재사용
};

// 메모리 관리 헬퍼 함수
const memoryHelpers = {
  /**
   * 객체 초기화 - 메모리 재활용
   * @param {Object} obj - 초기화할 객체
   */
  clearObject(obj) {
    if (!obj) return;
    Object.keys(obj).forEach(key => {
      delete obj[key];
    });
  },
  
  /**
   * 배열 초기화 - 새 배열 생성 대신 기존 배열 재사용
   * @param {Array} arr - 초기화할 배열
   */
  clearArray(arr) {
    if (!arr) return;
    arr.length = 0;
  },
  
  /**
   * 메모리 사용량 확인 (실무에서 모니터링용)
   * @returns {Object} 메모리 사용 정보
   */
  checkMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024) * 10) / 10
      };
    }
    return null;
  }
};

/**
 * 메모리 효율적인 공통 시퀀스 찾기
 * @param {Array} keys - 키 입력 배열
 * @param {Object} options - 옵션 (sequenceLength, maxResults)
 * @returns {Array} 자주 사용되는 키 시퀀스
 */
function findCommonSequences(keys, options = {}) {
  if (!keys || keys.length < 10) return [];
  
  // 기본 옵션 설정
  const sequenceLength = options.sequenceLength || 3;
  const maxResults = options.maxResults || 5;
  
  // 재사용 가능한 객체 사용
  const frequencyMap = reusableBuffers.frequencyMap;
  memoryHelpers.clearObject(frequencyMap);
  
  // 메모리 사용량 관리를 위해 입력 크기 제한
  const MAX_INPUT = 3000; 
  const keysLength = Math.min(keys.length, MAX_INPUT);
  
  // 최적화된 시퀀스 생성 - StringBuffer 패턴 적용
  const sequence = new Array(sequenceLength);
  
  // 슬라이딩 윈도우로 n-gram 빈도 계산 - 배열에서 직접 처리
  for (let i = 0; i <= keysLength - sequenceLength; i++) {
    // 배열 직접 조작으로 문자열 생성 최적화
    for (let j = 0; j < sequenceLength; j++) {
      sequence[j] = keys[i + j];
    }
    const sequenceStr = sequence.join('');
    frequencyMap[sequenceStr] = (frequencyMap[sequenceStr] || 0) + 1;
  }
  
  // 결과 생성 최적화 - 결과 배열 재사용
  const results = reusableBuffers.resultArray;
  memoryHelpers.clearArray(results);
  
  // 임계값 이상의 시퀀스만 필터링하여 성능 향상
  const MIN_FREQUENCY = 2; // 최소 2회 이상 반복된 시퀀스
  
  // 빠른 필터링 및 정렬
  for (const seq in frequencyMap) {
    if (frequencyMap[seq] >= MIN_FREQUENCY) {
      results.push({ sequence: seq, count: frequencyMap[seq] });
    }
  }
  
  // 빠른 정렬 알고리즘 활용
  results.sort((a, b) => b.count - a.count);
  
  // 상위 결과만 반환 (복사 없이 참조로 반환)
  return results.slice(0, maxResults);
}

/**
 * 타이핑 패턴 품질 분석
 * @param {Array} intervals - 키 간격 배열
 * @returns {string} 패턴 품질 (consistent, varied, irregular)
 */
function analyzePatternQuality(intervals) {
  if (!intervals || intervals.length < 10) {
    return 'unknown';
  }
  
  // 메모리 효율적인 표준편차 계산 - 웰치 알고리즘 활용
  let sum = 0;
  let sumSq = 0;
  let validIntervals = 0;
  
  // 최적화된 단일 패스 통계 계산
  for (let i = 0; i < intervals.length; i++) {
    // NaN, 음수, 비정상적으로 큰 값 체크 추가
    if (!isNaN(intervals[i]) && intervals[i] >= 0 && intervals[i] < 10000) {
      sum += intervals[i];
      sumSq += intervals[i] * intervals[i];
      validIntervals++;
    }
  }
  
  // 데이터 검증 강화
  if (validIntervals < 10) {
    return 'unknown';
  }
  
  // 수치적 안정성 개선
  const mean = sum / validIntervals;
  const variance = Math.max(0, (sumSq / validIntervals) - (mean * mean)); // 음수 방지
  const stdDev = Math.sqrt(variance);
  
  // 예외 상황 처리
  if (mean === 0 || isNaN(stdDev)) {
    return 'unknown';
  }
  
  const variationCoefficient = (stdDev / mean) * 100;
  
  // 변동 계수에 따른 패턴 품질 결정 (최적화된 경계값)
  if (variationCoefficient < 30) {
    return 'consistent'; 
  } else if (variationCoefficient < 60) {
    return 'varied';
  } else {
    return 'irregular';
  }
}

/**
 * 타이핑 패턴 분석 (CPU 집약적인 작업)
 * 메모리 사용량을 고려해 효율적으로 처리하도록 최적화
 * @param {Object} data - 타이핑 데이터 (keyPresses, timestamps)
 * @param {Object} options - 분석 옵션
 * @returns {Object} 분석 결과
 */
function analyzeTypingPattern(data, options = {}) {
  // 데이터 유효성 검증 강화
  if (!data || !data.keyPresses || !data.timestamps || 
      data.keyPresses.length === 0 || data.timestamps.length === 0) {
    throw new Error('유효하지 않은 타이핑 데이터');
  }
  
  const { keyPresses, timestamps } = data;
  
  // 샘플링 최적화 - 전체 데이터를 처리하지 않고 대표 샘플만 사용
  const MAX_SAMPLES = options.maxSamples || 1000;
  
  // 메모리 효율성을 위한 배열 직접 참조 최적화
  // 데이터 복사 없이 원본 배열의 인덱스 범위만 조정
  let startIdx = keyPresses.length > MAX_SAMPLES ? 
    keyPresses.length - MAX_SAMPLES : 0;
  
  const sampleSize = Math.min(keyPresses.length - startIdx, MAX_SAMPLES);
  
  // 재사용 가능한 배열 사용
  const keyIntervals = reusableBuffers.keyIntervals;
  memoryHelpers.clearArray(keyIntervals);
  
  // 키 간격 분석 - 메모리 할당 최소화
  if (keyPresses.length === timestamps.length) {
    // 전체 배열을 한 번에 생성하지 않고 필요한 계산만 수행
    for (let i = startIdx + 1; i < startIdx + sampleSize; i++) {
      const interval = timestamps[i] - timestamps[i-1];
      // 비정상 값 필터링 (음수 또는 비정상적으로 큰 값)
      if (interval >= 0 && interval < 10000) {
        keyIntervals.push(interval);
      }
    }
  }
  
  // 결과 객체는 자주 생성되므로 재사용 객체 활용
  const context = reusableBuffers.analysisContext;
  memoryHelpers.clearObject(context);
  
  // 분석 결과 기록
  context.avgInterval = 0;
  context.patternQuality = 'unknown';
  context.sampleSize = sampleSize;
  
  // 공통 시퀀스 분석 - 메모리 효율적 실행
  // 시퀀스 캐시 사용 (같은 입력에 대해 반복 계산 방지)
  const cacheKey = keyPresses.slice(startIdx, startIdx + Math.min(20, sampleSize)).join('');
  if (reusableBuffers.sequenceCache[cacheKey] && !options.forceRecalculate) {
    context.commonSequences = reusableBuffers.sequenceCache[cacheKey];
  } else {
    context.commonSequences = findCommonSequences(
      keyPresses.slice(startIdx, startIdx + sampleSize), 
      {
        sequenceLength: options.sequenceLength || 3,
        maxResults: options.maxResults || 5
      }
    );
    
    // 캐시 저장 (최대 20개까지만 저장)
    const cacheSize = Object.keys(reusableBuffers.sequenceCache).length;
    if (cacheSize < 20) {
      reusableBuffers.sequenceCache[cacheKey] = context.commonSequences;
    }
  }
  
  // 평균 타이핑 간격 - 최적화된 계산
  if (keyIntervals.length > 0) {
    // Kahan 합산 알고리즘으로 부동소수점 정확도 향상
    let sum = 0;
    let c = 0; // 오차 보정 변수
    for (let i = 0; i < keyIntervals.length; i++) {
      const y = keyIntervals[i] - c;
      const t = sum + y;
      c = (t - sum) - y; // 손실된 하위 비트 캡처
      sum = t;
    }
    context.avgInterval = sum / keyIntervals.length;
  }
  
  // 패턴 품질 분석
  context.patternQuality = analyzePatternQuality(keyIntervals);
  
  // 리듬 분석 추가 (선택적 실행)
  if (options.analyzeRhythm && keyIntervals.length >= 10) {
    context.rhythmPattern = analyzeTypingRhythm(keyIntervals);
  }
  
  // 메모리 사용량 모니터링 (실무 환경용)
  if (options.trackMemory) {
    context.memoryUsage = memoryHelpers.checkMemoryUsage();
  }
  
  return context;
}

/**
 * 타이핑 성능 분석 (이전의 simulateGpuTypingPatternAnalysis)
 * @param {number} keyCount - 키 입력 수
 * @param {number} typingTime - 타이핑 시간(초)
 * @returns {Object} 분석 결과
 */
function analyzeTypingPerformance(keyCount, typingTime) {
  if (!keyCount || !typingTime || typingTime <= 0 || keyCount <= 0) {
    return { 
      description: '타이핑 정보 없음', 
      efficiency: 0, 
      keysPerMinute: 0, 
      typingTime: 0,
      performanceLevel: 'none'
    };
  }
  
  // 분당 타자 수 계산 (정확한 부동소수점 계산)
  const keysPerMinute = (keyCount / typingTime) * 60;
  
  // 성능 레벨 결정 - 비즈니스 로직 최적화
  const PERFORMANCE_LEVELS = [
    { min: 400, desc: '매우 빠른 타이핑', eff: 95, level: 'expert' },
    { min: 300, desc: '빠른 타이핑', eff: 90, level: 'advanced' },
    { min: 200, desc: '능숙한 타이핑', eff: 80, level: 'proficient' },
    { min: 100, desc: '보통 타이핑', eff: 70, level: 'average' },
    { min: 50, desc: '느린 타이핑', eff: 50, level: 'slow' },
    { min: 0, desc: '매우 느린 타이핑', eff: 30, level: 'beginner' }
  ];
  
  // 최적화된 검색 - 이진 검색으로 개선 (성능 레벨이 많아질 경우 대비)
  let start = 0;
  let end = PERFORMANCE_LEVELS.length - 1;
  let result = PERFORMANCE_LEVELS[end]; // 기본값은 가장 낮은 레벨
  
  // 이진 검색 구현 (정렬된 수준에 대해)
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    if (keysPerMinute >= PERFORMANCE_LEVELS[mid].min) {
      result = PERFORMANCE_LEVELS[mid]; // 현재 레벨 저장
      end = mid - 1; // 더 높은 레벨 검색 (더 작은 인덱스)
    } else {
      start = mid + 1; // 더 낮은 레벨 검색 (더 큰 인덱스)
    }
  }
  
  return {
    description: result.desc,
    efficiency: result.eff,
    keysPerMinute: Math.round(keysPerMinute * 10) / 10, // 소수점 한자리로 반올림
    typingTime,
    performanceLevel: result.level,
    // 추가 분석 데이터
    sustainableRate: estimateSustainableRate(keysPerMinute, typingTime)
  };
}

/**
 * 지속 가능한 타이핑 속도 추정 (피로도 고려)
 * @param {number} keysPerMinute - 분당 타자 수
 * @param {number} typingTime - 타이핑 시간(초)
 * @returns {number} 지속 가능한 타이핑 속도
 */
function estimateSustainableRate(keysPerMinute, typingTime) {
  // 타이핑 시간이 길수록 피로도 증가를 고려한 지속 가능 속도 계산
  const fatigueFactor = Math.min(1, 30 / (typingTime / 60 + 5));
  return Math.round(keysPerMinute * (0.7 + (0.3 * fatigueFactor)));
}

/**
 * 타이핑 리듬 분석 - 메모리 최적화 버전
 * @param {Array} intervals - 키 간격 배열
 * @returns {string} 리듬 패턴 설명
 */
function analyzeTypingRhythm(intervals) {
  if (!intervals || intervals.length < 10) {
    return '데이터 부족';
  }
  
  // 기준치 최적화
  const CONSISTENT_THRESHOLD = 0.2;
  const GROUPED_THRESHOLD = 0.5;
  
  // 단일 패스로 모든 통계 계산 (메모리 접근 최소화)
  let sum = 0;
  let acceleratingCount = 0;
  let deceleratingCount = 0;
  let consistentCount = 0;
  let groupedCount = 0;
  let prevInterval = intervals[0];
  
  // 첫 번째 패스: 합계 계산
  for (let i = 0; i < intervals.length; i++) {
    sum += intervals[i];
  }
  
  const avgInterval = sum / intervals.length;
  
  // 두 번째 패스: 패턴 분석 (여러 카운터 동시 업데이트)
  for (let i = 1; i < intervals.length; i++) {
    const currInterval = intervals[i];
    const currRatio = currInterval / avgInterval;
    const prevRatio = prevInterval / avgInterval;
    
    // 패턴 확인 로직 - 브랜치 예측 최적화를 위해 단순한 조건문으로 구성
    consistentCount += Math.abs(currRatio - prevRatio) < CONSISTENT_THRESHOLD ? 1 : 0;
    acceleratingCount += currInterval < prevInterval * 0.8 ? 1 : 0;
    deceleratingCount += currInterval > prevInterval * 1.2 ? 1 : 0;
    groupedCount += Math.abs(currRatio - Math.round(currRatio)) < GROUPED_THRESHOLD ? 1 : 0;
    
    prevInterval = currInterval;
  }
  
  // 전체 체크 수
  const totalChecks = intervals.length - 1;
  
  // 패턴 결정 로직 최적화 - 계산 비율 미리 계산
  const consistentRatio = consistentCount / totalChecks;
  const acceleratingRatio = acceleratingCount / totalChecks;
  const deceleratingRatio = deceleratingCount / totalChecks;
  const groupedRatio = groupedCount / totalChecks;
  
  // 가중치 기반 패턴 결정 (더 정확한 판단)
  const patterns = [
    { name: '일정한 리듬', ratio: consistentRatio, threshold: 0.6 },
    { name: '가속 패턴', ratio: acceleratingRatio, threshold: 0.4 },
    { name: '감속 패턴', ratio: deceleratingRatio, threshold: 0.4 },
    { name: '묶음 단위 타이핑', ratio: groupedRatio, threshold: 0.5 }
  ];
  
  // 가장 강한 패턴 찾기
  let dominantPattern = { name: '불규칙한 리듬', score: 0 };
  
  for (const pattern of patterns) {
    // 임계값 대비 초과 비율을 점수로 계산
    const score = pattern.ratio / pattern.threshold;
    if (score > 1 && score > dominantPattern.score) {
      dominantPattern = { name: pattern.name, score };
    }
  }
  
  return dominantPattern.name;
}

/**
 * 메모리 사용 최적화 함수 - 수동 리소스 정리
 * 장시간 실행 또는 메모리 부족 상황에서 호출
 */
function optimizeMemoryUsage() {
  // 모든 재사용 버퍼 정리
  for (const key in reusableBuffers) {
    if (Array.isArray(reusableBuffers[key])) {
      reusableBuffers[key].length = 0;
    } else if (typeof reusableBuffers[key] === 'object' && reusableBuffers[key] !== null) {
      memoryHelpers.clearObject(reusableBuffers[key]);
    }
  }
  
  // 시퀀스 캐시 크기 제한
  const sequenceCache = reusableBuffers.sequenceCache;
  const cacheKeys = Object.keys(sequenceCache);
  if (cacheKeys.length > 10) {
    // 캐시가 너무 크면 일부만 유지 (가장 최근 항목 5개만 보존)
    const keysToKeep = cacheKeys.slice(-5);
    memoryHelpers.clearObject(sequenceCache);
    
    for (const key of keysToKeep) {
      sequenceCache[key] = cacheKeys[key];
    }
  }
  
  // 선택적 GC 트리거 (--expose-gc 옵션이 활성화된 경우)
  if (global && typeof global.gc === 'function') {
    global.gc();
  }
  
  return memoryHelpers.checkMemoryUsage();
}

/**
 * 메모리 사용량 임계치에 따라 최적화 수준 결정
 * @param {Object} memoryInfo - 현재 메모리 사용 정보
 * @returns {Object} 최적화 설정
 */
function getOptimizationSettings(memoryInfo) {
  if (!memoryInfo) return { 
    maxSamples: 1000, 
    cacheEnabled: true,
    maxResults: 5 
  };
  
  // 메모리 사용량에 따른 샘플링 동적 조정
  let maxSamples = 1000; // 기본값
  let cacheEnabled = true;
  let maxResults = 5;
  
  const heapUsedMB = memoryInfo.heapUsed / (1024 * 1024);
  
  // 메모리 사용량에 따른 설정 조정
  if (heapUsedMB > 250) {
    // 매우 높은 메모리 사용 - 최소 설정
    maxSamples = 200;
    cacheEnabled = false;
    maxResults = 3;
  } else if (heapUsedMB > 150) {
    // 높은 메모리 사용
    maxSamples = 500;
    cacheEnabled = true;
    maxResults = 3;
  } else if (heapUsedMB > 100) {
    // 중간 메모리 사용
    maxSamples = 750;
    cacheEnabled = true;
    maxResults = 4;
  }
  
  return { maxSamples, cacheEnabled, maxResults };
}

// 모듈 내보내기
module.exports = {
  analyzeTypingPattern,
  findCommonSequences,
  analyzePatternQuality,
  analyzeTypingRhythm,
  analyzeTypingPerformance, // 이름 변경 및 기능 개선
  estimateSustainableRate, // 새 함수 추가
  optimizeMemoryUsage,     // 메모리 최적화 함수 추가
  getOptimizationSettings, // 동적 최적화 설정 함수 추가
  reusableBuffers,
  memoryHelpers           // 메모리 관리 유틸리티 노출
};
