/**
 * 메모리 관리 모듈
 * 
 * Rust 네이티브 모듈과 JavaScript 간의 브릿지 역할을 합니다.
 * 메모리 사용량 모니터링 및 최적화 기능을 제공합니다.
 */

const { isNativeModuleAvailable, optimizeMemory, getMemoryInfo, forceGarbageCollection } = require('../server/native');

// 메모리 관리 상태
const memoryManagerState = {
  initialized: false,
  monitoringInterval: 60000, // 기본값: 60초
  memoryThreshold: {
    normal: 100, // 정상 수준 메모리 사용량 (MB)
    high: 150,   // 높은 수준 메모리 사용량 (MB)
    critical: 200 // 위험 수준 메모리 사용량 (MB)
  },
  lastOptimizationTime: 0,
  optimizationCount: 0,
  monitorTimer: null,
  isMemoryWarningDisplayed: false
};

/**
 * 메모리 관리자 초기화
 * @param {Object} options 초기화 옵션
 */
function initializeMemoryManager(options = {}) {
  if (memoryManagerState.initialized) {
    return;
  }
  
  const {
    monitoringInterval = 60000,
    thresholds = {},
    enableAutoOptimization = true
  } = options;
  
  // 설정 적용
  memoryManagerState.monitoringInterval = monitoringInterval;
  
  if (thresholds.normal) memoryManagerState.memoryThreshold.normal = thresholds.normal;
  if (thresholds.high) memoryManagerState.memoryThreshold.high = thresholds.high;
  if (thresholds.critical) memoryManagerState.memoryThreshold.critical = thresholds.critical;
  
  // 네이티브 모듈 사용 가능 여부 확인
  const nativeAvailable = isNativeModuleAvailable();
  console.log(`메모리 관리자 초기화: 네이티브 모듈 ${nativeAvailable ? '사용 가능' : '사용 불가'}`);
  
  // 자동 최적화 활성화된 경우 모니터링 시작
  if (enableAutoOptimization) {
    startMemoryMonitoring();
  }
  
  memoryManagerState.initialized = true;
}

/**
 * 메모리 모니터링 시작
 */
function startMemoryMonitoring() {
  if (memoryManagerState.monitorTimer) {
    clearInterval(memoryManagerState.monitorTimer);
  }
  
  memoryManagerState.monitorTimer = setInterval(
    checkAndOptimizeMemory, 
    memoryManagerState.monitoringInterval
  );
  
  console.log(`메모리 모니터링 시작 (간격: ${memoryManagerState.monitoringInterval}ms)`);
}

/**
 * 메모리 모니터링 중지
 */
function stopMemoryMonitoring() {
  if (memoryManagerState.monitorTimer) {
    clearInterval(memoryManagerState.monitorTimer);
    memoryManagerState.monitorTimer = null;
  }
  
  console.log('메모리 모니터링 중지');
}

/**
 * 메모리 사용량 확인 및 필요 시 최적화
 * @returns {Promise<Object>} 메모리 상태 및 최적화 결과
 */
async function checkAndOptimizeMemory() {
  try {
    let memoryUsage;
    let heapUsedMB;
    
    // 네이티브 모듈 사용 가능 시 네이티브 메모리 정보 사용
    if (isNativeModuleAvailable()) {
      const memoryInfo = await getMemoryInfo();
      heapUsedMB = memoryInfo.heap_used_mb;
    } else {
      // JavaScript 메모리 정보 사용
      memoryUsage = process.memoryUsage();
      heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    }
    
    // 임계값 확인
    const { normal, high, critical } = memoryManagerState.memoryThreshold;
    
    // 최적화 수준 결정
    let optimizationLevel = 0;
    let emergency = false;
    
    if (heapUsedMB > critical) {
      optimizationLevel = 4; // 최고 수준 최적화
      emergency = true;
    } else if (heapUsedMB > high) {
      optimizationLevel = 3; // 높은 수준 최적화
    } else if (heapUsedMB > normal) {
      optimizationLevel = 2; // 중간 수준 최적화
    }
    
    // 메모리 사용량이 임계값 초과 시 최적화 수행
    let optimizationResult = null;
    
    if (optimizationLevel > 0) {
      console.log(`메모리 사용량 ${heapUsedMB}MB, 레벨 ${optimizationLevel} 최적화 수행`);
      
      if (isNativeModuleAvailable()) {
        // 네이티브 최적화 수행
        optimizationResult = await optimizeMemory(optimizationLevel, emergency);
      } else {
        // JavaScript 기반 최적화 수행
        if (global.gc) {
          global.gc(emergency);
          optimizationResult = { success: true, level: optimizationLevel };
        }
      }
      
      // 최적화 카운트 증가
      memoryManagerState.optimizationCount++;
      memoryManagerState.lastOptimizationTime = Date.now();
    }
    
    return {
      memoryUsage: {
        heapUsedMB,
        timestamp: Date.now()
      },
      optimizationPerformed: optimizationLevel > 0,
      optimizationLevel,
      optimizationResult
    };
  } catch (error) {
    console.error('메모리 확인 및 최적화 중 오류:', error);
    return {
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 강제 메모리 최적화
 * @param {number} level 최적화 레벨 (0-4)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function forceMemoryOptimization(level = 2, emergency = false) {
  try {
    console.log(`강제 메모리 최적화 실행 (레벨: ${level}, 긴급: ${emergency})`);
    
    let result;
    
    if (isNativeModuleAvailable()) {
      // 네이티브 최적화 수행
      result = await optimizeMemory(level, emergency);
    } else {
      // JavaScript 기반 최적화 수행
      if (global.gc) {
        global.gc(emergency);
        result = { success: true, level };
      } else {
        result = { success: false, error: 'JavaScript GC is not available' };
      }
    }
    
    // 최적화 카운트 증가
    memoryManagerState.optimizationCount++;
    memoryManagerState.lastOptimizationTime = Date.now();
    
    return result;
  } catch (error) {
    console.error('강제 메모리 최적화 중 오류:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 강제 가비지 컬렉션 수행
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} GC 결과
 */
async function performGarbageCollection(emergency = false) {
  try {
    console.log(`강제 가비지 컬렉션 수행 (긴급: ${emergency})`);
    
    let result;
    
    if (isNativeModuleAvailable()) {
      // 네이티브 GC 수행
      result = await forceGarbageCollection();
    } else {
      // JavaScript 기반 GC 수행
      if (global.gc) {
        global.gc(emergency);
        result = { success: true };
      } else {
        result = { success: false, error: 'JavaScript GC is not available' };
      }
    }
    
    return result;
  } catch (error) {
    console.error('가비지 컬렉션 중 오류:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 현재 메모리 사용량 가져오기
 * @returns {Promise<Object>} 메모리 정보
 */
async function getCurrentMemoryUsage() {
  try {
    if (isNativeModuleAvailable()) {
      // 네이티브 메모리 정보 사용
      return await getMemoryInfo();
    } else {
      // JavaScript 메모리 정보 사용
      const memoryUsage = process.memoryUsage();
      
      return {
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        rss: memoryUsage.rss,
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        timestamp: Date.now()
      };
    }
  } catch (error) {
    console.error('메모리 사용량 가져오기 중 오류:', error);
    return {
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 메모리 관리자 상태 가져오기
 * @returns {Object} 메모리 관리자 상태
 */
function getMemoryManagerStats() {
  return {
    ...memoryManagerState,
    timestamp: Date.now()
  };
}

// 모듈 내보내기
module.exports = {
  initializeMemoryManager,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  checkAndOptimizeMemory,
  forceMemoryOptimization,
  performGarbageCollection,
  getCurrentMemoryUsage,
  getMemoryManagerStats
};
