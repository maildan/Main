/**
 * GPU 계산 시뮬레이션 모듈
 */
const { getMemoryInfo, calculateAccuracy, calculateWPM, sleep, measureExecutionTime } = require('./utils.cjs');
const { reusableBuffers, manualGarbageCollect } = require('./memory-manager.cjs');

// GPU 시뮬레이션 상태 변수
let gpuSimulationReady = false;

// GPU 워크로드 사이즈 상수
const GPU_WORKLOAD_SIZES = {
  SMALL: 'small',    // 최소한의 계산만 (저성능 기기용)
  MEDIUM: 'medium',  // 적절한 수준의 계산 (일반 기기용)
  LARGE: 'large'     // 대량의 계산 (고성능 기기용)
};

/**
 * GPU 시뮬레이션 초기화 (실제 GPU 초기화를 시뮬레이션)
 * @returns {boolean} 초기화 성공 여부
 */
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
 * GPU에서 단어 수 계산 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @returns {number} 단어 수
 */
function simulateGpuWordCount(content) {
  if (!content) return 0;
  
  // 병렬 처리 시뮬레이션 - 실제로는 스트리밍 처리
  let wordCount = 0;
  let inWord = false;
  
  for (let i = 0; i < content.length; i++) {
    const isSpace = /\s/.test(content[i]);
    if (!isSpace && !inWord) {
      inWord = true;
      wordCount++;
    } else if (isSpace) {
      inWord = false;
    }
  }
  
  return wordCount;
}

/**
 * GPU에서 문자 분포 계산 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @returns {Object} 문자 분포 객체
 */
function simulateGpuCharDistribution(content) {
  if (!content) return {};
  
  // 메모리 사용량을 최소화하기 위해 객체 재사용
  if (!reusableBuffers.frequencyMap) {
    reusableBuffers.frequencyMap = {};
  }
  
  const charDist = reusableBuffers.frequencyMap;
  
  // 기존 값 초기화
  Object.keys(charDist).forEach(key => {
    delete charDist[key];
  });
  
  // 샘플링 방식을 사용하여 전체 텍스트를 분석하지 않음
  // 최대 10,000자만 분석
  const sampleSize = Math.min(content.length, 10000);
  const step = content.length > sampleSize ? Math.floor(content.length / sampleSize) : 1;
  
  // GPU에서는 병렬 처리가 가능하지만 여기서는 순차 처리로 시뮬레이션
  for (let i = 0; i < content.length; i += step) {
    const char = content[i];
    charDist[char] = (charDist[char] || 0) + 1;
  }
  
  return charDist;
}

/**
 * GPU에서 단어 빈도 계산 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @returns {Object} 단어 빈도 객체
 */
function simulateGpuWordFrequency(content) {
  if (!content) return {};
  
  // 재사용 가능한 객체 확인
  if (!reusableBuffers.wordFrequency) {
    reusableBuffers.wordFrequency = {};
  }
  
  const wordFreq = reusableBuffers.wordFrequency;
  
  // 기존 값 초기화
  Object.keys(wordFreq).forEach(key => {
    delete wordFreq[key];
  });
  
  // 단어 추출 (메모리 효율적인 방식)
  const words = content.trim().split(/\s+/);
  const maxWords = 5000; // 메모리 사용량 제한을 위해 최대 단어 수 제한
  
  // 샘플링 방식으로 처리
  const sampleSize = Math.min(words.length, maxWords);
  const step = words.length > sampleSize ? Math.floor(words.length / sampleSize) : 1;
  
  for (let i = 0; i < words.length; i += step) {
    const word = words[i].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    if (word && word.length > 1) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }
  
  return wordFreq;
}

/**
 * GPU에서 단어 정렬 시뮬레이션
 * @param {Object} wordFrequency - 단어 빈도 객체
 * @param {number} totalWordCount - 전체 단어 수
 * @returns {Array} 빈도 순으로 정렬된 단어 배열
 */
function simulateGpuSortWords(wordFrequency, totalWordCount) {
  if (!wordFrequency) return [];
  
  // 최대 처리 단어 수 제한
  const MAX_WORDS = 100;
  
  // 객체를 배열로 변환 (GPU에서는 병렬 처리)
  const entries = Object.entries(wordFrequency);
  
  // 빈도에 따라 정렬 (내림차순)
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_WORDS)
    .map(([word, count]) => ({
      word,
      count,
      percentage: totalWordCount > 0 ? (count / totalWordCount * 100).toFixed(1) : 0
    }));
}

/**
 * GPU에서 텍스트 복잡성 분석 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @returns {number} 복잡성 점수 (0-100)
 */
function simulateGpuTextComplexity(content) {
  if (!content || content.length < 50) return 0;
  
  // 텍스트 복잡성 기준
  // 1. 고유 단어 비율 (어휘 다양성)
  // 2. 평균 단어 길이
  // 3. 긴 단어(8자 이상) 비율
  
  // 어휘 다양성 분석 - 메모리 효율적인 방식
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const uniqueWords = new Set();
  let totalChars = 0;
  let longWordCount = 0;
  
  // 각 단어 처리
  words.forEach(word => {
    // 고유 단어 카운트
    uniqueWords.add(word.toLowerCase());
    
    // 단어 길이 누적
    totalChars += word.length;
    
    // 긴 단어 카운트 (8자 이상)
    if (word.length >= 8) {
      longWordCount++;
    }
  });
  
  // 어휘 다양성 계산 (고유 단어 비율)
  const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
  
  // 평균 단어 길이
  const avgWordLength = words.length > 0 ? totalChars / words.length : 0;
  
  // 긴 단어 비율
  const longWordRatio = words.length > 0 ? longWordCount / words.length : 0;
  
  // 복잡성 점수 계산 (각 요소에 가중치 적용)
  const complexityScore = 
    (lexicalDiversity * 50) + // 어휘 다양성 (0-50점)
    (Math.min(avgWordLength, 8) / 8 * 25) + // 평균 단어 길이 (0-25점)
    (longWordRatio * 25); // 긴 단어 비율 (0-25점)
  
  return Math.round(complexityScore);
}

/**
 * GPU에서 타이핑 패턴 분석 시뮬레이션
 * @param {number} keyCount - 키 입력 수
 * @param {number} typingTime - 타이핑 시간(초)
 * @returns {string} 타이핑 패턴 설명
 */
function simulateGpuTypingPatternAnalysis(keyCount, typingTime) {
  if (typingTime <= 0) return '타이핑 정보 없음';
  
  // 분당 타자 수 계산
  const keysPerMinute = (keyCount / typingTime) * 60;
  
  // 패턴 분석
  if (keysPerMinute >= 400) {
    return '매우 빠른 타이핑';
  } else if (keysPerMinute >= 300) {
    return '빠른 타이핑';
  } else if (keysPerMinute >= 200) {
    return '능숙한 타이핑';
  } else if (keysPerMinute >= 100) {
    return '보통 타이핑';
  } else if (keysPerMinute >= 50) {
    return '느린 타이핑';
  } else {
    return '매우 느린 타이핑';
  }
}

/**
 * 고급 GPU 분석 시뮬레이션
 * @param {string} content - 분석할 텍스트
 * @param {Object} params - GPU 워크로드 파라미터
 * @returns {Object} 분석 결과
 */
async function simulateAdvancedGpuAnalysis(content, params) {
  if (!content || content.length < 100) return null;
  
  // 이 함수에서는 추가 GPU 계산을 시뮬레이션
  // 실제 GPU 구현에서는 여기에 더 복잡한 분석이 들어갈 수 있음
  
  // 병렬 처리 스레드 수에 따라 부하 생성
  const threadCount = params.parallelThreads || 4;
  let results = {};
  
  // 각 스레드별 계산 시뮬레이션
  for (let i = 0; i < threadCount; i++) {
    // 스레드별 계산 부하 시뮬레이션 (GPU에서는 병렬로 처리됨)
    const sampleSize = Math.min(content.length, 500 * threadCount);
    
    // 어휘 다양성 분석 시뮬레이션
    const words = content.slice(0, sampleSize).split(/\s+/);
    const lexicalDiversity = new Set(words).size / (words.length || 1);
    
    // 텍스트 구조 분석 시뮬레이션
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const avgSentenceLength = content.length / (sentenceCount || 1);
    
    // 결과 추가
    results[`thread-${i}`] = {
      lexicalDiversity,
      avgSentenceLength,
      threadId: i
    };
    
    // 각 스레드의 처리 시간 시뮬레이션 (병렬 처리지만 약간씩 차이가 있음)
    await sleep(5 + Math.random() * 10);
  }
  
  // 병합된 결과 생성
  const combinedResult = {
    advancedMetrics: {
      lexicalDiversity: Object.values(results).reduce((sum, r) => sum + r.lexicalDiversity, 0) / threadCount,
      avgSentenceLength: Object.values(results).reduce((sum, r) => sum + r.avgSentenceLength, 0) / threadCount,
      threadCount
    }
  };
  
  return combinedResult;
}

/**
 * GPU 실행 시간 시뮬레이션
 * @param {number} duration - 시뮬레이션할 지연 시간(ms)
 */
async function simulateGpuExecutionTime(duration) {
  await sleep(duration);
}

/**
 * GPU 통계 계산 시뮬레이션 (메인 함수)
 * @param {Object} data - 키 입력 데이터
 * @param {string} workloadSize - 워크로드 크기 (small, medium, large)
 * @param {number} memoryLimit - 메모리 사용량 제한
 * @param {Function} callback - 결과 콜백
 */
async function calculateStatsGpuSimulation(data, workloadSize, memoryLimit, callback) {
  try {
    // GPU 초기화 확인
    if (!gpuSimulationReady) {
      if (!initGpuSimulation()) {
        if (callback) {
          callback({
            action: 'error',
            error: 'GPU 시뮬레이션 초기화 실패',
            memoryInfo: getMemoryInfo()
          });
        }
        return null;
      }
    }
    
    console.log(`GPU 시뮬레이션 시작 (워크로드: ${workloadSize})`);
    const gpuStartTime = Date.now();
    
    // 워크로드 파라미터 설정
    const { keyCount, typingTime, content, errors } = data;
    const workloadParams = getGpuWorkloadParams(workloadSize, content);
    
    // 결과 객체 초기화
    const result = {
      wpm: 0,
      accuracy: 100,
      wordCount: 0,
      characterCount: keyCount,
      pageCount: 0,
      topChars: [],
      typingPattern: 'normal',
      complexityScore: 0,
      processedWithGpu: true
    };
    
    // 기본 타이핑 지표 계산
    if (typingTime > 0) {
      result.wpm = Math.round((keyCount / typingTime) * 60);
      result.accuracy = calculateAccuracy(errors || 0, keyCount);
    }
    
    // 콘텐츠가 제공된 경우 추가 분석
    if (content && content.length > 0) {
      // 단어 수 계산 (GPU 병렬 처리 시뮬레이션)
      result.wordCount = simulateGpuWordCount(content);
      result.characterCount = content.length;
      result.pageCount = result.characterCount / 1800;
      
      // 메모리 사용량 확인
      const memoryInfo = getMemoryInfo();
      const memoryUsageMB = memoryInfo.heapUsed / (1024 * 1024);
      
      // 메모리 여유가 있으면 고급 분석 수행
      if (memoryUsageMB < (memoryLimit / (1024 * 1024) * 0.7)) {
        // 문자 분포 분석
        const charDistribution = simulateGpuCharDistribution(content);
        result.topChars = Object.entries(charDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([char, count]) => ({ char, count }));
        
        // 단어 빈도 분석
        const wordFrequency = simulateGpuWordFrequency(content);
        result.wordCloud = simulateGpuSortWords(wordFrequency, result.wordCount);
        
        // 복잡성 점수 계산
        result.complexityScore = simulateGpuTextComplexity(content);
        
        // 워크로드 파라미터에 고급 분석이 포함되어 있으면 수행
        if (workloadParams.performAdvancedAnalysis) {
          const [advancedResults] = await measureExecutionTime(
            simulateAdvancedGpuAnalysis, 
            content, 
            workloadParams
          );
          
          if (advancedResults) {
            result.advancedMetrics = advancedResults.advancedMetrics;
          }
        }
      }
    }
    
    // 타이핑 패턴 분석
    result.typingPattern = simulateGpuTypingPatternAnalysis(keyCount, typingTime);
    
    // GPU 실행 시간 시뮬레이션 (워크로드 크기에 따라 다름)
    await simulateGpuExecutionTime(workloadParams.executionTime);
    
    // 처리 시간 계산
    const gpuEndTime = Date.now();
    const gpuProcessingTime = gpuEndTime - gpuStartTime;
    result.processingTime = gpuProcessingTime;
    
    console.log(`GPU 시뮬레이션 완료: ${gpuProcessingTime}ms 소요`);
    
    // 결과 전송
    if (callback) {
      callback({
        action: 'stats-calculated',
        result,
        memoryInfo: getMemoryInfo(),
        mode: 'gpu-intensive',
        processingTime: gpuProcessingTime
      });
    }
    
    // 메모리 사용량 확인 및 필요시 정리
    const memUsage = getMemoryInfo();
    if (memUsage.heapUsed > memoryLimit * 0.8) {
      manualGarbageCollect();
    }
    
    return result;
  } catch (error) {
    console.error('GPU 시뮬레이션 중 오류 발생:', error);
    
    if (callback) {
      callback({
        action: 'error',
        error: `GPU 시뮬레이션 오류: ${error.message}`,
        memoryInfo: getMemoryInfo()
      });
    }
    
    return null;
  }
}

/**
 * GPU 상태 확인
 * @returns {Object} GPU 시뮬레이션 상태
 */
function getGpuStatus() {
  return {
    ready: gpuSimulationReady,
    bufferSizes: reusableBuffers.matrixCache ? {
      small: reusableBuffers.matrixCache.small?.length || 0,
      medium: reusableBuffers.matrixCache.medium?.length || 0,
      large: reusableBuffers.matrixCache.large?.length || 0
    } : null
  };
}

/**
 * GPU 메모리 정리
 */
function cleanupGpuResources() {
  if (reusableBuffers.matrixCache) {
    reusableBuffers.matrixCache = null;
  }
  
  gpuSimulationReady = false;
}

module.exports = {
  initGpuSimulation,
  calculateStatsGpuSimulation,
  getGpuWorkloadParams,
  simulateGpuWordCount,
  simulateGpuCharDistribution,
  simulateGpuWordFrequency,
  simulateGpuSortWords,
  simulateGpuTextComplexity,
  simulateGpuTypingPatternAnalysis,
  simulateAdvancedGpuAnalysis,
  getGpuStatus,
  cleanupGpuResources,
  GPU_WORKLOAD_SIZES
};
