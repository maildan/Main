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

// GPU 시뮬레이션을 위한 추가 변수
let gpuSimulationReady = false;
const GPU_WORKLOAD_SIZES = {
  SMALL: 'small',    // 최소한의 계산만 (저성능 기기용)
  MEDIUM: 'medium',  // 적절한 수준의 계산 (일반 기기용)
  LARGE: 'large'     // 대량의 계산 (고성능 기기용)
};
let gpuWorkloadSize = workerData?.gpuWorkloadSize || GPU_WORKLOAD_SIZES.MEDIUM;

// 메모리 사용량 감소를 위해 재사용 가능한 변수 및 배열
const reusableBuffers = {
  keyIntervals: [],
  frequencyMap: {},
  results: {},
  matrixCache: {} // GPU 시뮬레이션용 행렬 캐시 추가
};

// GPU 시뮬레이션 초기화 (실제 GPU 초기화를 시뮬레이션)
function initGpuSimulation() {
  if (gpuSimulationReady) return true;
  
  try {
    console.log('GPU 시뮬레이션 초기화 중...');
    
    // GPU 메모리 할당 시뮬레이션
    reusableBuffers.matrixCache = {
      small: new Float32Array(1024),    // 4KB
      medium: new Float32Array(4096),   // 16KB
      large: new Float32Array(16384)    // 64KB
    };
    
    // GPU 컨텍스트 초기화 시뮬레이션
    gpuSimulationReady = true;
    
    console.log('GPU 시뮬레이션 초기화 완료');
    return true;
  } catch (error) {
    console.error('GPU 시뮬레이션 초기화 실패:', error);
    gpuSimulationReady = false;
    return false;
  }
}

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
      case 'initialize-gpu':
        // GPU 초기화 메시지 처리 추가
        initGpuSimulation();
        parentPort.postMessage({
          action: 'gpu-initialized',
          success: gpuSimulationReady,
          timestamp: Date.now()
        });
        break;
      case 'set-gpu-workload':
        // GPU 워크로드 크기 설정 메시지 처리 추가
        if (Object.values(GPU_WORKLOAD_SIZES).includes(message.size)) {
          gpuWorkloadSize = message.size;
          parentPort.postMessage({
            action: 'gpu-workload-set',
            size: gpuWorkloadSize
          });
        }
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
    if (!gpuSimulationReady) {
      if (!initGpuSimulation()) {
        // GPU 초기화 실패 시 CPU 집약적 모드로 폴백
        console.log('GPU 시뮬레이션 초기화 실패, CPU 집약적 모드로 전환');
        calculateStatsCpuIntensive(data);
        return;
      }
    }
    
    console.log(`GPU 시뮬레이션 시작 (워크로드: ${gpuWorkloadSize})`);
    
    // 시뮬레이션된 GPU 계산 시작 시간
    const gpuStartTime = Date.now();
    
    // 1. 기본 통계 계산 (GPU에서 병렬 처리 시뮬레이션)
    let wpm = 0;
    let accuracy = 100;
    let wordCount = 0;
    let characterCount = keyCount;
    let pageCount = 0;
    let charDistribution = {};
    let topChars = [];
    let wordFrequency = {};
    let wordCloud = [];
    
    // 2. GPU 병렬 처리 시뮬레이션
    // 실제 GPU 코드는 WebGPU 또는 WebGL을 사용하게 되겠지만,
    // 여기서는 병렬 처리의 개념을 시뮬레이션합니다.
    
    // GPU 계산을 위한 워크로드 크기 결정
    const workloadParams = getGpuWorkloadParams(gpuWorkloadSize, content);
    
    // 타이핑 속도 계산 (병렬화 가능한 작업)
    if (typingTime > 0) {
      // GPU에서는 여러 계산을 동시에 처리할 수 있음 시뮬레이션
      wpm = Math.round((keyCount / typingTime) * 60);
      
      // GPU에서 정확도 계산 시뮬레이션
      if (data && data.errors !== undefined) {
        const totalKeystrokes = keyCount + (data.errors || 0);
        accuracy = totalKeystrokes > 0 ? 
          Math.round((keyCount / totalKeystrokes) * 100) : 100;
      }
    }

    // 3. GPU를 활용한 텍스트 분석 시뮬레이션
    const { content, keyCount, typingTime } = data;
    
    // 메모리 효율적인 워드 카운팅 - 큰 문자열을 작은 청크로 분할하여 처리
    if (content && content.length > 0) {
      // 단어 수 계산
      wordCount = simulateGpuWordCount(content);
      
      // 문자 수와 페이지 수 계산
      characterCount = content.length;
      pageCount = characterCount / 1800; // 일반적인 페이지당 문자 수
      
      // 메모리 사용량이 임계값 이하인 경우에만 추가 분석 수행
      const memoryInfo = getMemoryInfo();
      const memoryUsageMB = memoryInfo.heapUsed / (1024 * 1024);
      
      if (memoryUsageMB < memoryLimit / (1024 * 1024) * 0.7) { // 70% 임계점
        // 고급 텍스트 분석 시뮬레이션 - GPU 병렬 처리 활용
        charDistribution = simulateGpuCharDistribution(content);
        
        // 가장 자주 사용된 문자 상위 10개 추출
        topChars = Object.entries(charDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([char, count]) => ({ char, count }));
        
        // 단어 빈도 분석 - 메모리 효율적인 방식으로
        const wordFrequencyResult = simulateGpuSortWords(
          simulateGpuWordFrequency(content),
          wordCount
        );
        
        // 워드 클라우드 데이터 제한 (최대 50개 단어로 제한)
        wordCloud = wordFrequencyResult.slice(0, 50);
      }
    }
    
    // 4. 타이핑 패턴 분석 - GPU 가속 시뮬레이션
    let typingPattern = 'normal';
    if (data.intervals && data.intervals.length > 0) {
      typingPattern = simulateGpuTypingPatternAnalysis(keyCount, typingTime);
    }
    
    // 5. 복잡성 점수 계산 - GPU 병렬 처리 시뮬레이션
    let complexityScore = 0;
    if (content && content.length > 50) {
      complexityScore = simulateGpuTextComplexity(content);
    }
    
    // 6. 메모리 사용량 모니터링 및 최적화
    const memUsage = getMemoryInfo();
    const gpuEndTime = Date.now();
    const gpuProcessingTime = gpuEndTime - gpuStartTime;
    
    console.log(`GPU 시뮬레이션 완료: ${gpuProcessingTime}ms 소요, 메모리 사용: ${Math.round(memUsage.heapUsedMB)}MB`);
    
    // 결과 반환
    self.postMessage({
      action: 'stats-calculated',
      result: {
        wordCount,
        characterCount,
        pageCount,
        wpm,
        accuracy,
        topChars: topChars.length > 0 ? topChars : null,
        typingPattern,
        complexityScore,
        processedWithGpu: true,
        processingTime: gpuProcessingTime
      },
      memoryInfo: memUsage
    });
    
    // 메모리 점유율이 높으면 GC 요청
    if (memUsage.heapUsed > memoryLimit * 0.8) {
      optimizeMemory(false);
    }
    
  } catch (error) {
    console.error('GPU 시뮬레이션 중 오류 발생:', error);
    
    // 오류 발생 시 CPU 모드로 폴백
    calculateStatsCpuIntensive(data);
    
    // 오류 보고
    self.postMessage({
      action: 'error',
      error: `GPU 시뮬레이션 오류: ${error.message}`,
      memoryInfo: getMemoryInfo()
    });
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

// GPU 시뮬레이션을 위한 헬퍼 함수들

/**
 * 워크로드 크기에 따른 GPU 처리 파라미터 반환
 * @param {string} size - 워크로드 크기 (small, medium, large)
 * @param {string} content - 분석할 콘텐츠
 * @returns {Object} GPU 워크로드 파라미터
 */
function getGpuWorkloadParams(size, content) {
  const contentLength = content ? content.length : 0;
  
  switch (size) {
    case GPU_WORKLOAD_SIZES.SMALL:
      return {
        maxWords: 500,
        nGramSize: 2,
        executionTime: 50,  // 밀리초
        performAdvancedAnalysis: false,
        parallelThreads: 2
      };
    case GPU_WORKLOAD_SIZES.LARGE:
      return {
        maxWords: Math.min(5000, contentLength),
        nGramSize: 4,
        executionTime: 200, // 밀리초
        performAdvancedAnalysis: true,
        parallelThreads: 8
      };
    case GPU_WORKLOAD_SIZES.MEDIUM:
    default:
      return {
        maxWords: Math.min(1000, contentLength),
        nGramSize: 3,
        executionTime: 100, // 밀리초
        performAdvancedAnalysis: contentLength > 1000,
        parallelThreads: 4
      };
  }
}

/**
 * GPU에서 문자 분포 계산 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @param {Object} charDistribution - 결과를 저장할 객체
 */
function simulateGpuCharDistribution(content, charDistribution) {
  // 실제 GPU에서는 문자들을 병렬로 처리하지만 여기서는 시뮬레이션
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    charDistribution[char] = (charDistribution[char] || 0) + 1;
  }
}

/**
 * GPU에서 단어 빈도 계산 시뮬레이션
 * @param {string[]} words - 분석할 단어들
 * @param {Object} wordFrequency - 결과를 저장할 객체
 */
function simulateGpuWordFrequency(words, wordFrequency) {
  // 단어 처리를 병렬화하는 시뮬레이션
  for (const word of words) {
    // 기본적인 영문 기호 제거 및 소문자화
    const cleanWord = word.toLowerCase().replace(/[.,!?;:"'()\[\]{}]/g, '');
    if (cleanWord && cleanWord.length >= 2) {
      wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
    }
  }
}

/**
 * GPU에서 문자 빈도 정렬 시뮬레이션
 * @param {Object} charDistribution - 문자 빈도 객체
 * @returns {Array} 상위 문자 배열
 */
function simulateGpuSortChars(charDistribution) {
  // GPU에서 병렬 정렬을 시뮬레이션
  return Object.entries(charDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([char, count]) => ({ 
      char, 
      count, 
      percentage: (count / Object.values(charDistribution).reduce((a, b) => a + b, 0) * 100).toFixed(1) 
    }));
}

/**
 * GPU에서 단어 빈도 정렬 시뮬레이션
 * @param {Object} wordFrequency - 단어 빈도 객체
 * @param {number} totalWords - 전체 단어 수
 * @returns {Array} 상위 단어 배열
 */
function simulateGpuSortWords(wordFrequency, totalWords) {
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ 
      word, 
      count, 
      weight: count / totalWords * 10 
    }));
}

/**
 * GPU에서 타이핑 패턴 분석 시뮬레이션
 * @param {number} keyCount - 키 입력 수
 * @param {number} typingTime - 타이핑 시간(초)
 * @returns {string} 타이핑 패턴 설명
 */
function simulateGpuTypingPatternAnalysis(keyCount, typingTime) {
  if (typingTime <= 0) return '데이터 없음';
  
  const keysPerSecond = keyCount / typingTime;
  
  if (keysPerSecond > 5) {
    return '매우 빠른 타이핑';
  } else if (keysPerSecond > 4) {
    return '빠른 타이핑';
  } else if (keysPerSecond > 3) {
    return '보통 속도';
  } else if (keysPerSecond > 2) {
    return '느린 타이핑';
  } else {
    return '매우 느린 타이핑';
  }
}

/**
 * 텍스트 복잡성 점수 계산 시뮬레이션 (GPU 병렬 처리)
 * @param {string} content - 분석할 텍스트
 * @returns {number} 복잡성 점수 (0-100)
 */
function simulateGpuTextComplexity(content) {
  if (!content || content.length === 0) return 0;
  
  // 텍스트 복잡성 요소들
  const avgWordLength = content.split(/\s+/).filter(w => w.length > 0)
    .reduce((sum, word) => sum + word.length, 0) / content.split(/\s+/).filter(w => w.length > 0).length;
  
  const uniqueCharRatio = new Set(content.split('')).size / content.length;
  const specialCharRatio = (content.match(/[^a-zA-Z0-9\s]/g) || []).length / content.length;
  
  // 복잡성 점수 계산 (0-100 범위)
  let complexityScore = 
    (avgWordLength * 10) + // 평균 단어 길이 (가중치: 10)
    (uniqueCharRatio * 40) + // 고유 문자 비율 (가중치: 40)
    (specialCharRatio * 50); // 특수 문자 비율 (가중치: 50)
  
  return Math.min(100, Math.round(complexityScore));
}

/**
 * N-gram 분석 시뮬레이션 (GPU 병렬 처리)
 * @param {string} content - 분석할 텍스트
 * @param {number} n - n-gram 크기
 * @returns {Array} 상위 n-gram 배열
 */
function simulateGpuNGramAnalysis(content, n) {
  if (!content || content.length < n) return [];
  
  const nGrams = {};
  
  // n-gram 추출 (GPU에서 병렬로 처리할 수 있는 작업)
  for (let i = 0; i <= content.length - n; i++) {
    const gram = content.substring(i, i + n);
    nGrams[gram] = (nGrams[gram] || 0) + 1;
  }
  
  // 상위 n-gram 반환
  return Object.entries(nGrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gram, count]) => ({ gram, count }));
}

/**
 * 고급 GPU 분석 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @param {Object} params - GPU 워크로드 파라미터
 */
function simulateAdvancedGpuAnalysis(content, params) {
  if (!content || content.length < 100) return;
  
  // 이 함수에서는 추가 GPU 계산을 시뮬레이션
  // 실제 GPU 구현에서는 여기에 더 복잡한 분석이 들어갈 수 있음
  
  // 병렬 처리 스레드 수에 따라 부하 생성
  const threadCount = params.parallelThreads || 4;
  
  // 각 스레드별 계산 시뮬레이션
  for (let i = 0; i < threadCount; i++) {
    // 스레드별 계산 부하 시뮬레이션 (GPU에서는 병렬로 처리됨)
    const sampleSize = Math.min(content.length, 500 * threadCount);
    
    // 어휘 다양성 분석 시뮬레이션
    const lexicalDiversity = new Set(content.slice(0, sampleSize).split(/\s+/)).size / 
                             content.slice(0, sampleSize).split(/\s+/).length;
    
    // 텍스트 구조 분석 시뮬레이션
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const avgSentenceLength = content.length / (sentenceCount || 1);
    
    // 결과는 사용하지 않지만 계산 수행 (GPU 처리 시뮬레이션)
    const simulatedResult = {
      lexicalDiversity,
      avgSentenceLength,
      threadId: i
    };
  }
}

/**
 * GPU 실행 시간 시뮬레이션
 * @param {number} duration - 시뮬레이션할 지연 시간(ms)
 */
function simulateGpuExecutionTime(duration) {
  if (!duration) return;
  
  // GPU 계산 시간을 시뮬레이션하기 위한 의도적 지연
  // 실제 구현에서는 필요 없음
  const start = Date.now();
  while (Date.now() - start < duration) {
    // 빈 루프로 지연 시뮬레이션
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
  timestamp: Date.now(),
  gpuEnabled: gpuEnabled,
  gpuSimulationReady: gpuSimulationReady
});

// GPU 기능이 활성화된 경우 초기화 시도
if (gpuEnabled) {
  initGpuSimulation();
}
