/**
 * 네이티브 모듈 폴백 구현
 * 네이티브 모듈을 로드할 수 없을 때 기본적인 기능을 제공합니다.
 */

const os = require('os');
const { Worker } = require('worker_threads');
const { performance } = require('perf_hooks');
const path = require('path');

// 모듈 상태
const state = {
  memoryPools: new Map(),
  workerPool: {
    initialized: false,
    threads: [],
    tasks: new Map(),
    stats: {
      active: 0,
      completed: 0,
      failed: 0,
      lastTaskId: 0
    }
  },
  gpu: {
    enabled: false,
    lastOperation: null
  },
  startTime: Date.now()
};

/**
 * 현재 타임스탬프 가져오기
 * @returns {number} 현재 타임스탬프(ms)
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 고유 작업 ID 생성
 * @returns {string} 작업 ID
 */
function generateTaskId() {
  const id = ++state.workerPool.stats.lastTaskId;
  return `task_${id}_${Date.now()}`;
}

/**
 * 작업 폴백 구현 (동기)
 * @param {string} taskType 작업 유형
 * @param {string} data 작업 데이터
 * @returns {Object} 작업 결과
 */
function processTaskSync(taskType, data) {
  const startTime = performance.now();
  let result;
  
  try {
    switch (taskType) {
      case 'optimize_memory':
        result = {
          success: true,
          message: '메모리 최적화 완료 (JS 폴백)',
          optimization_level: 2,
          freed_mb: 0
        };
        break;
      
      case 'echo':
        result = {
          success: true,
          message: `Echo: ${data}`
        };
        break;
      
      case 'compute':
        result = {
          success: true,
          message: '계산 완료 (JS 폴백)',
          value: Math.random() * 100
        };
        break;
      
      default:
        result = {
          success: false,
          message: `알 수 없는 작업 유형: ${taskType}`
        };
    }
    
    const duration = performance.now() - startTime;
    
    return {
      ...result,
      task_type: taskType,
      duration_ms: duration,
      timestamp: getCurrentTimestamp()
    };
  } catch (error) {
    return {
      success: false,
      task_type: taskType,
      error: error.message,
      duration_ms: performance.now() - startTime,
      timestamp: getCurrentTimestamp()
    };
  }
}

/**
 * 메모리 정보 가져오기
 * @returns {string} JSON 형식의 메모리 정보
 */
function get_memory_info() {
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed;
  const heapTotal = memoryUsage.heapTotal;
  const rss = memoryUsage.rss;
  
  // MB 단위로 변환
  const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 100) / 100;
  const heapTotalMB = Math.round(heapTotal / (1024 * 1024) * 100) / 100;
  const rssMB = Math.round(rss / (1024 * 1024) * 100) / 100;
  
  const result = {
    success: true,
    timestamp: getCurrentTimestamp(),
    heap_used: heapUsed,
    heap_total: heapTotal,
    rss: rss,
    heap_used_mb: heapUsedMB,
    heap_total_mb: heapTotalMB,
    rss_mb: rssMB,
    percent_used: Math.round((heapUsed / heapTotal) * 100),
    error: null
  };
  
  return JSON.stringify(result);
}

/**
 * 최적화 수준 결정
 * @returns {number} 최적화 수준 (0-4)
 */
function determine_optimization_level() {
  const memoryUsage = process.memoryUsage();
  const ratio = memoryUsage.heapUsed / memoryUsage.heapTotal;
  
  if (ratio > 0.9) return 4; // Critical
  if (ratio > 0.8) return 3; // High
  if (ratio > 0.7) return 2; // Medium
  if (ratio > 0.5) return 1; // Low
  return 0; // Normal
}

/**
 * 메모리 최적화 수행
 * @param {string} level 최적화 레벨 - 'normal', 'low', 'medium', 'high', 'critical'
 * @param {boolean} emergency 긴급 모드 여부
 * @returns {string} JSON 형식의 최적화 결과
 */
function optimize_memory(level = 'medium', emergency = false) {
  const startTime = performance.now();
  
  // 메모리 최적화 전 상태
  const memoryBefore = process.memoryUsage();
  
  // 가비지 컬렉션 요청
  if (global.gc) {
    global.gc();
  }
  
  // 대용량 배열 생성 및 삭제로 GC 유도
  try {
    const arrSize = emergency ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 50MB 또는 100MB
    const arr = new Array(arrSize / 8).fill(0); // 8바이트 단위로 나눔 (number 타입)
    arr.length = 0;
  } catch (error) {
    console.warn('메모리 할당 중 오류:', error);
  }
  
  // 메모리 해제를 위한 대기
  const endTime = performance.now();
  
  // 메모리 최적화 후 상태
  const memoryAfter = process.memoryUsage();
  
  // 해제된 메모리 계산
  const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
  
  const result = {
    success: true,
    timestamp: getCurrentTimestamp(),
    optimization_level: level,
    memory_before: {
      heap_used: memoryBefore.heapUsed,
      heap_total: memoryBefore.heapTotal,
      heap_used_mb: memoryBefore.heapUsed / (1024 * 1024),
      percent_used: Math.round((memoryBefore.heapUsed / memoryBefore.heapTotal) * 100)
    },
    memory_after: {
      heap_used: memoryAfter.heapUsed,
      heap_total: memoryAfter.heapTotal,
      heap_used_mb: memoryAfter.heapUsed / (1024 * 1024),
      percent_used: Math.round((memoryAfter.heapUsed / memoryAfter.heapTotal) * 100)
    },
    freed_memory: freedMemory,
    freed_mb: freedMemory / (1024 * 1024),
    duration: endTime - startTime,
    error: null
  };
  
  return JSON.stringify(result);
}

/**
 * 가비지 컬렉션 강제 수행
 * @returns {string} JSON 형식의 GC 결과
 */
function force_garbage_collection() {
  const startTime = performance.now();
  
  // 메모리 GC 전 상태
  const memoryBefore = process.memoryUsage();
  
  // 가비지 컬렉션 요청 (--expose-gc가 활성화된 경우 작동)
  if (global.gc) {
    global.gc();
    
    // 메모리 GC 후 상태
    const memoryAfter = process.memoryUsage();
    
    // 해제된 메모리 계산 (heapUsed 감소량)
    const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
    
    const result = {
      success: true,
      timestamp: getCurrentTimestamp(),
      freed_memory: freedMemory,
      freed_mb: freedMemory / (1024 * 1024),
      duration: performance.now() - startTime,
      error: null
    };
    
    return JSON.stringify(result);
  }
  
  // GC 실행 불가능한 경우
  const result = {
    success: false,
    timestamp: getCurrentTimestamp(),
    freed_memory: 0,
    freed_mb: 0,
    duration: performance.now() - startTime,
    error: '가비지 컬렉션을 직접 호출할 수 없습니다. Node.js 실행 시 --expose-gc 플래그를 사용하세요.'
  };
  
  return JSON.stringify(result);
}

/**
 * GPU 가속 가능 여부 확인
 * @returns {boolean} GPU 가속 가능 여부 (항상 false)
 */
function is_gpu_acceleration_available() {
  return false;
}

/**
 * GPU 가속 활성화 (폴백에서는 항상 실패)
 * @returns {boolean} 성공 여부 (항상 false)
 */
function enable_gpu_acceleration() {
  state.gpu.enabled = false;
  return false;
}

/**
 * GPU 가속 비활성화
 * @returns {boolean} 성공 여부 (항상 true)
 */
function disable_gpu_acceleration() {
  state.gpu.enabled = false;
  return true;
}

/**
 * GPU 정보 가져오기
 * @returns {string} JSON 형식의 GPU 정보
 */
function get_gpu_info() {
  const result = {
    success: true,
    timestamp: getCurrentTimestamp(),
    name: 'Software Renderer',
    vendor: 'JavaScript Fallback',
    driver_info: 'Pure JavaScript implementation',
    device_type: 'CPU',
    backend: 'JavaScript',
    available: true,
    acceleration_enabled: false,
    settings_enabled: false,
    processing_mode: 'normal'
  };
  
  return JSON.stringify(result);
}

/**
 * GPU 계산 수행 (동기)
 * @param {string} data 계산 데이터
 * @param {string} computationType 계산 유형
 * @returns {string} JSON 형식의 계산 결과
 */
function perform_gpu_computation_sync(data, computationType) {
  const startTime = performance.now();
  
  // 계산 유형별 가상 구현
  let result;
  
  try {
    switch (computationType) {
      case 'matrix':
        result = {
          success: true,
          task_type: 'matrix',
          result: JSON.stringify({
            dimensions: [10, 10],
            sample: '행렬 계산 결과 (JS 폴백)'
          }),
          error: null
        };
        break;
      
      case 'text':
        result = {
          success: true,
          task_type: 'text',
          result: JSON.stringify({
            word_count: data.split(' ').length,
            sample: '텍스트 분석 결과 (JS 폴백)'
          }),
          error: null
        };
        break;
      
      case 'image':
        result = {
          success: true,
          task_type: 'image',
          result: JSON.stringify({
            dimensions: [800, 600],
            sample: '이미지 처리 결과 (JS 폴백)'
          }),
          error: null
        };
        break;
      
      default:
        result = {
          success: false,
          task_type: computationType,
          result: null,
          error: `지원되지 않는 계산 유형: ${computationType}`
        };
    }
    
    // 상태 업데이트
    state.gpu.lastOperation = {
      type: computationType,
      timestamp: getCurrentTimestamp()
    };
    
    // 공통 필드 추가
    result.duration_ms = performance.now() - startTime;
    result.timestamp = getCurrentTimestamp();
    
    return JSON.stringify(result);
  } catch (error) {
    const errorResult = {
      success: false,
      task_type: computationType,
      duration_ms: performance.now() - startTime,
      result: null,
      error: error.message,
      timestamp: getCurrentTimestamp()
    };
    
    return JSON.stringify(errorResult);
  }
}

/**
 * GPU 계산 수행 (비동기 버전)
 * @param {string} data 계산 데이터
 * @param {string} computationType 계산 유형
 * @returns {Promise<string>} JSON 형식의 계산 결과
 */
async function perform_gpu_computation(data, computationType) {
  // 약간의 비동기 지연 추가
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 동기 함수 호출
  return perform_gpu_computation_sync(data, computationType);
}

/**
 * 워커 풀 초기화
 * @param {number} threadCount 스레드 수
 * @returns {boolean} 성공 여부
 */
function initialize_worker_pool(threadCount) {
  if (state.workerPool.initialized) {
    return true;
  }
  
  const threads = threadCount || Math.max(1, os.cpus().length - 1);
  
  try {
    // 스레드 수 저장
    state.workerPool.threads = new Array(threads).fill(null);
    state.workerPool.initialized = true;
    
    return true;
  } catch (error) {
    console.error('워커 풀 초기화 오류:', error);
    return false;
  }
}

/**
 * 워커 풀 종료
 * @returns {boolean} 성공 여부
 */
function shutdown_worker_pool() {
  if (!state.workerPool.initialized) {
    return true;
  }
  
  try {
    // 워커 풀 상태 재설정
    state.workerPool.threads = [];
    state.workerPool.tasks.clear();
    state.workerPool.initialized = false;
    
    return true;
  } catch (error) {
    console.error('워커 풀 종료 오류:', error);
    return false;
  }
}

/**
 * 작업 제출
 * @param {string} taskType 작업 유형
 * @param {string} data 작업 데이터
 * @returns {Promise<string>} JSON 형식의 작업 결과
 */
async function submit_task(taskType, data) {
  if (!state.workerPool.initialized) {
    return JSON.stringify({
      success: false,
      task_id: null,
      task_type: taskType,
      duration_ms: 0,
      result: null,
      error: '워커 풀이 초기화되지 않았습니다',
      timestamp: getCurrentTimestamp()
    });
  }
  
  const taskId = generateTaskId();
  const startTime = performance.now();
  
  try {
    // 활성 작업 수 증가
    state.workerPool.stats.active++;
    
    // 약간의 비동기 지연 추가
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // 작업 처리 (동기 함수 호출)
    const taskResult = processTaskSync(taskType, data);
    
    // 작업 완료 통계 업데이트
    state.workerPool.stats.active--;
    state.workerPool.stats.completed++;
    
    const result = {
      success: true,
      task_id: taskId,
      task_type: taskType,
      duration_ms: performance.now() - startTime,
      result: JSON.stringify(taskResult),
      error: null,
      timestamp: getCurrentTimestamp()
    };
    
    return JSON.stringify(result);
  } catch (error) {
    // 실패 통계 업데이트
    state.workerPool.stats.active--;
    state.workerPool.stats.failed++;
    
    const result = {
      success: false,
      task_id: taskId,
      task_type: taskType,
      duration_ms: performance.now() - startTime,
      result: null,
      error: error.message,
      timestamp: getCurrentTimestamp()
    };
    
    return JSON.stringify(result);
  }
}

/**
 * 워커 풀 통계 가져오기
 * @returns {string} JSON 형식의 워커 풀 통계
 */
function get_worker_pool_stats() {
  const threadCount = state.workerPool.threads.length;
  
  const stats = {
    thread_count: threadCount,
    active_tasks: state.workerPool.stats.active,
    completed_tasks: state.workerPool.stats.completed,
    active_workers: 0,
    idle_workers: threadCount,
    pending_tasks: 0,
    failed_tasks: state.workerPool.stats.failed,
    total_tasks: state.workerPool.stats.completed + state.workerPool.stats.failed,
    uptime_ms: Date.now() - state.startTime,
    timestamp: getCurrentTimestamp()
  };
  
  return JSON.stringify(stats);
}

/**
 * 네이티브 모듈 버전 가져오기
 * @returns {string} 버전 정보
 */
function get_native_module_version() {
  return 'typing_stats_native v0.1.0-js-fallback';
}

/**
 * 네이티브 모듈 정보 가져오기
 * @returns {string} JSON 형식의 모듈 정보
 */
function get_native_module_info() {
  const info = {
    name: 'typing-stats-native',
    version: '0.1.0-js-fallback',
    description: 'JavaScript fallback for typing-stats-native',
    features: {
      memory_optimization: true,
      gpu_acceleration: false,
      worker_threads: true
    },
    system: {
      os: process.platform,
      arch: process.arch,
      cpu_cores: os.cpus().length,
      node_version: process.version
    }
  };
  
  return JSON.stringify(info);
}

/**
 * 타임스탬프 가져오기
 * @returns {number} 현재 타임스탬프
 */
function get_timestamp() {
  return getCurrentTimestamp();
}

/**
 * 네이티브 모듈 초기화
 * @returns {boolean} 성공 여부
 */
function initialize_native_modules() {
  state.startTime = Date.now();
  console.log('[JS-Fallback] JavaScript 폴백 모듈이 초기화되었습니다');
  return true;
}

/**
 * 네이티브 모듈 정리
 * @returns {boolean} 성공 여부
 */
function cleanup_native_modules() {
  console.log('[JS-Fallback] JavaScript 폴백 모듈이 정리되었습니다');
  return true;
}

/**
 * 텍스트 처리 작업 수행 (가상)
 * @param {string} text 처리할 텍스트
 * @returns {string} JSON 형식의 결과
 */
function process_text(text) {
  const result = {
    success: true,
    timestamp: getCurrentTimestamp(),
    charCount: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    error: null
  };
  
  return JSON.stringify(result);
}

// 모듈 내보내기
module.exports = {
  // 기본 모듈 정보
  get_native_module_version,
  get_native_module_info,
  initialize_native_modules,
  cleanup_native_modules,
  
  // 메모리 관리 함수
  get_memory_info,
  determine_optimization_level,
  optimize_memory,
  force_garbage_collection,
  
  // GPU 관련 함수
  is_gpu_acceleration_available,
  enable_gpu_acceleration,
  disable_gpu_acceleration,
  get_gpu_info,
  perform_gpu_computation_sync,
  perform_gpu_computation,
  
  // 워커 관련 함수
  initialize_worker_pool,
  shutdown_worker_pool,
  submit_task,
  get_worker_pool_stats,
  
  // 유틸리티 함수
  get_timestamp,
  process_text,
  
  // 가독성을 위한 별칭 추가
  getMemoryInfo: get_memory_info,
  forceGarbageCollection: force_garbage_collection,
  optimizeMemory: optimize_memory,
  getGpuInfo: get_gpu_info,
  enableGpuAcceleration: enable_gpu_acceleration,
  disableGpuAcceleration: disable_gpu_acceleration,
  processText: process_text
};
