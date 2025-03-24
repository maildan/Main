/**
 * 네이티브 모듈을 사용한 메모리 관리
 */
const { 
  isNativeModuleAvailable, 
  getMemoryInfo, 
  optimizeMemory,
  forceGarbageCollection,
  determineOptimizationLevel
} = require('../server/native');
const { debugLog } = require('./utils');

/**
 * 네이티브 모듈을 통한 메모리 정보 가져오기
 * @returns {Object} 메모리 정보
 */
function getNativeMemoryInfo() {
  if (!isNativeModuleAvailable()) {
    return getFallbackMemoryInfo();
  }
  
  const nativeInfo = getMemoryInfo();
  if (!nativeInfo) {
    return getFallbackMemoryInfo();
  }
  
  return {
    timestamp: nativeInfo.timestamp,
    heapUsed: nativeInfo.heap_used,
    heapTotal: nativeInfo.heap_total,
    heapLimit: nativeInfo.heap_limit || undefined,
    heapUsedMB: nativeInfo.heap_used_mb,
    percentUsed: nativeInfo.percent_used,
    error: nativeInfo.error
  };
}

/**
 * 대체 메모리 정보 가져오기 (네이티브 모듈 사용 불가 시)
 * @returns {Object} 메모리 정보
 */
function getFallbackMemoryInfo() {
  try {
    const memoryUsage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 10) / 10,
      percentUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      error: String(error)
    };
  }
}

/**
 * 네이티브 GC 수행
 * @returns {Object} GC 결과
 */
function performNativeGC() {
  if (!isNativeModuleAvailable()) {
    return performFallbackGC();
  }
  
  const result = forceGarbageCollection();
  if (!result) {
    return performFallbackGC();
  }
  
  return {
    timestamp: result.timestamp,
    freedMemory: result.freed_memory || 0,
    freedMB: result.freed_mb || 0,
    success: result.success
  };
}

/**
 * 대체 GC 수행 (네이티브 모듈 사용 불가 시)
 * @returns {Object} GC 결과
 */
function performFallbackGC() {
  try {
    const before = process.memoryUsage();
    
    // 노드에서 GC 시도
    if (global.gc) {
      global.gc();
    }
    
    const after = process.memoryUsage();
    const freedMemory = Math.max(0, before.heapUsed - after.heapUsed);
    
    return {
      timestamp: Date.now(),
      freedMemory,
      freedMB: Math.round(freedMemory / (1024 * 1024) * 10) / 10,
      success: true
    };
  } catch (error) {
    console.error('GC 수행 오류:', error);
    return {
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      success: false,
      error: String(error)
    };
  }
}

/**
 * 메모리 최적화 수행
 * @param {number} level 최적화 레벨 (0-4)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Object} 최적화 결과
 */
async function performMemoryOptimization(level = 2, emergency = false) {
  if (!isNativeModuleAvailable()) {
    return performFallbackOptimization(level, emergency);
  }
  
  try {
    const result = await optimizeMemory(level, emergency);
    if (!result) {
      return performFallbackOptimization(level, emergency);
    }
    
    return {
      timestamp: result.timestamp,
      level: result.optimization_level,
      freedMemory: result.freed_memory || 0,
      freedMB: result.freed_mb || 0,
      success: result.success,
      emergency: result.emergency || emergency
    };
  } catch (error) {
    console.error('메모리 최적화 수행 오류:', error);
    return performFallbackOptimization(level, emergency);
  }
}

/**
 * 대체 최적화 수행 (네이티브 모듈 사용 불가 시)
 * @param {number} level 최적화 레벨 (0-4)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Object} 최적화 결과
 */
function performFallbackOptimization(level, emergency) {
  // JS 기반 메모리 최적화 구현
  // 실제로는 여기서 JS 환경에서 가능한 메모리 최적화 수행
  
  return performFallbackGC(); // 간단히 GC 결과로 대체
}

/**
 * 메모리 사용량에 따른 최적화 수준 결정
 * @returns {number} 최적화 수준 (0-4)
 */
function getOptimizationLevel() {
  if (isNativeModuleAvailable()) {
    const level = determineOptimizationLevel();
    if (typeof level === 'number') {
      return level;
    }
  }
  
  // 폴백: 자체 메모리 상태에 따라 결정
  const memInfo = getFallbackMemoryInfo();
  
  if (memInfo.percentUsed < 50) return 0;
  if (memInfo.percentUsed < 70) return 1;
  if (memInfo.percentUsed < 85) return 2;
  if (memInfo.percentUsed < 95) return 3;
  return 4;
}

/**
 * 자동 메모리 관리 수행
 * 메모리 사용량에 따라 자동으로 필요한 최적화 수행
 * @returns {Object|null} 수행 결과 또는 null (필요 없는 경우)
 */
async function performAutoMemoryManagement() {
  const level = getOptimizationLevel();
  
  // 레벨 2 이상일 때만 최적화 수행
  if (level >= 2) {
    debugLog(`메모리 사용량 증가 감지 (레벨 ${level}). 자동 최적화 수행...`);
    return performMemoryOptimization(level, level >= 4);
  }
  
  return null;
}

module.exports = {
  getNativeMemoryInfo,
  getFallbackMemoryInfo,
  performNativeGC,
  performMemoryOptimization,
  getOptimizationLevel,
  performAutoMemoryManagement,
};
