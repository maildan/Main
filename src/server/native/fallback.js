/**
 * 네이티브 모듈 폴백 구현
 * 
 * Rust 네이티브 모듈을 사용할 수 없을 때 기본 JavaScript 구현을 제공합니다.
 */
const { performance } = require('perf_hooks');

// 모듈 상태 추적
const moduleState = {
  available: true,
  lastError: null,
  initialized: true,
  metrics: {
    calls: 0,
    errors: 0,
    lastCall: 0,
    totalExecutionTime: 0
  }
};

// 메모리 관련 함수
function getMemoryInfo() {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const start = performance.now();
    
    // Node.js 메모리 사용량 가져오기
    const memoryUsage = process.memoryUsage();
    
    // 메모리 정보 구성
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const heapUsedMB = Math.round((heapUsed / (1024 * 1024)) * 100) / 100;
    const percentUsed = Math.round((heapUsed / heapTotal) * 10000) / 100;
    
    const executionTime = performance.now() - start;
    moduleState.metrics.totalExecutionTime += executionTime;
    
    return {
      heap_used: heapUsed,
      heap_total: heapTotal,
      heap_limit: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      array_buffers: memoryUsage.arrayBuffers,
      heap_used_mb: heapUsedMB,
      rss_mb: Math.round((memoryUsage.rss / (1024 * 1024)) * 100) / 100,
      percent_used: percentUsed,
      timestamp: Date.now()
    };
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('메모리 정보 가져오기 오류:', error);
    
    // 기본값 반환
    return {
      heap_used: 0,
      heap_total: 0,
      heap_limit: 0,
      rss: 0,
      external: 0,
      heap_used_mb: 0,
      rss_mb: 0,
      percent_used: 0,
      timestamp: Date.now()
    };
  }
}

// 최적화 레벨 결정
function determineOptimizationLevel() {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const usedRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    if (usedRatio > 0.9) return 4; // Critical
    if (usedRatio > 0.8) return 3; // High
    if (usedRatio > 0.7) return 2; // Medium
    if (usedRatio > 0.5) return 1; // Low
    return 0; // Normal
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('최적화 레벨 결정 오류:', error);
    return 0;
  }
}

// 가비지 컬렉션 요청
function requestGarbageCollection() {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const start = performance.now();
    const memoryBefore = process.memoryUsage();
    
    // Node.js의 GC 시도
    if (global.gc) {
      global.gc();
    } else {
      // GC를 직접 호출할 수 없는 경우 메모리를 강제로 해제하기 위한 시도
      const tempObjects = [];
      for (let i = 0; i < 10; i++) {
        tempObjects.push(new Array(10000).fill('x'));
      }
      tempObjects.length = 0;
    }
    
    const memoryAfter = process.memoryUsage();
    const executionTime = performance.now() - start;
    moduleState.metrics.totalExecutionTime += executionTime;
    
    const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
    const freedMB = freedMemory / (1024 * 1024);
    
    return JSON.stringify({
      success: true,
      timestamp: Date.now(),
      freed_memory: freedMemory,
      freed_mb: freedMB,
      duration_ms: Math.round(executionTime)
    });
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('GC 요청 오류:', error);
    
    return JSON.stringify({
      success: false,
      timestamp: Date.now(),
      error: error.message
    });
  }
}

// 메모리 최적화
function optimizeMemory(level = 2, emergency = false) {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const start = performance.now();
    
    const memoryBefore = getMemoryInfo();
    
    // 가비지 컬렉션 요청
    requestGarbageCollection(emergency);
    
    const memoryAfter = getMemoryInfo();
    
    const executionTime = performance.now() - start;
    moduleState.metrics.totalExecutionTime += executionTime;
    
    return {
      success: true,
      level,
      emergency,
      memoryBefore,
      memoryAfter,
      freedMemory: memoryBefore.heap_used - memoryAfter.heap_used,
      freedMB: Math.round((memoryBefore.heap_used - memoryAfter.heap_used) / (1024 * 1024) * 100) / 100,
      timestamp: Date.now()
    };
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('메모리 최적화 오류:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// 네이티브 모듈 사용 가능 여부 확인
function isNativeModuleAvailable() {
  return false; // 폴백 모듈이므로 항상 false 반환
}

// 모듈 내보내기
module.exports = {
  getMemoryInfo,
  determineOptimizationLevel,
  requestGarbageCollection,
  optimizeMemory,
  isNativeModuleAvailable,
  moduleState
};
