/**
 * 메모리 매니저 모듈
 * 
 * 애플리케이션의 메모리 사용량을 모니터링하고 최적화하는 기능을 제공합니다.
 */

// CommonJS 형식으로 변환: import → require
const path = require('path');
const fs = require('fs');
const { debugLog } = require('./utils.cjs');
const { MEMORY_CONSTANTS } = require('./constants.cjs');

// 네이티브 모듈 로드 시도
let nativeModule = null;
let usingNativeImplementation = false;

try {
  // 네이티브 모듈 경로 설정
  const nativeModulePath = path.join(__dirname, '..', '..', 'native-modules', 'typing_stats_native.node');
  const exists = fs.existsSync(nativeModulePath);
  
  if (exists) {
    debugLog(`네이티브 모듈 파일 발견: ${nativeModulePath}`);
    nativeModule = require(nativeModulePath);
    usingNativeImplementation = true;
    debugLog('네이티브 메모리 모듈 로드 성공');
  } else {
    debugLog(`네이티브 모듈 파일이 존재하지 않음: ${nativeModulePath}`);
  }
} catch (error) {
  debugLog(`네이티브 모듈 로드 실패: ${error.message}`);
  nativeModule = null;
}

/**
 * 현재 메모리 사용량 정보 가져오기
 * @returns {Object} 메모리 사용 정보
 */
function getMemoryInfo() {
  // 네이티브 구현이 있으면 사용
  if (usingNativeImplementation && nativeModule && typeof nativeModule.get_memory_info === 'function') {
    try {
      const nativeInfo = JSON.parse(nativeModule.get_memory_info());
      return nativeInfo;
    } catch (error) {
      debugLog(`네이티브 메모리 정보 가져오기 실패: ${error.message}`);
      // 실패 시 JS 구현으로 폴백
    }
  }
  
  // JS 구현
  const memoryUsage = process.memoryUsage();
  
  return {
    heap_used: memoryUsage.heapUsed,
    heap_total: memoryUsage.heapTotal,
    rss: memoryUsage.rss,
    heap_used_mb: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100,
    heap_total_mb: Math.round(memoryUsage.heapTotal / (1024 * 1024) * 100) / 100,
    rss_mb: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100,
    percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    external: memoryUsage.external || 0,
    timestamp: Date.now()
  };
}

/**
 * GC를 강제로 실행
 * @returns {boolean} 성공 여부
 */
function forceGarbageCollection() {
  // 네이티브 구현이 있으면 사용
  if (usingNativeImplementation && nativeModule && typeof nativeModule.force_garbage_collection === 'function') {
    try {
      return nativeModule.force_garbage_collection();
    } catch (error) {
      debugLog(`네이티브 GC 실행 실패: ${error.message}`);
      // 실패 시 JS 구현으로 폴백
    }
  }
  
  // JS 구현
  if (global.gc) {
    global.gc();
    return true;
  }
  
  return false;
}

/**
 * 메모리 사용량 최적화
 * @param {number} level - 최적화 수준 (1-3)
 * @param {boolean} emergency - 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function optimizeMemory(level = 2, emergency = false) {
  // 네이티브 구현이 있으면 사용
  if (usingNativeImplementation && nativeModule && typeof nativeModule.optimize_memory === 'function') {
    try {
      const result = JSON.parse(nativeModule.optimize_memory(level, emergency));
      return result;
    } catch (error) {
      debugLog(`네이티브 메모리 최적화 실패: ${error.message}`);
      // 실패 시 JS 구현으로 폴백
    }
  }
  
  // JS 구현
  return optimizeMemoryWithJS(level, emergency);
}

/**
 * JS 기반 메모리 최적화 수행
 * 네이티브 모듈 사용 불가능한 경우 폴백 구현
 * @param {number} level 최적화 수준 (1-3)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function optimizeMemoryWithJS(level, emergency) {
  const memoryBefore = process.memoryUsage();
  
  // GC 강제 실행
  if (global.gc) {
    global.gc();
  }
  
  // 레벨에 따른 추가 작업
  if (level >= 2) {
    // 중간 수준: 약한 참조 정리
    global.gc && global.gc();
    
    // 인위적인 지연 추가 (GC가 비동기적으로 작업을 완료할 시간 확보)
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  if (level >= 3 || emergency) {
    // 높은 수준: 더 강력한 최적화
    global.gc && global.gc(true);
    
    // 인위적인 지연 추가
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 메모리 최적화 후 사용량 확인
  const memoryAfter = process.memoryUsage();
  const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
  
  debugLog(`JS 메모리 최적화 완료: ${freedMB}MB 정리됨`);
  
  return {
    success: true,
    optimization_level: level,
    memory_before: {
      heap_used: memoryBefore.heapUsed,
      heap_total: memoryBefore.heapTotal,
      rss: memoryBefore.rss,
      heap_used_mb: Math.round(memoryBefore.heapUsed / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((memoryBefore.heapUsed / memoryBefore.heapTotal) * 100)
    },
    memory_after: {
      heap_used: memoryAfter.heapUsed,
      heap_total: memoryAfter.heapTotal,
      rss: memoryAfter.rss,
      heap_used_mb: Math.round(memoryAfter.heapUsed / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((memoryAfter.heapUsed / memoryAfter.heapTotal) * 100)
    },
    freed_memory: freedMemory,
    freed_mb: freedMB,
    timestamp: Date.now()
  };
}

/**
 * 현재 메모리 사용량이 위험 수준인지 확인
 * @returns {number} 위험 수준 (0: 정상, 1: 주의, 2: 경고, 3: 위험)
 */
function checkMemoryRisk() {
  const memInfo = getMemoryInfo();
  const usedMB = memInfo.heap_used_mb;
  
  if (usedMB > MEMORY_CONSTANTS.CRITICAL_THRESHOLD) return 3; // 위험
  if (usedMB > MEMORY_CONSTANTS.DEFAULT_THRESHOLD) return 2;  // 경고
  if (usedMB > MEMORY_CONSTANTS.DEFAULT_THRESHOLD * 0.7) return 1; // 주의
  return 0; // 정상
}

module.exports = {
  getMemoryInfo,
  forceGarbageCollection,
  optimizeMemory,
  checkMemoryRisk,
  isUsingNativeImplementation: () => usingNativeImplementation
};
