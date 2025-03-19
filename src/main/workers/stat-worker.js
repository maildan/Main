/**
 * 타이핑 통계 계산을 위한 워커 스레드
 * Node.js worker_threads API 사용 버전으로 변경됨
 */
const { parentPort, workerData } = require('worker_threads');
const v8 = require('v8');

// 전역 캐시 및 메모리 효율성 변수
const memoryLimit = 100 * 1024 * 1024; // 100MB
let shouldOptimizeMemory = false;
let dataCache = null;
let lastHeapSize = 0;
let gcCounter = 0;

// worker_threads 모듈의 parentPort를 통해 메시지 수신
parentPort.on('message', (message) => {
  try {
    const { action, data } = message;
    
    // 메모리 사용량을 주기적으로 체크
    checkMemoryUsage();
    
    switch (action) {
      case 'calculate-stats':
        calculateStats(data);
        break;
      case 'analyze-typing-pattern':
        analyzeTypingPattern(data);
        break;
      case 'optimize-memory':
        optimizeMemory(data?.emergency || false);
        break;
      default:
        parentPort.postMessage({ 
          error: '알 수 없는 액션',
          memoryInfo: getMemoryInfo() 
        });
    }
  } catch (error) {
    parentPort.postMessage({ 
      action: 'error', 
      error: error.message,
      stack: error.stack,
      memoryInfo: getMemoryInfo()
    });
  }
});

// 초기 로드 시 메모리 정보 전송
parentPort.postMessage({ 
  action: 'worker-ready', 
  memoryInfo: getMemoryInfo() 
});

/**
 * 타이핑 통계 계산
 * @param {Object} data - 키 입력 데이터
 */
function calculateStats(data) {
  try {
    // 메모리 최적화 모드에서는 경량화된 계산 수행
    if (shouldOptimizeMemory) {
      const result = calculateStatsLite(data);
      parentPort.postMessage({
        action: 'stats-calculated',
        result,
        memoryInfo: getMemoryInfo()
      });
      return;
    }
    
    const { keyCount, typingTime, content, errors } = data;
    
    // 데이터 유효성 검증 추가
    if (keyCount === undefined || typingTime === undefined) {
      throw new Error('필수 데이터 누락: keyCount 또는 typingTime');
    }
    
    // CPU 집약적인 계산을 위한 데이터 캐싱
    if (!dataCache || dataCache.keyCount !== keyCount) {
      dataCache = {
        keyCount,
        typingTime,
        content: content || '',
        errors: errors || 0,
        calculatedAt: Date.now()
      };
    } else if (Date.now() - dataCache.calculatedAt < 5000) {
      // 5초 이내 동일한 keyCount에 대한 중복 계산 방지
      parentPort.postMessage({
        action: 'stats-calculated',
        result: {
          wpm: calculateWPM(keyCount, typingTime),
          accuracy: calculateAccuracy(errors || 0, keyCount),
          // 캐시된 데이터 사용
          characterCount: dataCache.characterCount || (content ? content.length : 0),
          wordCount: dataCache.wordCount || (content ? estimateWordCount(content) : 0),
          pageCount: dataCache.pageCount || (content ? content.length / 1800 : 0)
        },
        cached: true,
        memoryInfo: getMemoryInfo()
      });
      return;
    }
    
    // CPU 집약적인 계산 수행
    const characterCount = content ? content.length : 0;
    const wordCount = content ? estimateWordCount(content) : 0;
    const pageCount = characterCount / 1800; // 약 1800자 = 1페이지로 가정
    
    // 캐시 업데이트
    if (dataCache) {
      dataCache.characterCount = characterCount;
      dataCache.wordCount = wordCount;
      dataCache.pageCount = pageCount;
    }
    
    const result = {
      wpm: calculateWPM(keyCount, typingTime),
      accuracy: calculateAccuracy(errors || 0, keyCount),
      characterCount,
      wordCount,
      pageCount
    };
    
    // 결과를 메인 스레드로 전송
    parentPort.postMessage({
      action: 'stats-calculated',
      result,
      memoryInfo: getMemoryInfo()
    });
    
    // 주기적으로 메모리 정리
    if (++gcCounter % 10 === 0) {
      optimizeMemory(false);
    }
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: error.message,
      memoryInfo: getMemoryInfo()
    });
  }
}

/**
 * 경량화된 통계 계산 (메모리 최적화 모드)
 * @param {Object} data - 키 입력 데이터
 * @returns {Object} 계산된 기본 통계
 */
function calculateStatsLite(data) {
  const { keyCount, typingTime, errors } = data;
  
  // 최소한의 필수 계산만 수행
  return {
    wpm: typingTime > 0 ? Math.round((keyCount / typingTime) * 12) : 0, // 1초당 5글자 기준
    accuracy: calculateAccuracy(errors || 0, keyCount),
    wordCount: Math.round(keyCount / 5),
    characterCount: keyCount,
    pageCount: keyCount / 1800
  };
}

/**
 * 타이핑 패턴 분석 (CPU 집약적인 작업)
 * 메모리 사용량을 고려해 효율적으로 처리하도록 최적화
 * @param {Object} data - 타이핑 데이터
 */
function analyzeTypingPattern(data) {
  try {
    // 메모리 최적화 모드에서는 간소화된 분석 수행
    if (shouldOptimizeMemory) {
      const result = {
        avgInterval: 0,
        commonSequences: [],
        patternQuality: 'unknown'
      };
      
      parentPort.postMessage({
        action: 'pattern-analyzed',
        result,
        lite: true,
        memoryInfo: getMemoryInfo()
      });
      return;
    }
    
    // 데이터 유효성 검증
    if (!data || !data.keyPresses || !data.timestamps) {
      throw new Error('유효하지 않은 타이핑 데이터');
    }
    
    const { keyPresses, timestamps } = data;
    
    // 입력 데이터 크기 제한 (메모리 효율성 향상)
    const MAX_SAMPLES = 1000;
    const sampleSize = Math.min(keyPresses.length, MAX_SAMPLES);
    
    const sampledKeyPresses = keyPresses.length > MAX_SAMPLES ? 
      keyPresses.slice(keyPresses.length - MAX_SAMPLES) :
      keyPresses;
    
    const sampledTimestamps = timestamps.length > MAX_SAMPLES ?
      timestamps.slice(timestamps.length - MAX_SAMPLES) :
      timestamps;
    
    // 패턴 분석을 위한 계산
    const patterns = {};
    const keyIntervals = [];
    
    // 키 간격 분석 - 메모리 효율적 방법
    if (sampledKeyPresses && sampledTimestamps && 
        sampledKeyPresses.length === sampledTimestamps.length) {
      // 전체 배열을 한 번에 생성하지 않고 필요한 계산만 수행
      for (let i = 1; i < sampledTimestamps.length; i++) {
        keyIntervals.push(sampledTimestamps[i] - sampledTimestamps[i-1]);
      }
    }
    
    // 메모리 효율적으로 공통 시퀀스 찾기 
    const commonSequences = findCommonSequencesEfficient(sampledKeyPresses);
    
    // 평균 타이핑 간격
    let avgInterval = 0;
    if (keyIntervals.length > 0) {
      // 메모리 효율적인 평균 계산
      let sum = 0;
      for (let i = 0; i < keyIntervals.length; i++) {
        sum += keyIntervals[i];
      }
      avgInterval = sum / keyIntervals.length;
    }
    
    // 결과 반환
    parentPort.postMessage({
      action: 'pattern-analyzed',
      result: {
        avgInterval,
        commonSequences,
        patternQuality: analyzePatternQuality(keyIntervals)
      },
      memoryInfo: getMemoryInfo(),
      sampleSize
    });
    
    // 분석 후 메모리 정리
    keyIntervals.length = 0;
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: error.message,
      memoryInfo: getMemoryInfo()
    });
  }
}

/**
 * 메모리 효율적인 공통 시퀀스 찾기
 * @param {Array} keys - 키 입력 배열
 * @returns {Array} 자주 사용되는 키 시퀀스 (최대 5개)
 */
function findCommonSequencesEfficient(keys) {
  if (!keys || keys.length < 10) return [];
  
  // 메모리 사용량 관리를 위해 입력 크기 제한
  const MAX_INPUT = 5000;
  const inputText = keys.join('').slice(0, MAX_INPUT);
  
  // 시퀀스 길이 제한
  const sequenceLength = 3;
  const frequencyMap = {};
  
  // 슬라이딩 윈도우로 n-gram 빈도 계산
  for (let i = 0; i <= inputText.length - sequenceLength; i++) {
    const sequence = inputText.substring(i, i + sequenceLength);
    frequencyMap[sequence] = (frequencyMap[sequence] || 0) + 1;
  }
  
  // 빈도 기준으로 정렬 후 상위 결과만 반환
  return Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sequence]) => sequence);
}

/**
 * 분당 단어 수(WPM) 계산
 * @param {number} keyCount - 키 입력 수
 * @param {number} seconds - 경과 시간(초)
 * @returns {number} WPM
 */
function calculateWPM(keyCount, seconds) {
  // 일반적으로 5개의 키 입력을 1단어로 간주
  const words = keyCount / 5;
  const minutes = seconds / 60;
  
  return minutes > 0 ? Math.round(words / minutes) : 0;
}

/**
 * 정확도 계산
 * @param {number} errors - 오타 수
 * @param {number} totalKeys - 전체 키 입력 수
 * @returns {number} 정확도(%)
 */
function calculateAccuracy(errors, totalKeys) {
  if (totalKeys === 0) return 100;
  const accuracy = 100 - (errors / totalKeys * 100);
  return Math.max(0, Math.round(accuracy * 10) / 10); // 소수점 첫째 자리까지
}

/**
 * 단어 수 추정
 * @param {string} text - 텍스트
 * @returns {number} 추정 단어 수
 */
function estimateWordCount(text) {
  // 간단한 추정: 공백으로 분리하여 계산
  return text.split(/\s+/).filter(word => word.length > 0).length;
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
  
  // 메모리 효율적인 표준편차 계산
  let sum = 0;
  let sumSq = 0;
  
  for (let i = 0; i < intervals.length; i++) {
    sum += intervals[i];
    sumSq += intervals[i] * intervals[i];
  }
  
  const mean = sum / intervals.length;
  const variance = (sumSq / intervals.length) - (mean * mean);
  const stdDev = Math.sqrt(variance);
  
  const variationCoefficient = (stdDev / mean) * 100;
  
  // 변동 계수에 따른 패턴 품질 결정
  if (variationCoefficient < 30) {
    return 'consistent'; // 일정한 패턴
  } else if (variationCoefficient < 60) {
    return 'varied'; // 다양한 패턴
  } else {
    return 'irregular'; // 불규칙한 패턴
  }
}

/**
 * 메모리 최적화 실행
 * @param {boolean} emergency - 긴급 최적화 모드 여부
 */
function optimizeMemory(emergency = false) {
  try {
    // 1. 현재 메모리 상태 확인
    const memoryInfo = getMemoryInfo();
    
    // 2. 캐시 및 임시 데이터 정리
    dataCache = null;
    global.gc && global.gc();
    
    // 3. 메모리 초과 시 최적화 모드 활성화
    if (memoryInfo.heapUsed > memoryLimit || emergency) {
      shouldOptimizeMemory = true;
      
      // 4. 긴급 메모리 확보 조치
      if (emergency) {
        // 모든 참조 정리
        dataCache = null;
      }
    } else {
      shouldOptimizeMemory = false;
    }
    
    // 5. 최적화 결과 반환
    parentPort.postMessage({
      action: 'memory-optimized',
      before: lastHeapSize,
      after: memoryInfo.heapUsed,
      reduction: lastHeapSize - memoryInfo.heapUsed,
      emergency,
      optimizeMode: shouldOptimizeMemory
    });
    
    // 현재 메모리 사용량 저장
    lastHeapSize = memoryInfo.heapUsed;
    
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: `메모리 최적화 중 오류: ${error.message}`,
      stack: error.stack
    });
  }
}

/**
 * 메모리 사용량 확인
 */
function checkMemoryUsage() {
  const memoryInfo = getMemoryInfo();
  lastHeapSize = memoryInfo.heapUsed;
  
  // 메모리 임계치 초과 시 최적화 모드 전환
  if (memoryInfo.heapUsed > memoryLimit) {
    if (!shouldOptimizeMemory) {
      shouldOptimizeMemory = true;
      parentPort.postMessage({
        action: 'memory-warning',
        message: '메모리 사용량 임계치 초과',
        memoryInfo
      });
      
      // 자동 GC 수행
      optimizeMemory(true);
    }
  } else if (shouldOptimizeMemory && memoryInfo.heapUsed < memoryLimit * 0.7) {
    // 메모리가 충분히 확보되면 최적화 모드 비활성화
    shouldOptimizeMemory = false;
    parentPort.postMessage({
      action: 'memory-normal',
      message: '메모리 사용량 정상 수준',
      memoryInfo
    });
  }
}

/**
 * 현재 메모리 사용량 정보 반환
 * @returns {Object} 메모리 사용량 정보
 */
function getMemoryInfo() {
  try {
    // v8 힙 통계
    const v8HeapStats = v8.getHeapStatistics();
    
    // 프로세스 메모리 정보
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 10) / 10,
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024) * 10) / 10,
      percentUsed: Math.round((memoryUsage.heapUsed / v8HeapStats.heap_size_limit) * 100),
      v8HeapSizeLimit: v8HeapStats.heap_size_limit
    };
  } catch (error) {
    return {
      timestamp: Date.now(),
      error: error.message
    };
  }
}

// 워커 초기화 완료 메시지
parentPort.postMessage({ 
  action: 'initialized',
  timestamp: Date.now()
});
