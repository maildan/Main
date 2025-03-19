/**
 * 타이핑 통계 계산 모듈
 */
const { calculateAccuracy, calculateWPM, estimateWordCount, getMemoryInfo } = require('./utils');
const { reusableBuffers } = require('./memory-manager');

// 캐시 데이터 저장
let dataCache = null;
let gcCounter = 0;

/**
 * 표준 통계 계산 (일반 모드)
 * @param {Object} data - 키 입력 데이터
 * @param {Function} callback - 결과 콜백
 */
function calculateStatsNormal(data, callback) {
  try {
    const { keyCount, typingTime, content, errors } = data;
    
    // 데이터 유효성 검증
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
      if (callback) {
        callback({
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
      }
      return;
    }
    
    // 기본 통계 계산
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
    if (callback) {
      callback({
        action: 'stats-calculated',
        result,
        memoryInfo: getMemoryInfo()
      });
    }
    
    // 주기적으로 메모리 정리
    if (++gcCounter % 10 === 0) {
      const { manualGarbageCollect } = require('./memory-manager');
      manualGarbageCollect();
    }
    
    return result;
  } catch (error) {
    if (callback) {
      callback({
        action: 'error',
        error: error.message,
        memoryInfo: getMemoryInfo()
      });
    }
    return { error: error.message };
  }
}

/**
 * 경량화된 통계 계산 (메모리 최적화 모드)
 * @param {Object} data - 키 입력 데이터
 * @param {Function} callback - 결과 콜백
 */
function calculateStatsLite(data, callback) {
  const { keyCount, typingTime, errors } = data;
  
  // 최소한의 필수 계산만 수행
  const result = {
    wpm: typingTime > 0 ? Math.round((keyCount / typingTime) * 12) : 0, // 1초당 5글자 기준
    accuracy: calculateAccuracy(errors || 0, keyCount),
    wordCount: Math.round(keyCount / 5),
    characterCount: keyCount,
    pageCount: keyCount / 1800
  };
  
  if (callback) {
    callback({
      action: 'stats-calculated',
      result,
      memoryInfo: getMemoryInfo(),
      mode: 'lite'
    });
  }
  
  return result;
}

/**
 * CPU 집약적 통계 계산 (메모리 사용 대신 CPU 연산 증가)
 * @param {Object} data - 키 입력 데이터
 * @param {Function} callback - 결과 콜백
 */
function calculateStatsCpuIntensive(data, callback) {
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
    if (callback) {
      callback({
        action: 'stats-calculated',
        result: { ...result }, // 복사본 전송 (참조 공유 방지)
        memoryInfo: getMemoryInfo(),
        mode: 'cpu-intensive'
      });
    }
    
    return { ...result };
  } catch (error) {
    if (callback) {
      callback({
        action: 'error',
        error: `CPU 집약적 계산 중 오류: ${error.message}`,
        memoryInfo: getMemoryInfo()
      });
    }
    
    // 오류 발생 시 경량 모드로 폴백
    return calculateStatsLite(data, callback);
  }
}

/**
 * 타이핑 통계 계산 진입점
 * @param {Object} data - 키 입력 데이터
 * @param {string} mode - 처리 모드 ('normal', 'cpu-intensive', 'lite')
 * @param {boolean} shouldOptimizeMemory - 메모리 최적화 모드 여부
 * @param {Function} callback - 결과 콜백
 */
function calculateStats(data, mode, shouldOptimizeMemory, callback) {
  // 처리 모드에 따른 분기 처리
  switch (mode) {
    case 'normal':
      if (shouldOptimizeMemory) {
        return calculateStatsLite(data, callback); // 메모리 최적화 모드
      }
      return calculateStatsNormal(data, callback); // 일반 모드
      
    case 'cpu-intensive':
      return calculateStatsCpuIntensive(data, callback); // CPU 집약적 처리
      
    default:
      return calculateStatsLite(data, callback); // 기본은 경량 모드
  }
}

// 메모리 정리 함수
function clearCache() {
  dataCache = null;
  gcCounter = 0;
}

module.exports = {
  calculateStats,
  calculateStatsNormal,
  calculateStatsLite,
  calculateStatsCpuIntensive,
  clearCache
};
