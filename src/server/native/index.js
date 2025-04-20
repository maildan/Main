/**
 * 네이티브 모듈 래퍼
 * 
 * 이 파일은 Rust 네이티브 모듈과 JavaScript 애플리케이션 간의 인터페이스를 제공합니다.
 * 성능 지표 수집, 오류 처리, 폴백 메커니즘을 포함하여 안정적인 운영을 보장합니다.
 * 
 * @module NativeModuleWrapper
 */

import path from 'path';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { createLogger } from './utils/logger.js';
import { createRequire } from 'module';

// node require 생성 (필요시 네이티브 모듈 로드용)
const require = createRequire(import.meta.url);

// 로거 인스턴스 생성
const logger = createLogger('native-module');

// 로거 함수 직접 참조
const { info: logInfo, error: logError, warning: logWarning } = logger;

// 모듈 캐시 및 상태
const moduleState = {
  nativeModule: null,
  isAvailable: false,
  isFallback: true,
  lastError: null,
  metrics: {
    calls: 0,
    errors: 0,
    avgExecutionTime: 0,
    lastGcTime: 0,
    totalExecutionTime: 0
  },
  initialization: {
    attempted: false,
    timestamp: null,
    success: false
  }
};

/**
 * 네이티브 모듈 경로 결정 (환경에 따라)
 */
function resolveNativeModulePath() {
  const isDev = process.env.NODE_ENV === 'development';

  // 개발 환경에서는 빌드 디렉토리에서 직접 로드
  if (isDev) {
    return [
      // 개발 환경 - 디버그 빌드
      path.join(process.cwd(), 'native-modules', 'target', 'debug', 'typing_stats_native.node'),
      // 개발 환경 - 릴리스 빌드
      path.join(process.cwd(), 'native-modules', 'target', 'release', 'typing_stats_native.node')
    ];
  }

  // 프로덕션 환경에서는 배포된 위치에서 로드
  return [
    // 현재 디렉토리 내 네이티브 모듈
    path.join(path.dirname(new URL(import.meta.url).pathname), 'typing_stats_native.node'),
    // 대체 위치 - Node.js 확장 디렉토리
    path.join(process.cwd(), 'node_modules', '.native-modules', 'typing_stats_native.node')
  ];
}

/**
 * 네이티브 모듈 로드 시도
 * @returns {Promise<boolean>} 로드 성공 여부
 */
async function loadNativeModule() {
  if (moduleState.initialization.attempted) {
    return moduleState.isAvailable;
  }

  moduleState.initialization.attempted = true;
  moduleState.initialization.timestamp = Date.now();

  const potentialPaths = resolveNativeModulePath();
  logger.info('네이티브 모듈 로드 시도', { paths: potentialPaths });

  // 모든 가능한 경로에서 모듈 로드 시도
  for (const modulePath of potentialPaths) {
    if (fs.existsSync(modulePath)) {
      try {
        logger.info(`네이티브 모듈 발견: ${modulePath}`);
        // .node 파일은 require로 로드 (ESM에서는 직접 import 불가)
        moduleState.nativeModule = require(modulePath);
        moduleState.isAvailable = true;
        moduleState.isFallback = false;

        // 모듈 초기화 수행
        if (typeof moduleState.nativeModule.initialize_native_modules === 'function') {
          const initSuccess = moduleState.nativeModule.initialize_native_modules();
          logger.info(`네이티브 모듈 초기화 ${initSuccess ? '성공' : '실패'}`);

          // 초기화 실패 시 모듈 사용 불가 처리
          if (!initSuccess) {
            moduleState.isAvailable = false;
            moduleState.lastError = new Error('네이티브 모듈 초기화 실패');
            continue;
          }
        }

        // 종료 시 정리 함수 등록
        setupCleanupHandlers();

        moduleState.initialization.success = true;
        logger.info('네이티브 모듈 로드 성공');
        return true;
      } catch (error) {
        logger.error('네이티브 모듈 로드 오류', { error: error.message, stack: error.stack });
        moduleState.lastError = error;
      }
    }
  }

  // 네이티브 모듈 로드 실패 시 폴백 모듈 로드
  if (!moduleState.isAvailable) {
    try {
      const fallbackPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'fallback', 'index.js');
      if (fs.existsSync(fallbackPath)) {
        logger.info(`폴백 모듈 로드: ${fallbackPath}`);
        const fallbackModule = await import(fallbackPath);
        moduleState.nativeModule = fallbackModule.default || fallbackModule;
        moduleState.isAvailable = true;
        moduleState.isFallback = true;
      } else {
        logger.error('폴백 모듈을 찾을 수 없음', { path: fallbackPath });
      }
    } catch (fallbackError) {
      logger.error('폴백 모듈 로드 오류', { error: fallbackError.message });
      moduleState.lastError = fallbackError;
    }
  }

  return moduleState.isAvailable;
}

/**
 * 프로세스 종료 시 정리 함수 설정
 */
function setupCleanupHandlers() {
  if (!moduleState.isAvailable || moduleState.isFallback) return;

  const cleanup = () => {
    try {
      if (moduleState.nativeModule && typeof moduleState.nativeModule.cleanup_native_modules === 'function') {
        logger.info('네이티브 모듈 정리 수행');
        moduleState.nativeModule.cleanup_native_modules();
      }
    } catch (error) {
      logger.error('네이티브 모듈 정리 오류', { error: error.message });
    }
  };

  // 다양한 종료 이벤트에 정리 함수 등록
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('uncaughtException', (error) => {
    logger.error('처리되지 않은 예외', { error: error.message, stack: error.stack });
    cleanup();
    process.exit(1);
  });
}

/**
 * 네이티브 함수 호출 래퍼 (성능 측정, 오류 처리 포함)
 * @param {Function} nativeFunction 네이티브 모듈 함수
 * @param {Function} fallbackFunction 폴백 함수
 * @param {any} defaultValue 기본 반환값
 * @param {boolean} isAsync 비동기 함수 여부
 * @returns {Function} 래핑된 함수
 */
function createFunctionWrapper(nativeFunction, fallbackFunction, defaultValue, isAsync = false) {
  // 네이티브 모듈이 로드되지 않았다면 로드 시도
  if (!moduleState.initialization.attempted) {
    loadNativeModule();
  }

  return function (...args) {
    // 모듈 사용 불가 시 폴백 사용
    if (!moduleState.isAvailable) {
      return fallbackFunction ? fallbackFunction(...args) : defaultValue;
    }

    const funcName = nativeFunction.name || 'unknown';
    const startTime = performance.now();
    moduleState.metrics.calls++;

    try {
      let result;

      // 네이티브 모듈 함수 호출
      if (moduleState.isFallback) {
        // 폴백 모듈 사용 중이면 폴백 함수 호출
        result = fallbackFunction ? fallbackFunction(...args) : defaultValue;
      } else {
        // 진짜 네이티브 모듈 함수 호출
        const nativeFn = moduleState.nativeModule[nativeFunction];
        if (typeof nativeFn !== 'function') {
          throw new Error(`네이티브 함수 ${funcName}을(를) 찾을 수 없습니다`);
        }

        result = nativeFn.apply(moduleState.nativeModule, args);
      }

      // 성능 지표 업데이트
      const executionTime = performance.now() - startTime;
      updatePerformanceMetrics(funcName, executionTime);

      // 비동기 함수인 경우 Promise 래핑
      if (isAsync && result && typeof result.then === 'function') {
        return result.catch(error => {
          moduleState.metrics.errors++;
          logger.error(`비동기 네이티브 함수 ${funcName} 오류`, {
            error: error.message,
            args: JSON.stringify(args)
          });

          // 폴백 함수가 있으면 호출
          if (fallbackFunction) {
            return fallbackFunction(...args);
          }
          throw error;
        });
      }

      return result;
    } catch (error) {
      moduleState.metrics.errors++;
      logger.error(`네이티브 함수 ${funcName} 오류`, {
        error: error.message,
        stack: error.stack,
        args: JSON.stringify(args)
      });

      // 오류 발생 시 폴백 사용
      return fallbackFunction ? fallbackFunction(...args) : defaultValue;
    }
  };
}

/**
 * 성능 지표 업데이트
 * @param {string} funcName 함수 이름
 * @param {number} executionTime 실행 시간 (ms)
 */
function updatePerformanceMetrics(funcName, executionTime) {
  const { metrics } = moduleState;

  // 총 실행 시간 업데이트
  metrics.totalExecutionTime += executionTime;

  // 평균 실행 시간 계산
  metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.calls;

  // 함수별 성능 기록 (미구현)
}

/**
 * 기본 폴백 구현
 */
const fallbacks = {
  // 메모리 관련 폴백
  getMemoryInfo: () => ({
    heap_used: process.memoryUsage().heapUsed,
    heap_total: process.memoryUsage().heapTotal,
    heap_limit: process.memoryUsage().rss * 2,
    rss: process.memoryUsage().rss,
    external: process.memoryUsage().external,
    heap_used_mb: process.memoryUsage().heapUsed / (1024 * 1024),
    rss_mb: process.memoryUsage().rss / (1024 * 1024),
    percent_used: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    timestamp: Date.now()
  }),

  determineOptimizationLevel: (memoryInfo, emergency = false) => {
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
  },

  optimizeMemory: async (level = 2, emergency = false) => {
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();

    // 인위적인 지연 추가
    await new Promise(resolve => setTimeout(resolve, 100));

    const memAfter = process.memoryUsage();
    const freedMemory = memBefore.heapUsed - memAfter.heapUsed;

    return {
      success: true,
      optimization_level: level,
      memory_before: {
        heap_used: memBefore.heapUsed,
        heap_total: memBefore.heapTotal,
        rss: memBefore.rss,
        heap_used_mb: memBefore.heapUsed / (1024 * 1024),
        rss_mb: memBefore.rss / (1024 * 1024),
        percent_used: (memBefore.heapUsed / memBefore.heapTotal) * 100,
        timestamp: Date.now()
      },
      memory_after: {
        heap_used: memAfter.heapUsed,
        heap_total: memAfter.heapTotal,
        rss: memAfter.rss,
        heap_used_mb: memAfter.heapUsed / (1024 * 1024),
        rss_mb: memAfter.rss / (1024 * 1024),
        percent_used: (memAfter.heapUsed / (1024 * 1024)) * 100,
        timestamp: Date.now()
      },
      freed_memory: Math.max(0, freedMemory),
      freed_mb: Math.max(0, freedMemory) / (1024 * 1024),
      duration: 100,
      timestamp: Date.now(),
      error: null
    };
  },

  forceGarbageCollection: () => {
    const memBefore = process.memoryUsage();

    if (global.gc) {
      global.gc();
      const memAfter = process.memoryUsage();
      const freedMemory = memBefore.heapUsed - memAfter.heapUsed;

      return {
        success: true,
        timestamp: Date.now(),
        freed_memory: Math.max(0, freedMemory),
        freed_mb: Math.max(0, freedMemory) / (1024 * 1024),
        duration: 10,
        error: null
      };
    }

    return {
      success: false,
      timestamp: Date.now(),
      error: 'JavaScript 가비지 컬렉션에 직접 접근할 수 없습니다. --expose-gc 플래그를 사용하세요.'
    };
  },

  // GPU 관련 폴백
  isGpuAccelerationAvailable: () => false,

  enableGpuAcceleration: () => false,

  disableGpuAcceleration: () => true,

  getGpuInfo: () => ({
    name: 'JavaScript Fallback GPU',
    vendor: 'Node.js',
    driver_info: 'JavaScript 폴백 구현',
    device_type: 'CPU',
    backend: 'JavaScript',
    available: false
  }),

  performGpuComputation: async (data, computationType) => ({
    success: false,
    task_type: computationType,
    duration_ms: 0,
    result: null,
    error: '네이티브 GPU 구현을 사용할 수 없습니다',
    timestamp: Date.now()
  }),

  // 워커 관련 폴백
  initializeWorkerPool: (threadCount = 0) => {
    logger.info('JavaScript 폴백 워커 풀 초기화');
    return true;
  },

  shutdownWorkerPool: () => {
    logger.info('JavaScript 폴백 워커 풀 종료');
    return true;
  },

  submitTask: async (taskType, data) => ({
    success: false,
    task_type: taskType,
    duration_ms: 0,
    result: null,
    error: '네이티브 워커 풀을 사용할 수 없습니다',
    timestamp: Date.now()
  }),

  getWorkerPoolStats: () => ({
    thread_count: 1,
    active_tasks: 0,
    completed_tasks: 0,
    active_workers: 0,
    idle_workers: 1,
    pending_tasks: 0,
    failed_tasks: 0,
    total_tasks: 0,
    uptime_ms: 0,
    timestamp: Date.now()
  }),

  // 모듈 정보 관련 폴백
  getModuleInfo: () => ({
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
      cpu_cores: require('os').cpus().length,
      node_version: process.version
    }
  }),

  getNativeModuleVersion: () => '0.1.0-js-fallback'
};

/**
 * 네이티브 모듈 사용 가능 여부 확인
 * @returns {boolean} 네이티브 모듈 사용 가능 여부
 */
function isNativeModuleAvailable() {
  try {
    return moduleState.nativeModule !== null && !moduleState.isFallback;
  } catch (error) {
    logError('네이티브 모듈 가용성 확인 오류', { error: error.message });
    return false;
  }
}

/**
 * 폴백 모듈 사용 가능 여부 확인
 * @returns {boolean} 폴백 모듈 사용 가능 여부
 */
function isFallbackMode() {
  return moduleState.isFallback;
}

async function getNativeFallback() {
  // 캐싱된 모듈이 있으면 반환
  if (moduleState.nativeModule !== null) {
    return moduleState.nativeModule;
  }

  // 현재 파일 디렉토리 경로 계산 (ESM 호환)
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  // Windows 경로 문제 해결 ('C:' 제거)
  const compatibleCurrentDir = process.platform === 'win32' ? currentDir.substring(1) : currentDir;

  // 폴백 모듈 경로 - 경로 형식 수정
  const possibleFallbackPaths = [
    // 현재 디렉토리 기준 상대 경로
    path.join(compatibleCurrentDir, 'fallback', 'index.js'),
    path.join(compatibleCurrentDir, 'fallback.js'),
    // 프로젝트 루트 기준 절대 경로 (개발 환경)
    path.join(process.cwd(), 'src', 'server', 'native', 'fallback', 'index.js'),
    // 빌드된 환경 기준 절대 경로 (프로덕션 환경 - 추정)
    path.join(process.cwd(), '.next', 'server', 'chunks', 'fallback', 'index.js'), 
    path.join(process.cwd(), '.next', 'server', 'src', 'server', 'native', 'fallback', 'index.js'), // 다른 빌드 구조 가능성 고려
    path.join(process.cwd(), 'dist', 'server', 'native', 'fallback', 'index.js') // 이전 경로 유지 (혹시 모를 경우)
  ];

  // 로그에 모든 시도 경로 기록
  logger.info('폴백 모듈 로드 시도', { paths: possibleFallbackPaths });

  // 각 경로 시도
  for (const fallbackPath of possibleFallbackPaths) {
    // Windows 경로 문제 해결 (UNC 경로 또는 드라이브 문자 제거)
    const cleanPath = process.platform === 'win32' && fallbackPath.startsWith('\\') 
                      ? fallbackPath.substring(1) 
                      : fallbackPath;
                      
    // 로그 추가: 실제 확인하는 경로
    logger.info(`폴백 경로 확인 중: ${cleanPath}`);
    
    try {
      if (fs.existsSync(cleanPath)) {
        // CommonJS 모듈 로드 방식 시도 (Next.js 환경 호환성)
        if (typeof require !== 'undefined') {
          try {
            const fallbackModule = require(cleanPath);
            moduleState.nativeModule = fallbackModule.default || fallbackModule;
            logger.info(`폴백 모듈 로드(CommonJS): ${cleanPath}`);
            return moduleState.nativeModule;
          } catch (requireError) {
            logWarning(`폴백 모듈 CommonJS 로드 실패: ${cleanPath}`, { error: requireError.message });
            // CommonJS 실패 시 ESM 시도
          }
        }

        // ESM 방식 로드 시도
        try {
          // file:// URL 형태로 변환 (ESM import는 URL 필요)
          const fileUrl = new URL(`file://${cleanPath}`).href;
          const loadedModule = await import(fileUrl);
          moduleState.nativeModule = loadedModule.default || loadedModule;
          logger.info(`폴백 모듈 로드(ESM): ${cleanPath}`);
          return moduleState.nativeModule;
        } catch (importError) {
          logWarning(`폴백 모듈 ESM 로드 실패: ${cleanPath}`, { error: importError.message });
        }
  } else {
        // 로그 추가: 파일 없음
        // logger.info(`폴백 경로 없음: ${cleanPath}`);
      }
  } catch (error) {
      logWarning(`폴백 모듈 접근 실패: ${cleanPath}`, { error: error.message });
    }
  }

  logError('폴백 모듈을 찾을 수 없음, 인라인 폴백 생성');

  // 인라인 폴백 생성
  moduleState.nativeModule = createInlineFallback();
  return moduleState.nativeModule;
}

/**
 * 인라인 폴백 모듈 생성
 * 모든 폴백 로드 시도 실패 시 사용
 */
function createInlineFallback() {
  logInfo('인라인 폴백 모듈 생성');
  return {
    // 기본 폴백 함수들
    get_memory_info: function () {
      const memoryUsage = process.memoryUsage();
      return JSON.stringify({
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        heap_limit: memoryUsage.heapTotal * 2,
        heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
        percent_used: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        rss: memoryUsage.rss,
        rss_mb: memoryUsage.rss / (1024 * 1024)
      });
    },

    // GPU 관련 폴백 기능 추가
    is_gpu_acceleration_available: function () {
      return false;
    },

    enable_gpu_acceleration: function () {
      return false;
    },

    disable_gpu_acceleration: function () {
      return true;
    },

    get_gpu_info: function () {
      return JSON.stringify({
        success: true,
        name: 'Fallback GPU',
        vendor: 'JavaScript',
        device_type: 'Software',
        acceleration_enabled: false
      });
    },

    // 기타 필요한 폴백 함수들
    optimize_memory: function (level, emergency) {
      if (global.gc) {
        global.gc();
      }
      return JSON.stringify({
        success: true,
        freed_mb: 0,
        level,
        emergency
      });
    },

    request_garbage_collection: function () {
      if (global.gc) {
        global.gc();
        return JSON.stringify({
          success: true,
          message: "GC 수행 완료"
        });
      }
      return JSON.stringify({
        success: false,
        message: "GC를 사용할 수 없습니다"
      });
    }
  };
}

/**
 * 네이티브 모듈 가져오기 (필요시 로드)
 * @returns {Promise<Object|null>} 네이티브 모듈 객체
 */
async function getNativeModule() {
  try {
    if (!moduleState.initialization.attempted) {
      await loadNativeModule();
    }
    return moduleState.nativeModule;
  } catch (error) {
    logError('네이티브 모듈 가져오기 오류', { error: error.message });
    return null;
  }
}

// 모듈 API 정의
const nativeModuleApi = {
  // =========== 네이티브 모듈 상태 관련 함수 ===========

  /**
   * 네이티브 모듈 사용 가능 여부 확인
   * @returns {boolean} 네이티브 모듈 사용 가능 여부
   */
  isNativeModuleAvailable: () => {
    if (!moduleState.initialization.attempted) {
      loadNativeModule();
    }
    return moduleState.isAvailable && !moduleState.isFallback;
  },

  /**
   * 폴백 모드 사용 중인지 확인
   * @returns {boolean} 폴백 모드 사용 여부
   */
  isFallbackMode: () => {
    if (!moduleState.initialization.attempted) {
      loadNativeModule();
    }
    return moduleState.isFallback;
  },

  /**
   * 네이티브 모듈 버전 가져오기
   * @returns {string|null} 네이티브 모듈 버전
   */
  getNativeModuleVersion: createFunctionWrapper(
    'get_native_module_version',
    fallbacks.getNativeModuleVersion,
    null
  ),

  /**
   * 네이티브 모듈 정보 가져오기
   * @returns {Object|null} 네이티브 모듈 정보
   */
  getNativeModuleInfo: createFunctionWrapper(
    'get_native_module_info',
    fallbacks.getModuleInfo,
    null
  ),

  // =========== 메모리 관련 함수 ===========

  /**
   * 메모리 정보 가져오기
   * @returns {Object} 메모리 정보
   */
  getMemoryInfo: () => {
    const memoryInfoFunc = createFunctionWrapper(
      'get_memory_info',
      fallbacks.getMemoryInfo,
      null
    );

    try {
      const result = memoryInfoFunc();
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('메모리 정보 파싱 오류', { error: error.message });
      return fallbacks.getMemoryInfo();
    }
  },

  /**
   * 최적화 수준 결정
   * @returns {number} 최적화 수준 (0-4)
   */
  determineOptimizationLevel: createFunctionWrapper(
    'determine_optimization_level',
    fallbacks.determineOptimizationLevel,
    2
  ),

  /**
   * 메모리 최적화 수행
   * @param {number} level 최적화 수준 (0-4)
   * @param {boolean} emergency 긴급 최적화 여부
   * @returns {Promise<Object>} 최적화 결과
   */
  optimizeMemory: async (level = 2, emergency = false) => {
    // u32와 boolean 타입으로 변환
    const levelU32 = Math.min(Math.max(0, Math.floor(level)), 4);
    const emergencyBool = Boolean(emergency);

    const optimizeFunc = createFunctionWrapper(
      'optimize_memory',
      () => fallbacks.optimizeMemory(levelU32, emergencyBool),
      null,
      true
    );

    try {
      moduleState.metrics.lastGcTime = Date.now();
      const result = await optimizeFunc(levelU32, emergencyBool);

      // 문자열 결과 파싱
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('메모리 최적화 오류', {
        error: error.message,
        level: levelU32,
        emergency: emergencyBool
      });
      return fallbacks.optimizeMemory(levelU32, emergencyBool);
    }
  },

  /**
   * 가비지 컬렉션 강제 수행
   * @returns {Object} GC 결과
   */
  forceGarbageCollection: () => {
    const gcFunc = createFunctionWrapper(
      'force_garbage_collection',
      fallbacks.forceGarbageCollection,
      null
    );

    try {
      moduleState.metrics.lastGcTime = Date.now();
      const result = gcFunc();

      // 문자열 결과 파싱
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('가비지 컬렉션 오류', { error: error.message });
      return fallbacks.forceGarbageCollection();
    }
  },

  /**
   * GC 요청 수행
   * @param {boolean} emergency 긴급 GC 수행 여부
   * @returns {Promise<Object>} GC 결과
   */
  requestGarbageCollection: async (emergency = false) => {
    try {
      // 네이티브 모듈 사용 가능 여부 확인
      const nativeModule = await getNativeModule();

      // 네이티브 모듈에서 GC 함수 사용
      if (nativeModule && typeof nativeModule.request_garbage_collection === 'function') {
        const resultJson = nativeModule.request_garbage_collection(emergency);
        try {
          const result = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
          return {
            success: result.success || true,
            message: result.message || '네이티브 GC 수행 완료',
            freedMemory: result.freed_mb || 0
          };
        } catch (parseError) {
          logger.error('GC 결과 파싱 오류', { error: parseError.message });
          // 파싱 오류 시 기본 성공 응답
          return { success: true, message: '네이티브 GC 수행 완료' };
        }
      }

      // 네이티브 모듈 없거나 함수 없는 경우 폴백
      if (typeof global.gc === 'function') {
        // JavaScript GC 호출
        const memBefore = process.memoryUsage().heapUsed / (1024 * 1024);
        global.gc(emergency);

        // GC 후 메모리 사용량 차이 계산
        const memAfter = process.memoryUsage().heapUsed / (1024 * 1024);
        const freedMB = Math.max(0, memBefore - memAfter).toFixed(2);

        logger.info(`JavaScript GC 수행 완료 (${emergency ? '긴급' : '일반'}), ${freedMB}MB 정리됨`);

        return {
          success: true,
          message: `JavaScript GC 수행 완료 (${emergency ? '긴급' : '일반'})`,
          freedMemory: parseFloat(freedMB)
        };
      }

      // GC 사용 불가
      logger.warning('GC를 사용할 수 없음');
      return {
        success: false,
        message: 'GC를 사용할 수 없습니다. \'--expose-gc\' 플래그와 함께 실행하세요.'
      };
    } catch (error) {
      logger.error('GC 요청 처리 중 오류', { error: error.message });
      return {
        success: false,
        message: `GC 요청 중 오류: ${error.message}`
      };
    }
  },

  // =========== GPU 관련 함수 ===========

  /**
   * GPU 가속 가능 여부 확인
   * @returns {boolean} GPU 가속 가능 여부
   */
  isGpuAccelerationAvailable: createFunctionWrapper(
    'is_gpu_acceleration_available',
    fallbacks.isGpuAccelerationAvailable,
    false
  ),

  /**
   * GPU 가속 활성화
   * @returns {boolean} 성공 여부
   */
  enableGpuAcceleration: createFunctionWrapper(
    'enable_gpu_acceleration',
    fallbacks.enableGpuAcceleration,
    false
  ),

  /**
   * GPU 가속 비활성화
   * @returns {boolean} 성공 여부
   */
  disableGpuAcceleration: createFunctionWrapper(
    'disable_gpu_acceleration',
    fallbacks.disableGpuAcceleration,
    true
  ),

  /**
   * GPU 정보 가져오기
   * @returns {Object} GPU 정보
   */
  getGpuInfo: () => {
    const gpuInfoFunc = createFunctionWrapper(
      'get_gpu_info',
      fallbacks.getGpuInfo,
      null
    );

    try {
      const result = gpuInfoFunc();
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('GPU 정보 파싱 오류', { error: error.message });
      return fallbacks.getGpuInfo();
    }
  },

  /**
   * GPU 계산 수행
   * @param {string} dataJson JSON 데이터
   * @param {string} computationType 계산 유형
   * @returns {Promise<Object>} 계산 결과
   */
  performGpuComputation: async (dataJson, computationType) => {
    // 타입 검증 및 변환
    const dataStr = typeof dataJson === 'object' ? JSON.stringify(dataJson) : String(dataJson);
    const typeStr = String(computationType || 'matrix');

    const computeFunc = createFunctionWrapper(
      'perform_gpu_computation',
      () => fallbacks.performGpuComputation(dataStr, typeStr),
      null,
      true
    );

    try {
      const result = await computeFunc(dataStr, typeStr);

      // 문자열 결과 파싱
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('GPU 계산 오류', {
        error: error.message,
        computationType: typeStr
      });
      return fallbacks.performGpuComputation(dataStr, typeStr);
    }
  },

  // =========== 워커 관련 함수 ===========

  /**
   * 워커 풀 초기화
   * @param {number} threadCount 스레드 수 (0=자동)
   * @returns {boolean} 성공 여부
   */
  initializeWorkerPool: (_threadCount = 0) => {
    // 정수로 변환
    const threads = Math.max(0, Math.floor(Number(_threadCount) || 0));

    return createFunctionWrapper(
      'initialize_worker_pool',
      () => fallbacks.initializeWorkerPool(threads),
      false
    )(threads);
  },

  /**
   * 워커 풀 종료
   * @returns {boolean} 성공 여부
   */
  shutdownWorkerPool: createFunctionWrapper(
    'shutdown_worker_pool',
    fallbacks.shutdownWorkerPool,
    true
  ),

  /**
   * 워커 풀에 작업 제출
   * @param {string} taskType 작업 유형
   * @param {string|Object} data 작업 데이터
   * @returns {Promise<Object>} 작업 결과
   */
  submitTask: async (taskType, _data) => {
    // 타입 검증 및 변환
    const taskTypeStr = String(taskType || 'echo');
    const dataStr = typeof _data === 'object' ? JSON.stringify(_data) : String(_data);

    const submitFunc = createFunctionWrapper(
      'submit_task',
      () => fallbacks.submitTask(taskTypeStr, dataStr),
      null,
      true
    );

    try {
      const result = await submitFunc(taskTypeStr, dataStr);

      // 문자열 결과 파싱
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    } catch (error) {
      logger.error('작업 제출 오류', {
        error: error.message,
        taskType: taskTypeStr
      });
      return fallbacks.submitTask(taskTypeStr, dataStr);
    }
  },

  /**
   * 워커 풀 통계 가져오기
   * @returns {Object} 워커 풀 통계
   */
  getWorkerPoolStats: () => {
    const statsFunc = createFunctionWrapper(
      'get_worker_pool_stats',
      fallbacks.getWorkerPoolStats,
      null
    );

    try {
      const result = statsFunc();

      // 문자열 결과 파싱
      if (typeof result === 'string') {
        try {
          return JSON.parse(result);
        } catch (parseError) {
          logger.error('워커 풀 통계 파싱 오류', { error: parseError.message });
          return fallbacks.getWorkerPoolStats();
        }
      }
      return result;
    } catch (error) {
      logger.error('워커 풀 통계 가져오기 오류', { error: error.message });
      return fallbacks.getWorkerPoolStats();
    }
  },

  // =========== 유틸리티 함수 ===========

  /**
   * 현재 타임스탬프 가져오기
   * @returns {number} 타임스탬프 (밀리초)
   */
  getTimestamp: createFunctionWrapper(
    'get_timestamp',
    () => Date.now(),
    Date.now()
  ),

  /**
   * 성능 지표 가져오기
   * @returns {Object} 성능 지표
   */
  getPerformanceMetrics: () => ({ ...moduleState.metrics, timestamp: Date.now() }),
  
  // =========== 설정 관련 함수 (추가) ===========
  
  /**
   * 네이티브 모듈 메모리 설정 초기화/업데이트
   * @param {Object} settings 메모리 설정 객체
   * @returns {boolean} 성공 여부 (네이티브 함수가 반환값을 준다면)
   */
  initializeMemorySettings: (settings) => {
    // 네이티브 모듈이 로드되었는지 확인
    if (!moduleState.initialization.attempted) {
      loadNativeModule();
    }
    
    // 네이티브 모듈 사용 불가 또는 폴백 모드 시
    if (!moduleState.isAvailable || moduleState.isFallback) {
      logger.warning('네이티브 모듈을 사용할 수 없거나 폴백 모드이므로 메모리 설정을 초기화할 수 없습니다.');
      // 폴백 모드에서도 설정값을 내부 상태에 저장할 수 있음 (선택 사항)
      return false; 
    }
    
    // 실제 네이티브 함수 이름 확인 필요 (예: 'initialize_memory_settings')
    const nativeFunctionName = 'initialize_memory_settings'; 
    const nativeFunction = moduleState.nativeModule[nativeFunctionName];
    
    if (typeof nativeFunction !== 'function') {
      logger.error(`네이티브 설정 함수 ${nativeFunctionName}을(를) 찾을 수 없습니다.`);
      return false;
    }
    
    try {
      // 네이티브 함수에 설정 객체를 JSON 문자열로 변환하여 전달
      const settingsJson = JSON.stringify(settings);
      const result = nativeFunction(settingsJson);
      logger.info('네이티브 메모리 설정 초기화 완료', { settings });
      // 네이티브 함수가 성공 여부를 반환한다면 그 값을 반환
      return typeof result === 'boolean' ? result : true;
    } catch (error) {
      logger.error('네이티브 메모리 설정 초기화 중 오류', { error: error.message, settings });
      return false;
    }
  },

  // =========== GPU 관련 함수 추가 ===========

  /**
   * 네이티브 GPU 모듈 초기화
   * @returns {boolean} 성공 여부
   */
  initializeGpuModule: createFunctionWrapper(
    'initialize_gpu_module', // 실제 네이티브 함수명
    () => { // 폴백 구현
      logger.info('폴백: GPU 모듈 초기화 시도 (항상 실패)');
      return false;
    },
    false // 기본 반환값
  ),

  /**
   * 네이티브 GPU 가속 설정
   * @param {boolean} enable 활성화 여부
   * @returns {boolean} 성공 여부
   */
  setGpuAcceleration: (enable) => {
    const func = createFunctionWrapper(
      'set_gpu_acceleration', // 실제 네이티브 함수명
      (fallbackEnable) => { // 폴백 구현
        logger.info(`폴백: GPU 가속 설정 시도 (enable: ${fallbackEnable}) -> 항상 실패`);
        return false;
      },
      false // 기본 반환값
    );
    return func(Boolean(enable)); // 파라미터 타입 보장
  }
};

// 네이티브 모듈 로드 시도
loadNativeModule();

// 외부 API 노출 추가
export default nativeModuleApi;
module.exports = nativeModuleApi;
