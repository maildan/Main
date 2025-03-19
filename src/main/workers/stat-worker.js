/**
 * 타이핑 통계 계산을 위한 워커 스레드
 * Node.js worker_threads API 사용 버전
 */
const { parentPort, workerData } = require('worker_threads');
const v8 = require('v8');

// 초기 설정값 - GPU 가속 관련 설정 추가
const memoryLimit = workerData?.memoryLimit || 100 * 1024 * 1024; // 100MB
let processingMode = workerData?.initialMode || 'normal'; // 'normal', 'cpu-intensive', 'gpu-intensive'
let shouldOptimizeMemory = false;
let dataCache = null;
let lastHeapSize = 0;
let gcCounter = 0;
let gpuEnabled = workerData?.gpuEnabled || false;

// 메모리 사용량 감소를 위해 재사용 가능한 변수 및 배열
const reusableBuffers = {
  keyIntervals: [],
  frequencyMap: {},
  results: {}
};

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
      case 'change-processing-mode':
        changeProcessingMode(message?.mode || 'normal');
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

/**
 * 처리 모드 변경
 * @param {string} mode - 처리 모드 ('normal', 'cpu-intensive', 'gpu-intensive')
 */
function changeProcessingMode(mode) {
  if (['normal', 'cpu-intensive', 'gpu-intensive'].includes(mode)) {
    processingMode = mode;
    
    // 모드 변경 시 메모리 최적화
    optimizeMemory(mode !== 'normal');
    
    parentPort.postMessage({
      action: 'mode-changed',
      mode: processingMode,
      memoryInfo: getMemoryInfo()
    });
  }
}

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
    // 처리 모드에 따라 다른 계산 방식 적용
    switch (processingMode) {
      case 'normal':
        if (shouldOptimizeMemory) {
          calculateStatsLite(data); // 메모리 최적화 모드
          return;
        }
        calculateStatsNormal(data); // 일반 모드
        break;
        
      case 'cpu-intensive':
        calculateStatsCpuIntensive(data); // CPU 집약적 처리
        break;
        
      case 'gpu-intensive':
        calculateStatsGpuSimulation(data); // GPU 시뮬레이션 (실제 GPU 처리는 구현 필요)
        break;
        
      default:
        calculateStatsLite(data); // 기본은 경량 모드
    }
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: `통계 계산 중 오류: ${error.message}`,
      memoryInfo: getMemoryInfo()
    });
  }
}

/**
 * 일반 모드 통계 계산 (기존 로직)
 * @param {Object} data - 키 입력 데이터
 */
function calculateStatsNormal(data) {
  try {
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
      manualGarbageCollect();
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
 */
function calculateStatsLite(data) {
  const { keyCount, typingTime, errors } = data;
  
  // 최소한의 필수 계산만 수행
  const result = {
    wpm: typingTime > 0 ? Math.round((keyCount / typingTime) * 12) : 0, // 1초당 5글자 기준
    accuracy: calculateAccuracy(errors || 0, keyCount),
    wordCount: Math.round(keyCount / 5),
    characterCount: keyCount,
    pageCount: keyCount / 1800
  };
  
  parentPort.postMessage({
    action: 'stats-calculated',
    result,
    memoryInfo: getMemoryInfo(),
    mode: 'lite'
  });
}

/**
 * CPU 집약적 통계 계산 (메모리 사용 대신 CPU 연산 증가)
 * @param {Object} data - 키 입력 데이터
 */
function calculateStatsCpuIntensive(data) {
  try {
    const { keyCount, typingTime, content, errors } = data;
    
    // 재사용 가능한 결과 객체 초기화
    if (!reusableBuffers.results) {
      reusableBuffers.results = {};
    }
    
    const result = reusableBuffers.results;
    
    // CPU 연산을 사용하여 계산 (메모리 할당 최소화)
    result.wpm = typingTime > 0 ? Math.round((keyCount / typingTime) * 12) : 0;
    result.accuracy = calculateAccuracy(errors || 0, keyCount);
    
    // 콘텐츠가 있는 경우에만 계산
    if (content && typeof content === 'string') {
      // 스트리밍 방식으로 콘텐츠 처리 (메모리 효율)
      let wordCount = 0;
      let inWord = false;
      
      for (let i = 0; i < content.length; i++) {
        const char = content.charAt(i);
        if (/\s/.test(char)) {
          if (inWord) {
            wordCount++;
            inWord = false;
          }
        } else {
          inWord = true;
        }
      }
      
      // 마지막 단어 처리
      if (inWord) {
        wordCount++;
      }
      
      result.characterCount = content.length;
      result.wordCount = wordCount;
      result.pageCount = content.length / 1800;
    } else {
      // 콘텐츠가 없는 경우 키 입력 기반 추정
      result.characterCount = keyCount;
      result.wordCount = Math.round(keyCount / 5);
      result.pageCount = keyCount / 1800;
    }
    
    // 결과 전송
    parentPort.postMessage({
      action: 'stats-calculated',
      result: { ...result }, // 복사본 전송 (참조 공유 방지)
      memoryInfo: getMemoryInfo(),
      mode: 'cpu-intensive'
    });
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: `CPU 집약적 계산 중 오류: ${error.message}`,
      memoryInfo: getMemoryInfo()
    });
    
    // 오류 발생 시 경량 모드로 폴백
    calculateStatsLite(data);
  }
}

/**
 * GPU 처리 시뮬레이션 (실제 GPU 코드로 대체 가능)
 * @param {Object} data - 키 입력 데이터 
 */
function calculateStatsGpuSimulation(data) {
  try {
    const { keyCount, typingTime, content, errors } = data;
    
    // 실제 구현에서는 WebGPU나 WebGL을 사용할 수 있습니다
    // 아래 코드는 GPU 사용을 시뮬레이션한 것입니다
    
    // 1. 기본 통계 계산
    let wpm = 0;
    let accuracy = 100;
    let wordCount = 0;
    let characterCount = keyCount;
    let pageCount = 0;
    let charDistribution = {};
    let topChars = [];
    
    // 2. 병렬 처리 시뮬레이션 (실제로는 GPU 쉐이더 코드로 대체)
    // GPU에서는 병렬로 처리할 수 있는 계산 부분을 추출
    if (typingTime > 0) {
      // WPM 계산
      wpm = Math.round((keyCount / typingTime) * 12);
    }
    
    if (content && typeof content === 'string') {
      characterCount = content.length;
      
      // 단어 수와 문자 분포 동시에 계산 (GPU에서 병렬 처리 가능)
      const words = content.split(/\s+/);
      wordCount = words.filter(word => word.length > 0).length;
      
      // 페이지 수 계산
      pageCount = characterCount / 1800;
      
      // 정확도 계산
      if (errors !== undefined && keyCount > 0) {
        accuracy = 100 - (errors / keyCount * 100);
        accuracy = Math.max(0, Math.round(accuracy * 10) / 10);
      }
      
      // 문자 분포 분석 - 병렬 처리 시뮬레이션
      // (실제 GPU 구현에서는 여러 문자를 동시에 처리)
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        charDistribution[char] = (charDistribution[char] || 0) + 1;
      }
      
      // 상위 문자 추출
      topChars = Object.entries(charDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([char, count]) => ({ char, count, percentage: (count / characterCount * 100).toFixed(1) }));
    } else {
      // 컨텐츠가 없는 경우 기본 계산
      wordCount = Math.round(keyCount / 5);
      pageCount = keyCount / 1800;
    }
    
    // 3. 고급 통계 계산 (GPU에서 가속될 수 있는 작업)
    // 워드 클라우드 데이터 생성 (빈도수가 높은 단어) - 실제로는 병렬 처리
    let wordFrequency = {};
    let wordCloud = [];
    
    if (content && content.length > 0) {
      // 단어 빈도 분석 (실제 GPU 구현에서는 이를 병렬화)
      const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      // 성능 최적화: 처리할 단어 수 제한
      const maxWords = 1000;
      const processWords = words.slice(0, maxWords);
      
      for (const word of processWords) {
        // 기본적인 영문 기호 제거
        const cleanWord = word.replace(/[.,!?;:"'\(\)]/g, '');
        if (cleanWord && cleanWord.length >= 2) {
          wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
        }
      }
      
      // 상위 단어 추출 (최대 10개)
      wordCloud = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count, weight: count / words.length * 10 }));
    }
    
    // 타이핑 성격 분석 (키 입력 패턴) - 실제로는 GPU에서 병렬 계산
    let typingPattern = '';
    if (typingTime > 0) {
      const keysPerSecond = keyCount / typingTime;
      if (keysPerSecond > 4) {
        typingPattern = '빠른 타이핑';
      } else if (keysPerSecond > 2) {
        typingPattern = '보통 속도';
      } else {
        typingPattern = '천천히 타이핑';
      }
    }
    
    // 결과 객체 구성
    const result = {
      wpm,
      accuracy,
      wordCount,
      characterCount,
      pageCount,
      typingPattern,
      advancedStats: {
        charDistribution: topChars,
        wordCloud,
        avgWordLength: wordCount > 0 ? (characterCount / wordCount).toFixed(1) : 0,
        uniqueChars: Object.keys(charDistribution).length
      }
    };
    
    // 계산 완료 후 결과 반환
    parentPort.postMessage({
      action: 'stats-calculated',
      result,
      memoryInfo: getMemoryInfo(),
      mode: 'gpu-simulation'
    });
    
  } catch (error) {
    parentPort.postMessage({
      action: 'error',
      error: `GPU 시뮬레이션 계산 중 오류: ${error.message}`,
      memoryInfo: getMemoryInfo()
    });
    
    // 오류 발생 시 경량 모드로 폴백
    calculateStatsLite(data);
  }
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
        commonSequences: [], // 중복 쉼표 제거
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
    // 재사용 가능한 배열 사용
    if (!reusableBuffers.keyIntervals) {
      reusableBuffers.keyIntervals = [];
    }
    const keyIntervals = reusableBuffers.keyIntervals;
    keyIntervals.length = 0; // 배열 초기화
    
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
  
  // 재사용 가능한 객체 사용
  if (!reusableBuffers.frequencyMap) {
    reusableBuffers.frequencyMap = {};
  }
  const frequencyMap = reusableBuffers.frequencyMap;
  
  // 객체 초기화
  for (const key in frequencyMap) {
    if (Object.prototype.hasOwnProperty.call(frequencyMap, key)) {
      delete frequencyMap[key];
    }
  }
  
  // 메모리 사용량 관리를 위해 입력 크기 제한
  const MAX_INPUT = 5000;
  const inputText = keys.join('').slice(0, MAX_INPUT);
  
  // 시퀀스 길이 제한
  const sequenceLength = 3;
  
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
    const before = memoryInfo.heapUsed;
    
    // 2. 캐시 및 임시 데이터 정리
    if (emergency) {
      dataCache = null;
    }
    
    // 3. 강제 메모리 정리
    manualGarbageCollect();
    
    // 4. 메모리 초과 시 최적화 모드 활성화
    if (memoryInfo.heapUsed > memoryLimit || emergency) {
      shouldOptimizeMemory = true;
    } else if (memoryInfo.heapUsed < memoryLimit * 0.7) {
      shouldOptimizeMemory = false;
    }
    
    // 5. 최적화 결과 반환
    const afterMemoryInfo = getMemoryInfo();
    parentPort.postMessage({
      action: 'memory-optimized',
      before,
      after: afterMemoryInfo.heapUsed,
      reduction: before - afterMemoryInfo.heapUsed,
      emergency,
      optimizeMode: shouldOptimizeMemory
    });
    
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
  
  // 메모리 임계치 초과 시 최적화 모드 전환
  if (memoryInfo.heapUsed > memoryLimit) {
    if (!shouldOptimizeMemory) {
      shouldOptimizeMemory = true;
      parentPort.postMessage({
        action: 'memory-warning',
        message: '메모리 사용량 임계치 초과',
        memoryInfo
      });
      
      // 자동 메모리 정리
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
 * 수동 가비지 컬렉션 수행
 * --expose-gc 없이도 메모리 확보 시도
 */
function manualGarbageCollect() {
  // 대용량 객체 참조 해제
  const largeObjectKeys = Object.keys(global).filter(key => {
    const obj = global[key];
    return obj && typeof obj === 'object' && key.startsWith('__temp_');
  });
  
  largeObjectKeys.forEach(key => {
    delete global[key];
  });
  
  // 메모리 압력 생성하여 GC 유도
  try {
    const pressure = [];
    for (let i = 0; i < 10; i++) {
      pressure.push(new ArrayBuffer(1024 * 1024)); // 1MB
    }
    pressure.length = 0;
  } catch (e) {
    // 메모리 할당 실패 무시
  }
  
  // 재사용 객체 초기화
  dataCache = null;
}

/**
 * 현재 메모리 사용량 정보 반환
 * @returns {Object} 메모리 사용량 정보
 */
function getMemoryInfo() {
  try {
    // v8 힙 통계
    const v8HeapStats = v8.getHeapStatistics();
    
    // 프로세스 메모리 정보 - process.memoryUsage() 호출 추가
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
