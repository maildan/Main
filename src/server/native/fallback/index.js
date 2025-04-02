
/**
 * 네이티브 모듈 JavaScript 폴백 구현
 * 
 * 네이티브 모듈을 로드할 수 없을 때 기본 기능을 제공합니다.
 */
const os = require('os');

// 상태 관리
const state = {
  startTime: Date.now(),
  callCount: 0,
  gpuEnabled: false
};

// 유틸리티 함수
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 메모리 정보 가져오기
 * @returns {string} JSON 형식의 메모리 정보
 */
function get_memory_info() {
  const memoryUsage = process.memoryUsage();
  
  return JSON.stringify({
    heap_used: memoryUsage.heapUsed,
    heap_total: memoryUsage.heapTotal,
    heap_limit: memoryUsage.heapTotal * 2,
    heap_used_mb: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100,
    percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 10) / 10,
    rss: memoryUsage.rss,
    rss_mb: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100,
    external: memoryUsage.external,
    timestamp: getCurrentTimestamp(),
    success: true
  });
}

/**
 * 최적화 레벨 결정
 * @param {Object} memoryInfo 메모리 정보 객체
 * @param {boolean} emergency 긴급 여부
 * @returns {number} 최적화 레벨 (1-4)
 */
function determine_optimization_level(memoryInfo, emergency = false) {
  if (emergency) return 4;
  
  if (!memoryInfo) {
    const memUsage = process.memoryUsage();
    const percentUsed = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (percentUsed > 90) return 3;
    if (percentUsed > 70) return 2;
    return 1;
  }
  
  const memInfo = typeof memoryInfo === 'string' ? JSON.parse(memoryInfo) : memoryInfo;
  const percentUsed = memInfo.percent_used || (memInfo.heap_used / memInfo.heap_total) * 100;
  
  if (percentUsed > 90) return 3;
  if (percentUsed > 70) return 2;
  return 1;
}

/**
 * 메모리 최적화 수행
 * @param {number} level 최적화 레벨
 * @param {boolean} emergency 긴급 모드 여부
 * @returns {string} JSON 형식의 결과
 */
function optimize_memory(level = 2, emergency = false) {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = getCurrentTimestamp();
  
  // 최대한 메모리 확보 시도
  if (global.gc) {
    global.gc();
  }
  
  // 대용량 객체 초기화로 간접적 GC 촉진
  for (let i = 0; i < 3; i++) {
    const temp = new Array(1000).fill(0);
    temp.length = 0;
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  const freedMemory = Math.max(0, startMemory - endMemory);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
  
  return JSON.stringify({
    success: true,
    optimization_level: level,
    emergency,
    freed_memory: freedMemory,
    freed_mb: freedMB,
    duration: getCurrentTimestamp() - startTime,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * 가비지 컬렉션 강제 수행
 * @returns {string} JSON 형식의 결과
 */
function force_garbage_collection() {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = getCurrentTimestamp();
  
  // 실제 GC 수행
  if (global.gc) {
    global.gc();
  } else {
    // GC 직접 호출이 불가능하면 간접적으로 유도
    const tempObjects = [];
    for (let i = 0; i < 10; i++) {
      tempObjects.push(new Array(10000).fill(0));
    }
    tempObjects.length = 0;
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  const freedMemory = Math.max(0, startMemory - endMemory);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
  
  return JSON.stringify({
    success: true,
    freed_memory: freedMemory,
    freed_mb: freedMB,
    duration: getCurrentTimestamp() - startTime,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * GC 요청 (force_garbage_collection의 별칭)
 */
function request_garbage_collection() {
  return force_garbage_collection();
}

/**
 * GPU 가속 가능 여부 확인
 * @returns {boolean} GPU 가속 가능 여부
 */
function is_gpu_acceleration_available() {
  return false; // 폴백에서는 항상 불가능
}

/**
 * GPU 가속 활성화
 * @returns {boolean} 성공 여부
 */
function enable_gpu_acceleration() {
  state.gpuEnabled = false; // 폴백에서는 활성화 불가
  return false;
}

/**
 * GPU 가속 비활성화
 * @returns {boolean} 성공 여부
 */
function disable_gpu_acceleration() {
  state.gpuEnabled = false;
  return true; // 이미 비활성화 상태이므로 항상 성공
}

/**
 * GPU 정보 가져오기
 * @returns {string} JSON 형식의 GPU 정보
 */
function get_gpu_info() {
  return JSON.stringify({
    success: true,
    name: 'JavaScript Fallback',
    vendor: 'JavaScript',
    driver_info: 'Fallback Implementation',
    device_type: 'Software',
    backend: 'JavaScript',
    available: false,
    acceleration_enabled: state.gpuEnabled,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * GPU 계산 수행
 * @param {Object} data 계산 데이터
 * @param {string} computationType 계산 유형
 * @returns {string} JSON 형식의 결과
 */
function perform_gpu_computation(data, computationType = 'default') {
  return JSON.stringify({
    success: false,
    task_type: computationType,
    duration_ms: 0,
    result: null,
    error: 'GPU 계산을 사용할 수 없습니다 (JavaScript 폴백)',
    timestamp: getCurrentTimestamp()
  });
}

/**
 * 네이티브 모듈 버전 정보 가져오기
 * @returns {string} 버전 정보
 */
function get_native_module_version() {
  return '0.1.0-js-fallback';
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
  perform_gpu_computation,
  
  // 상태 확인
  is_native_module_available: () => false
};
