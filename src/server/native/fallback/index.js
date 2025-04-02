/**
 * 네이티브 모듈 폴백 구현
 * 네이티브 모듈을 로드할 수 없을 때 기본적인 기능을 제공합니다.
 */

const os = require('os');
const { Worker } = require('worker_threads');
const { performance } = require('perf_hooks');
const path = require('path');
const v8 = require('v8');

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
  try {
    const memoryUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    const result = {
      heap_used: memoryUsage.heapUsed,
      heap_total: memoryUsage.heapTotal,
      heap_limit: heapStats.heap_size_limit,
      heap_used_mb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100,
      rss: memoryUsage.rss,
      rss_mb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      external: memoryUsage.external,
      external_mb: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
      system_total: os.totalmem(),
      system_free: os.freemem(),
      system_used_percent: Math.round((1 - os.freemem() / os.totalmem()) * 100 * 100) / 100
    };
    
    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: error.message,
      heap_used: 0,
      heap_total: 0,
      heap_limit: 0,
      heap_used_mb: 0,
      percent_used: 0,
      rss: 0,
      rss_mb: 0
    });
  }
}

/**
 * 최적화 수준 결정
 * @param {Object} memoryInfo 메모리 정보 객체
 * @param {boolean} emergency 긴급 최적화 필요 여부
 * @returns {number} 최적화 레벨 (1-4)
 */
function determine_optimization_level(memoryInfo, emergency = false) {
  if (!memoryInfo) {
    return emergency ? 3 : 1;
  }

  const percentUsed = memoryInfo.percent_used || 0;

  if (emergency || percentUsed > 90) {
    return 4; // 최고 수준 (긴급)
  } else if (percentUsed > 75) {
    return 3; // 높은 수준
  } else if (percentUsed > 60) {
    return 2; // 중간 수준
  } else {
    return 1; // 낮은 수준
  }
}

/**
 * 메모리 최적화 수행
 * @param {string} level 최적화 레벨 - 'normal', 'low', 'medium', 'high', 'critical'
 * @param {boolean} emergency 긴급 모드 여부
 * @returns {string} JSON 형식의 최적화 결과
 */
function optimize_memory(level = 'medium', emergency = false) {
  try {
    const memoryBefore = process.memoryUsage().heapUsed;
    
    // JavaScript GC 수행
    if (typeof global.gc === 'function') {
      global.gc(emergency);
    }
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const freedBytes = Math.max(0, memoryBefore - memoryAfter);
    const freedMB = Math.round((freedBytes / 1024 / 1024) * 100) / 100;
    
    return JSON.stringify({
      success: true,
      level: level,
      emergency: emergency,
      freed_bytes: freedBytes,
      freed_mb: freedMB,
      message: `${freedMB}MB 메모리 정리됨`,
      timestamp: Date.now()
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message,
      level: level,
      emergency: emergency,
      freed_mb: 0,
      timestamp: Date.now()
    });
  }
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
 * 가비지 컬렉션을 요청합니다.
 * @param {boolean} emergency 긴급 여부
 * @returns {string} JSON 문자열 형태의 결과
 */
function request_garbage_collection(emergency = false) {
  try {
    const memoryBefore = process.memoryUsage().heapUsed;
    
    // JavaScript GC 수행
    if (typeof global.gc === 'function') {
      global.gc(emergency);
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const freedBytes = Math.max(0, memoryBefore - memoryAfter);
      const freedMB = Math.round((freedBytes / 1024 / 1024) * 100) / 100;
      
      return JSON.stringify({
        success: true,
        freed_bytes: freedBytes,
        freed_mb: freedMB,
        message: `${freedMB}MB 메모리 정리됨`,
        timestamp: Date.now()
      });
    } else {
      return JSON.stringify({
        success: false,
        message: 'GC를 사용할 수 없습니다. --expose-gc 옵션을 사용하세요.',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message,
      message: 'GC 요청 중 오류 발생',
      timestamp: Date.now()
    });
  }
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
  // 기기 유형에 따라 다른 정보 반환 (모바일, 내장, 독립 GPU 지원)
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // GPU 유형 판단 (기기 환경에 따라 다른 값 반환)
  let deviceType = 'Integrated'; // 기본값은 내장 GPU
  let deviceName = 'Generic GPU';
  let vendor = 'JavaScript Fallback';
  
  // 모바일 기기인 경우
  if (isMobile) {
    deviceType = 'Mobile';
    deviceName = 'Mobile GPU';
    vendor = 'Mobile Device';
  }
  // Node.js 환경인 경우
  else if (typeof process !== 'undefined' && process.release && process.release.name === 'node') {
    deviceType = 'Software';
    deviceName = 'Software Renderer';
    vendor = 'Node.js';
  }
  
  // GPU 정보 반환
  const result = {
    success: true,
    timestamp: Date.now(),
    name: deviceName,
    vendor: vendor,
    driver_info: 'JavaScript Fallback Implementation',
    device_type: deviceType,
    backend: 'JavaScript',
    available: true,
    acceleration_enabled: false,
    settings_enabled: false,
    processing_mode: 'normal',
    performance_class: deviceType === 'Discrete' ? 3 : (deviceType === 'Integrated' ? 2 : 1)
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
  return '0.1.0-fallback';
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
  request_garbage_collection,
  
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
