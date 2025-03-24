/**
 * Rust 네이티브 모듈 래퍼
 * 이 파일은 Rust 네이티브 모듈과 JavaScript 코드 간의 인터페이스를 제공합니다.
 */

const path = require('path');
const fs = require('fs');
const { debugLog } = require('../../main/utils');

// 네이티브 모듈 로드 경로 (개발 환경과 프로덕션 환경에 따라 다름)
const nativeModulePath = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, '../../../native-modules/target/debug/typing_stats_native.node')
  : path.join(__dirname, './typing_stats_native.node');

// 폴백 모듈 경로
const fallbackModulePath = path.join(__dirname, './fallback/index.js');

// 네이티브 모듈이 있는지 확인
let nativeModule = null;
let isNativeAvailable = false;
let usingFallback = false;

try {
  // 실제 네이티브 모듈 로드 시도
  if (fs.existsSync(nativeModulePath)) {
    nativeModule = require(nativeModulePath);
    isNativeAvailable = true;
    debugLog('Rust 네이티브 모듈 로드 성공:', nativeModulePath);
    
    // 모듈 초기화
    try {
      nativeModule.initialize_native_modules();
      
      // 종료 시 정리 함수 등록
      process.on('exit', () => {
        try {
          if (nativeModule) {
            nativeModule.cleanup_native_modules();
          }
        } catch (e) {
          console.error('네이티브 모듈 정리 중 오류:', e);
        }
      });
    } catch (initError) {
      console.error('네이티브 모듈 초기화 실패:', initError);
      isNativeAvailable = false;
      nativeModule = null;
    }
  } else {
    debugLog('Rust 네이티브 모듈을 찾을 수 없음:', nativeModulePath);
  }
} catch (loadError) {
  console.error('Rust 네이티브 모듈 로드 실패:', loadError);
}

// 네이티브 모듈 로드 실패 시 폴백 모듈 사용
if (!isNativeAvailable) {
  try {
    if (fs.existsSync(fallbackModulePath)) {
      nativeModule = require(fallbackModulePath);
      usingFallback = true;
      debugLog('JS 폴백 모듈 로드 성공');
      isNativeAvailable = true; // 폴백이 로드되었으므로 사용 가능 상태
    } else {
      debugLog('JS 폴백 모듈을 찾을 수 없음:', fallbackModulePath);
    }
  } catch (fallbackError) {
    console.error('JS 폴백 모듈 로드 실패:', fallbackError);
  }
}

// 인증 함수: 네이티브 모듈이 있는지 확인하고, 없으면 기본값 반환하는 헬퍼
const withNative = (fn, defaultValue) => {
  return (...args) => {
    if (!isNativeAvailable || !nativeModule) {
      return defaultValue;
    }
    
    try {
      return fn(...args);
    } catch (error) {
      console.error(`네이티브 모듈 함수 실행 중 오류: ${error.message}`);
      return defaultValue;
    }
  };
};

// 비동기 인증 함수: 프로미스를 반환하는 네이티브 함수용
const withNativeAsync = (fn, defaultValue) => {
  return async (...args) => {
    if (!isNativeAvailable || !nativeModule) {
      return defaultValue;
    }
    
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`비동기 네이티브 모듈 함수 실행 중 오류: ${error.message}`);
      return defaultValue;
    }
  };
};

/**
 * 네이티브 모듈 상태 확인
 * @returns {boolean} 네이티브 모듈 사용 가능 여부
 */
function isNativeModuleAvailable() {
  return isNativeAvailable && nativeModule !== null;
}

/**
 * 폴백 모드 여부 확인
 * @returns {boolean} 폴백 모드 사용 여부
 */
function isFallbackMode() {
  return usingFallback;
}

/**
 * 네이티브 모듈 버전 정보 가져오기
 * @returns {string|null} 네이티브 모듈 버전 또는 null
 */
const getNativeModuleVersion = withNative(
  () => nativeModule.get_native_module_version(),
  null
);

// 메모리 최적화 관련 함수 래핑
/**
 * 메모리 사용량 정보 가져오기
 * @returns {Object|null} 메모리 사용량 정보
 */
const getMemoryInfo = withNative(
  () => {
    const jsonStr = nativeModule.memory.get_memory_info();
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  null
);

/**
 * 최적화 수준 결정
 * @returns {number} 최적화 수준 (0-4)
 */
const determineOptimizationLevel = withNative(
  () => nativeModule.memory.determine_optimization_level(),
  0
);

/**
 * 메모리 최적화 수행
 * @param {number} level 최적화 수준
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object|null>} 최적화 결과
 */
const optimizeMemory = withNativeAsync(
  async (level = 2, emergency = false) => {
    const jsonStr = nativeModule.memory.optimize_memory(level, emergency);
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  null
);

/**
 * 가비지 컬렉션 강제 수행
 * @returns {Object|null} GC 결과
 */
const forceGarbageCollection = withNative(
  () => {
    const jsonStr = nativeModule.memory.force_garbage_collection();
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  null
);

// GPU 가속 관련 함수 래핑
/**
 * GPU 가속 가능 여부 확인
 * @returns {boolean} GPU 가속 가능 여부
 */
const isGpuAccelerationAvailable = withNative(
  () => nativeModule.gpu.is_gpu_acceleration_available(),
  false
);

/**
 * GPU 가속 활성화
 * @returns {boolean} 성공 여부
 */
const enableGpuAcceleration = withNative(
  () => nativeModule.gpu.enable_gpu_acceleration(),
  false
);

/**
 * GPU 가속 비활성화
 * @returns {boolean} 성공 여부
 */
const disableGpuAcceleration = withNative(
  () => nativeModule.gpu.disable_gpu_acceleration(),
  true
);

/**
 * GPU 정보 가져오기
 * @returns {Object|null} GPU 정보
 */
const getGpuInfo = withNative(
  () => {
    const jsonStr = nativeModule.gpu.get_gpu_info();
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  null
);

/**
 * GPU 계산 수행
 * @param {string} dataJson 계산 데이터 (JSON 문자열)
 * @param {string} computationType 계산 유형
 * @returns {Promise<Object|null>} 계산 결과
 */
const performGpuComputation = withNativeAsync(
  async (dataJson, computationType) => {
    try {
      const jsonStr = nativeModule.gpu.perform_gpu_computation(dataJson, computationType);
      return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
    } catch (error) {
      // tokio_rt 문제로 함수명 변경 가능성 대비
      if (error.message.includes('not a function') && nativeModule.gpu.perform_gpu_computation_sync) {
        const jsonStr = nativeModule.gpu.perform_gpu_computation_sync(dataJson, computationType);
        return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
      }
      throw error;
    }
  },
  null
);

// 워커 스레드 관련 함수 래핑
/**
 * 워커 풀 초기화
 * @param {number} threadCount 스레드 수 (0은 자동)
 * @returns {boolean} 성공 여부
 */
const initializeWorkerPool = withNative(
  (threadCount = 0) => nativeModule.worker.initialize_worker_pool(threadCount),
  false
);

/**
 * 워커 풀 종료
 * @returns {boolean} 성공 여부
 */
const shutdownWorkerPool = withNative(
  () => nativeModule.worker.shutdown_worker_pool(),
  false
);

/**
 * 작업 제출
 * @param {string} taskType 작업 유형
 * @param {string} data 작업 데이터 (JSON 문자열)
 * @returns {Promise<Object|null>} 작업 결과
 */
const submitTask = withNativeAsync(
  async (taskType, data) => {
    try {
      // 비동기 함수 시도 (사용 가능한 경우)
      if (typeof nativeModule.worker.submit_task === 'function') {
        const jsonStr = await nativeModule.worker.submit_task(taskType, data);
        return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
      }
      
      // 동기 함수 폴백
      if (typeof nativeModule.worker.submit_task_sync === 'function') {
        const jsonStr = nativeModule.worker.submit_task_sync(taskType, data);
        return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
      }
      
      throw new Error('작업 제출 함수를 찾을 수 없습니다');
    } catch (error) {
      console.error('작업 제출 오류:', error);
      return null;
    }
  },
  null
);

/**
 * 워커 풀 통계 가져오기
 * @returns {Object|null} 워커 풀 통계
 */
const getWorkerPoolStats = withNative(
  () => {
    const jsonStr = nativeModule.worker.get_worker_pool_stats();
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  null
);

/**
 * 현재 타임스탬프 가져오기 (고성능)
 * @returns {number} 타임스탬프 (밀리초)
 */
const getTimestamp = withNative(
  () => nativeModule.utils.get_timestamp(),
  Date.now()
);

/**
 * 네이티브 모듈 정보 가져오기
 * @returns {Object} 네이티브 모듈 정보
 */
const getNativeModuleInfo = withNative(
  () => {
    const jsonStr = nativeModule.utils.get_native_module_info();
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : null;
  },
  {
    name: "typing-stats-native",
    version: "0.1.0-js-fallback",
    description: "JS fallback for native modules",
    features: {
      memory_optimization: false,
      gpu_acceleration: false,
      worker_threads: false
    }
  }
);

// 모듈 내보내기
module.exports = {
  // 기본 함수
  isNativeModuleAvailable,
  isFallbackMode,
  getNativeModuleVersion,
  
  // 메모리 최적화 관련
  getMemoryInfo,
  determineOptimizationLevel,
  optimizeMemory,
  forceGarbageCollection,
  
  // GPU 가속 관련
  isGpuAccelerationAvailable,
  enableGpuAcceleration,
  disableGpuAcceleration,
  getGpuInfo,
  performGpuComputation,
  
  // 워커 스레드 관련
  initializeWorkerPool,
  shutdownWorkerPool,
  submitTask,
  getWorkerPoolStats,
  
  // 유틸리티
  getTimestamp,
  getNativeModuleInfo
};
