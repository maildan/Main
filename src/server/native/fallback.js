/**
 * 네이티브 모듈 JavaScript 폴백 구현
 * 
 * 이 모듈은 네이티브 모듈이 로드되지 않을 때 사용됩니다.
 * 자체 기능을 모두 JavaScript로 구현합니다.
 */

const { performance } = require('perf_hooks');
const os = require('os');

// 폴백 모듈 상태
const moduleState = {
  isAvailable: false,
  isFallback: true,
  initTime: Date.now(),
  metrics: {
    calls: 0,
    errors: 0,
    totalExecutionTime: 0,
    lastCall: null
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

function determineOptimizationLevel(memoryUsedMB, threshold = 100) {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  // 메모리 사용량 기준 최적화 레벨 결정
  const memoryInfo = getMemoryInfo();
  const usedMB = memoryUsedMB || memoryInfo.heap_used_mb;
  
  if (usedMB > threshold * 2) {
    return 4; // Critical
  } else if (usedMB > threshold * 1.5) {
    return 3; // High
  } else if (usedMB > threshold) {
    return 2; // Medium
  } else if (usedMB > threshold * 0.7) {
    return 1; // Low
  } else {
    return 0; // Normal
  }
}

function requestGarbageCollection(emergency = false) {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const start = performance.now();
    
    const memoryBefore = getMemoryInfo();
    
    // 가비지 컬렉션 요청
    if (global.gc) {
      global.gc();
    } else {
      // GC 간접 유도
      const tmp = [];
      for (let i = 0; i < 1000; i++) {
        tmp.push(new Array(10000).fill(0));
      }
      tmp.length = 0;
    }
    
    const memoryAfter = getMemoryInfo();
    
    const executionTime = performance.now() - start;
    moduleState.metrics.totalExecutionTime += executionTime;
    
    return {
      success: true,
      memoryBefore,
      memoryAfter,
      freedMemory: memoryBefore.heap_used - memoryAfter.heap_used,
      freedMB: Math.round((memoryBefore.heap_used - memoryAfter.heap_used) / (1024 * 1024) * 100) / 100,
      timestamp: Date.now()
    };
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('가비지 컬렉션 요청 오류:', error);
    return { success: false, error: error.message, timestamp: Date.now() };
  }
}

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
    return { success: false, error: error.message, timestamp: Date.now() };
  }
}

// GPU 관련 함수 - 심플 폴백 구현
function isGpuAccelerationAvailable() {
  return false; // 폴백 모듈은 GPU 가속화 지원 안함
}

function getGpuInfo() {
  return JSON.stringify({
    available: false,
    acceleration_enabled: false,
    device_name: 'JavaScript Fallback',
    device_type: 'Software',
    vendor: 'Fallback Mode',
    driver_version: '1.0.0',
    timestamp: Date.now()
  });
}

function performGpuComputation(data, computationType) {
  moduleState.metrics.calls++;
  moduleState.metrics.lastCall = Date.now();
  
  try {
    const start = performance.now();
    
    // 작업 유형에 따른 간단한 폴백 처리
    let result;
    
    switch (computationType) {
      case 'textAnalysis':
        // 텍스트 분석 폴백
        result = {
          word_count: (data.text || '').split(/\s+/).filter(Boolean).length,
          char_count: (data.text || '').length,
          complexity_score: 0,
          gpu_accelerated: false
        };
        break;
        
      case 'typingStatistics':
        // 타이핑 통계 폴백
        const keyCount = data.keyCount || 0;
        const typingTime = data.typingTime || 0;
        const errors = data.errors || 0;
        
        const wpm = typingTime > 0 ? (keyCount / 5) / (typingTime / 60000) : 0;
        const accuracy = keyCount > 0 ? 100 - ((errors / keyCount) * 100) : 0;
        
        result = {
          wpm,
          accuracy,
          key_count: keyCount,
          errors,
          time_ms: typingTime
        };
        break;
        
      default:
        result = { message: '폴백 모드에서는 지원되지 않는 계산 유형입니다' };
    }
    
    const executionTime = performance.now() - start;
    moduleState.metrics.totalExecutionTime += executionTime;
    
    return {
      success: true,
      result,
      computationType,
      executionTime,
      timestamp: Date.now()
    };
  } catch (error) {
    moduleState.metrics.errors++;
    console.error('GPU 계산 오류:', error);
    return { success: false, error: error.message, timestamp: Date.now() };
  }
}

// 유틸리티 함수
function getNativeModuleInfo() {
  return {
    isAvailable: moduleState.isAvailable,
    isFallback: moduleState.isFallback,
    initTime: moduleState.initTime,
    metrics: { ...moduleState.metrics },
    version: 'JS-Fallback-1.0.0',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    timestamp: Date.now()
  };
}

// 모듈 내보내기
module.exports = {
  // 메모리 관련
  getMemoryInfo,
  determineOptimizationLevel,
  requestGarbageCollection,
  optimizeMemory,
  
  // GPU 관련
  isGpuAccelerationAvailable,
  getGpuInfo,
  performGpuComputation,
  
  // 유틸리티
  getNativeModuleInfo,
  
  // 스네이크 케이스 별칭 (원래 함수 이름)
  get_memory_info: getMemoryInfo,
  determine_optimization_level: determineOptimizationLevel,
  request_garbage_collection: requestGarbageCollection,
  optimize_memory: optimizeMemory,
  is_gpu_acceleration_available: isGpuAccelerationAvailable,
  get_gpu_info: getGpuInfo,
  perform_gpu_computation: performGpuComputation,
  get_native_module_info: getNativeModuleInfo
};
