/**
 * 워커 공통 유틸리티 함수
 */
const v8 = require('v8');

/**
 * 현재 메모리 사용량 정보 반환 - Rust 네이티브 모듈 활용
 * @returns {Object} 메모리 사용량 정보
 */
function getMemoryInfo() {
  try {
    // v8 힙 통계
    const v8HeapStats = v8.getHeapStatistics();
    
    // 프로세스 메모리 정보 - process.memoryUsage() 호출 추가
    const memoryUsage = process.memoryUsage();
    
    // 네이티브 모듈 함수 사용 시도 (사용 가능한 경우)
    try {
      const nativeModule = require('../../../native-modules.cjs');
      
      if (nativeModule && typeof nativeModule.get_memory_info === 'function') {
        // Rust 네이티브 모듈 사용
        const nativeMemoryInfoJson = nativeModule.get_memory_info();
        const nativeMemoryInfo = JSON.parse(nativeMemoryInfoJson);
        
        return {
          timestamp: nativeMemoryInfo.timestamp || Date.now(),
          heapUsed: nativeMemoryInfo.heap_used || memoryUsage.heapUsed,
          heapTotal: nativeMemoryInfo.heap_total || memoryUsage.heapTotal,
          rss: nativeMemoryInfo.rss || memoryUsage.rss,
          external: nativeMemoryInfo.external || memoryUsage.external,
          heapUsedMB: nativeMemoryInfo.heap_used_mb || 
                      (Math.round(memoryUsage.heapUsed / (1024 * 1024) * 10) / 10),
          rssMB: nativeMemoryInfo.rss_mb || 
                (Math.round(memoryUsage.rss / (1024 * 1024) * 10) / 10),
          percentUsed: nativeMemoryInfo.percent_used || 
                      Math.round((memoryUsage.heapUsed / v8HeapStats.heap_size_limit) * 100),
          v8HeapSizeLimit: v8HeapStats.heap_size_limit
        };
      }
    } catch (nativeError) {
      // 네이티브 모듈 로드 실패 시 기본 구현으로 폴백
      console.debug('네이티브 메모리 정보 가져오기 실패, JS 구현으로 폴백:', nativeError);
    }
    
    // 기본 JS 구현 (네이티브 모듈 사용 불가능한 경우)
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

/**
 * 정확도 계산
 * @param {number} errors - 오타 수
 * @param {number} totalKeys - 전체 키 입력 수
 * @returns {number} 정확도(%)
 */
function calculateAccuracy(errors, totalKeys) {
  const total = errors + totalKeys;
  if (total <= 0) return 100;
  return Math.round((totalKeys / total) * 100);
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
 * 단어 수 추정
 * @param {string} text - 텍스트
 * @returns {number} 추정 단어 수
 */
function estimateWordCount(text) {
  if (!text) return 0;
  
  // 공백으로 나누고 빈 문자열 제거
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * 지정된 시간만큼 실행을 지연시키는 함수
 * @param {number} ms - 지연 시간(ms) 
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 작업 실행 시간 측정 유틸리티
 * @param {Function} fn - 측정할 함수
 * @param {any[]} args - 함수 인자 
 * @returns {[any, number]} - [함수 실행 결과, 실행 시간(ms)]
 */
async function measureExecutionTime(fn, ...args) {
  const start = performance.now();
  const result = await fn(...args);
  const end = performance.now();
  return [result, end - start];
}

/**
 * 객체 풀 생성 유틸리티 - 메모리 사용량 최적화
 * @param {Function} factory - 객체 생성 함수
 * @param {number} size - 풀 크기
 * @returns {Object} 객체 풀 인터페이스
 */
function createObjectPool(factory, size = 10) {
  const pool = Array.from({ length: size }, () => factory());
  let index = 0;
  
  return {
    acquire() {
      if (index < pool.length) {
        return pool[index++];
      }
      return factory();
    },
    
    release(object) {
      if (index > 0) {
        pool[--index] = object;
      }
    },
    
    reset() {
      index = 0;
    }
  };
}

module.exports = {
  getMemoryInfo,
  calculateAccuracy,
  calculateWPM,
  estimateWordCount,
  sleep,
  measureExecutionTime,
  createObjectPool
};
