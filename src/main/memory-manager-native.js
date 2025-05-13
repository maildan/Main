/**
 * 네이티브 모듈을 사용한 메모리 관리
 * 
 * 이 모듈은 Rust 네이티브 모듈을 사용하여 메모리 관리 기능을 제공합니다.
 * Rust 네이티브 모듈을 사용할 수 없는 경우 기본 JavaScript 구현으로 폴백합니다.
 */
const path = require('path');
const { debugLog } = require('./utils');

// 네이티브 모듈 가져오기
let nativeModule = null;
try {
  nativeModule = require('../server/native/index.cjs');
  debugLog('네이티브 모듈 로드 성공:', '../server/native/index.cjs');
} catch (error) {
  debugLog('모듈 로드 실패: ../server/native/index.cjs');
  try {
    nativeModule = require('../server/native/fallback/index.js');
    debugLog('폴백 모듈 로드 성공:', '../server/native/fallback/index.js');
  } catch (fallbackError) {
    debugLog('폴백 모듈 로드 실패:', fallbackError.message);
    nativeModule = null;
  }
}

// 안전한 네이티브 모듈 함수 참조
const { 
  isNativeModuleAvailable = () => false, 
  getMemoryInfo = () => ({}), 
  optimizeMemory = () => ({}),
  forceGarbageCollection = () => ({}),
  determineOptimizationLevel = () => 0
} = nativeModule || {};

// 네이티브 모듈 관련 상태
const nativeModuleState = {
  initialized: false,
  lastInitAttempt: 0,
  initAttempts: 0,
  lastUsedTime: 0,
  lastError: null,
  isAvailable: false
};

/**
 * 네이티브 모듈 초기화
 * @returns {boolean} 초기화 성공 여부
 */
function initializeNativeModule() {
  try {
    nativeModuleState.lastInitAttempt = Date.now();
    nativeModuleState.initAttempts++;
    
    // 이미 초기화되었거나 네이티브 모듈을 사용할 수 없는 경우
    if (nativeModuleState.initialized || nativeModuleState.initAttempts > 3) {
      return nativeModuleState.isAvailable;
    }
    
    // 네이티브 모듈 사용 가능 여부 확인
    if (nativeModule && typeof isNativeModuleAvailable === 'function') {
      nativeModuleState.isAvailable = isNativeModuleAvailable();
    } else {
      nativeModuleState.isAvailable = false;
    }
    
    nativeModuleState.initialized = true;
    
    if (nativeModuleState.isAvailable) {
      debugLog('네이티브 모듈 초기화 성공');
    } else {
      debugLog('네이티브 모듈 사용 불가, 폴백 모듈로 초기화 완료');
    }
    
    return nativeModuleState.isAvailable;
  } catch (error) {
    console.error('네이티브 모듈 초기화 오류:', error);
    nativeModuleState.lastError = error;
    nativeModuleState.isAvailable = false;
    return false;
  }
}

/**
 * 네이티브 모듈을 통한 메모리 정보 가져오기
 * @returns {Object} 메모리 정보
 */
function getNativeMemoryInfo() {
  if (!isNativeModuleAvailable()) {
    return getFallbackMemoryInfo();
  }
  
  try {
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
      rss: nativeInfo.rss,
      rssMB: nativeInfo.rss_mb,
      error: nativeInfo.error
    };
  } catch (error) {
    debugLog('네이티브 메모리 정보 가져오기 오류:', error);
    return getFallbackMemoryInfo();
  }
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
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024) * 10) / 10,
      rss: memoryUsage.rss,
      percentUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapUsedMB: 0,
      rssMB: 0,
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
  
  try {
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
  } catch (error) {
    debugLog('네이티브 GC 수행 오류:', error);
    return performFallbackGC();
  }
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
    } else {
      // GC 직접 호출이 불가능한 경우 간접적인 메모리 정리 수행
      const tempArray = [];
      for (let i = 0; i < 10; i++) {
        tempArray.push(new ArrayBuffer(1024 * 1024)); // 각 1MB
      }
      tempArray.length = 0; // 메모리 해제 유도
    }
    
    const after = process.memoryUsage();
    const freedMemory = Math.max(0, before.heapUsed - after.heapUsed);
    const freedMB = Math.round(freedMemory / (1024 * 1024) * 10) / 10;
    
    return {
      timestamp: Date.now(),
      freedMemory,
      freedMB,
      success: true
    };
  } catch (error) {
    console.error('폴백 GC 수행 오류:', error);
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
    const resultJson = optimizeMemory(level, emergency);
    if (!resultJson) {
      return performFallbackOptimization(level, emergency);
    }
    
    try {
      const result = JSON.parse(resultJson);
      
      return {
        timestamp: result.timestamp,
        level: result.optimization_level,
        freedMemory: result.freed_memory || 0,
        freedMB: result.freed_mb || 0,
        success: result.success,
        emergency: result.emergency || emergency
      };
    } catch (parseError) {
      debugLog('네이티브 최적화 결과 파싱 오류:', parseError);
      return performFallbackOptimization(level, emergency);
    }
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
  try {
    const memoryBefore = process.memoryUsage();
    
    // 레벨에 따른 최적화 강도 조절
    if (level >= 3 || emergency) {
      // 더 강력한 메모리 정리
      if (global.gc) {
        global.gc();
        // 2번 호출하여 더 철저히 정리
        setTimeout(() => global.gc(), 100);
      }
      
      // 큰 임시 배열 생성 후 해제하여 GC 유도
      const tempArrays = [];
      for (let i = 0; i < level + 1; i++) {
        tempArrays.push(new ArrayBuffer(10 * 1024 * 1024)); // 각 10MB
      }
      tempArrays.length = 0;
    } else {
      // 기본 메모리 정리
      if (global.gc) {
        global.gc();
      }
    }
    
    const memoryAfter = process.memoryUsage();
    const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
    const freedMB = Math.round(freedMemory / (1024 * 1024) * 10) / 10;
    
    return {
      timestamp: Date.now(),
      level,
      freedMemory,
      freedMB,
      success: true,
      emergency
    };
  } catch (error) {
    console.error('폴백 최적화 수행 오류:', error);
    return {
      timestamp: Date.now(),
      level,
      freedMemory: 0,
      freedMB: 0,
      success: false,
      emergency,
      error: String(error)
    };
  }
}

/**
 * 메모리 사용량에 따른 최적화 수준 결정
 * @returns {number} 최적화 수준 (0-4)
 */
function getOptimizationLevel() {
  if (isNativeModuleAvailable()) {
    try {
      const level = determineOptimizationLevel();
      if (typeof level === 'number') {
        return level;
      }
    } catch (error) {
      debugLog('네이티브 최적화 레벨 결정 오류:', error);
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

/**
 * 네이티브 메모리 최적화 수행
 * @param {number} level 최적화 레벨 (0-4)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function optimizeMemoryNative(level = 2, emergency = false) {
  try {
    if (!nativeModuleState.initialized) {
      initializeNativeModule();
    }
    
    if (!nativeModuleState.isAvailable) {
      throw new Error('네이티브 메모리 모듈을 사용할 수 없음');
    }
    
    nativeModuleState.lastUsedTime = Date.now();
    return await optimizeMemory(level, emergency);
  } catch (error) {
    console.error('네이티브 메모리 최적화 오류:', error);
    throw error;
  }
}

/**
 * 네이티브 가비지 컬렉션 수행
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} GC 결과
 */
async function performGarbageCollectionNative(emergency = false) {
  try {
    if (!nativeModuleState.initialized) {
      initializeNativeModule();
    }
    
    if (!nativeModuleState.isAvailable) {
      throw new Error('네이티브 메모리 모듈을 사용할 수 없음');
    }
    
    nativeModuleState.lastUsedTime = Date.now();
    return await forceGarbageCollection();
  } catch (error) {
    console.error('네이티브 가비지 컬렉션 오류:', error);
    throw error;
  }
}

/**
 * 네이티브 메모리 정보 가져오기
 * @returns {Promise<Object>} 메모리 정보
 */
async function getMemoryInfoNative() {
  try {
    if (!nativeModuleState.initialized) {
      initializeNativeModule();
    }
    
    if (!nativeModuleState.isAvailable) {
      throw new Error('네이티브 메모리 모듈을 사용할 수 없음');
    }
    
    nativeModuleState.lastUsedTime = Date.now();
    return await getMemoryInfo();
  } catch (error) {
    console.error('네이티브 메모리 정보 가져오기 오류:', error);
    throw error;
  }
}

/**
 * 네이티브 모듈 상태 가져오기
 * @returns {Object} 네이티브 모듈 상태
 */
function getNativeModuleState() {
  return {
    ...nativeModuleState,
    currentTime: Date.now()
  };
}

// 모듈 내보내기
module.exports = {
  initializeNativeModule,
  optimizeMemoryNative,
  performGarbageCollectionNative,
  getMemoryInfoNative,
  getNativeModuleState,
  getNativeMemoryInfo,
  getFallbackMemoryInfo,
  performNativeGC,
  performMemoryOptimization,
  getOptimizationLevel,
  performAutoMemoryManagement
};
