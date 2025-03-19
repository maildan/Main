/**
 * 타이핑 통계 계산을 위한 웹 워커
 */

// 워커 메시지 수신 이벤트 리스너
self.onmessage = function(e) {
  const { action, data } = e.data;
  
  switch (action) {
    case 'calculate-stats':
      calculateStats(data);
      break;
    case 'analyze-typing-pattern':
      analyzeTypingPattern(data);
      break;
    default:
      self.postMessage({ error: '알 수 없는 액션' });
  }
};

/**
 * 타이핑 통계 계산
 * @param {Object} data - 키 입력 데이터
 */
function calculateStats(data) {
  try {
    const { keyCount, typingTime, content } = data;
    
    // CPU 집약적인 계산 수행
    const result = {
      wpm: calculateWPM(keyCount, typingTime),
      accuracy: calculateAccuracy(data.errors || 0, keyCount),
      characterCount: content ? content.length : 0,
      wordCount: content ? estimateWordCount(content) : 0,
      pageCount: content ? content.length / 1800 : 0, // 약 1800자 = 1페이지로 가정
    };
    
    // 결과 메인 스레드로 전송
    self.postMessage({
      action: 'stats-calculated',
      result
    });
  } catch (error) {
    self.postMessage({
      action: 'error',
      error: error.message
    });
  }
}

/**
 * 타이핑 패턴 분석 (CPU 집약적인 작업)
 * @param {Object} data - 타이핑 데이터
 */
function analyzeTypingPattern(data) {
  try {
    // 타이핑 패턴 분석 로직 (CPU 집약적)
    const { keyPresses, timestamps } = data;
    
    // 패턴 분석을 위한 계산
    const patterns = {};
    const keyIntervals = [];
    const commonSequences = findCommonSequences(keyPresses);
    
    // 키 간격 분석
    if (keyPresses && timestamps && keyPresses.length === timestamps.length) {
      for (let i = 1; i < timestamps.length; i++) {
        keyIntervals.push(timestamps[i] - timestamps[i-1]);
      }
    }
    
    // 평균 타이핑 간격
    const avgInterval = keyIntervals.length > 0
      ? keyIntervals.reduce((sum, interval) => sum + interval, 0) / keyIntervals.length
      : 0;
    
    // 결과 반환
    self.postMessage({
      action: 'pattern-analyzed',
      result: {
        avgInterval,
        commonSequences,
        patternQuality: analyzePatternQuality(keyIntervals)
      }
    });
  } catch (error) {
    self.postMessage({
      action: 'error',
      error: error.message
    });
  }
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
 * 일반적인 키 순서 찾기
 * @param {Array} keys - 키 입력 배열
 * @returns {Array} 자주 사용되는 키 순서
 */
function findCommonSequences(keys) {
  if (!Array.isArray(keys) || keys.length < 3) {
    return [];
  }
  
  const sequences = {};
  const sequenceLength = 3; // 3글자 시퀀스 찾기
  
  // 모든 가능한 시퀀스 카운트
  for (let i = 0; i <= keys.length - sequenceLength; i++) {
    const sequence = keys.slice(i, i + sequenceLength).join('');
    sequences[sequence] = (sequences[sequence] || 0) + 1;
  }
  
  // 가장 많이 발생한 시퀀스 찾기
  return Object.entries(sequences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => ({ sequence: entry[0], count: entry[1] }));
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
  
  // 표준 편차 계산
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
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
