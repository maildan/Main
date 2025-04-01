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
  
  return function(...args) {
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
  
  determineOptimizationLevel: () => {
    const memUsage = process.memoryUsage();
    const usedRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    if (usedRatio > 0.9) return 4; // Critical
    if (usedRatio > 0.8) return 3; // High
    if (usedRatio > 0.7) return 2; // Medium
    if (usedRatio > 0.5) return 1; // Low
    return 0; // Normal
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

// 누락된 getMemoryInfo 함수 정의 추가
// 이 함수는 기본 폴백으로 작동합니다
function getMemoryInfo() {
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const percentUsed = Math.round((heapUsed / heapTotal) * 10000) / 100;
    const heapUsedMB = Math.round((heapUsed / (1024 * 1024)) * 100) / 100;
    
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
  getPerformanceMetrics: () => ({ ...moduleState.metrics, timestamp: Date.now() })
};

// 네이티브 모듈 로드 시도
loadNativeModule();

// 사용하지 않는 변수 앞에 _로 시작하는 이름 사용
async function optimizeMemory(level = 2, _emergency = false) {
  // u32와 boolean 타입으로 변환
  const levelU32 = Math.min(Math.max(0, Math.floor(level)), 4);
  const emergencyBool = Boolean(_emergency);
  
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
}

function initializeWorkerPool(_threadCount = 0) {
  // 정수로 변환
  const threads = Math.max(0, Math.floor(Number(_threadCount) || 0));
  
  return createFunctionWrapper(
    'initialize_worker_pool',
    () => fallbacks.initializeWorkerPool(threads),
    false
  )(threads);
}

async function submitTask(taskType, _data = {}) {
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
}

// 외부에서 logger 다시 불러오지 않고 위에서 생성한 logger 인스턴스 사용
const loggerInfo = logInfo;
// logError, logWarning은 이미 위에서 선언되었으므로 재사용

// 모듈 캐싱
let nativeModule = null;
let fallbackModule = null;
let lastLoadAttempt = 0;
const LOAD_COOLDOWN = 5000; // 재시도 간격 (5초)

/**
 * 네이티브 모듈 로드 시도
 * @returns {Promise<Object|null>} 네이티브 모듈 또는 null
 */
async function getNativeModule() {
  // 캐싱된 모듈이 있으면 반환
  if (nativeModule !== null) {
    return nativeModule;
  }
  
  // 마지막 시도 후 일정 시간이 지나지 않았으면 null 반환
  const now = Date.now();
  if (now - lastLoadAttempt < LOAD_COOLDOWN) {
    return null;
  }
  
  lastLoadAttempt = now;
  
  // 수정: 가능한 네이티브 모듈 경로
  const possiblePaths = [
    // DLL 파일을 직접 로드하지 않고 Node.js 네이티브 모듈로만 로드
    path.join(process.cwd(), 'native-modules', 'target', 'release', 'typing_stats_native.node'),
    path.join(process.cwd(), 'native-modules', 'target', 'debug', 'typing_stats_native.node'),
    // 다른 가능한 위치
    path.join(process.cwd(), 'node_modules', '.native-modules', 'typing_stats_native.node'),
    path.join(process.cwd(), 'src', 'native-modules', 'typing_stats_native.node')
  ];
  
  loggerInfo('네이티브 모듈 로드 시도', { paths: possiblePaths });
  
  // 각 경로 시도
  for (const modulePath of possiblePaths) {
    try {
      if (fs.existsSync(modulePath)) {
        // .node 파일만 직접 require로 로드 (ESM 환경에서)
        const loadedModule = require(modulePath); // import 대신 require 사용
        nativeModule = loadedModule;
        loggerInfo(`네이티브 모듈 로드 성공: ${modulePath}`);
        return nativeModule;
      }
    } catch (error) {
      logWarning(`모듈 로드 실패: ${modulePath}`, { error: error.message });
    }
  }
  
  logWarning('네이티브 모듈을 찾을 수 없음, 폴백 모듈 사용 시도');
  return null;
}

/**
 * 폴백 모듈 로드 시도
 * @returns {Promise<Object|null>} 폴백 모듈 또는 null
 */
async function getNativeFallback() {
  // 캐싱된 모듈이 있으면 반환
  if (fallbackModule !== null) {
    return fallbackModule;
  }
  
  // 폴백 모듈 경로 - 여러 가능한 경로 시도
  const possibleFallbackPaths = [
    path.join(process.cwd(), 'src', 'server', 'native', 'fallback', 'index.js'),
    path.join(process.cwd(), 'dist', 'server', 'native', 'fallback', 'index.js'),
    path.join(__dirname, 'fallback', 'index.js'),
    path.join(process.cwd(), 'src', 'server', 'native', 'fallback.js'),
    path.join(process.cwd(), 'server', 'native', 'fallback.js'),
    path.join(process.cwd(), '.next', 'server', 'native', 'fallback.js')
  ];
  
  // 로그에 모든 시도 경로 기록
  loggerInfo('폴백 모듈 로드 시도', { paths: possibleFallbackPaths });
  
  // 각 경로 시도
  for (const fallbackPath of possibleFallbackPaths) {
    try {
      if (fs.existsSync(fallbackPath)) {
        const loadedModule = await import(fallbackPath);
        fallbackModule = loadedModule.default || loadedModule;
        loggerInfo(`폴백 모듈 로드: ${fallbackPath}`);
        return fallbackModule;
      }
    } catch (error) {
      logWarning(`폴백 모듈 로드 실패: ${fallbackPath}`, { error: error.message });
    }
  }
  
  logError('폴백 모듈을 찾을 수 없음');
  return null;
}

/**
 * 네이티브 모듈 사용 가능 여부 확인
 * @returns {boolean} 네이티브 모듈 사용 가능 여부
 */
function isNativeModuleAvailable() {
  return nativeModule !== null;
}

/**
 * 폴백 모듈 사용 가능 여부 확인
 * @returns {boolean} 폴백 모듈 사용 가능 여부
 */
function isFallbackModuleAvailable() {
  return fallbackModule !== null;
}

/**
 * 네이티브 모듈 정보 가져오기
 * @returns {Promise<Object>} 네이티브 모듈 정보
 */
async function getNativeModuleInfo() {
  const module = await getNativeModule();
  const fallback = module ? null : await getNativeFallback();
  
  return {
    available: module !== null || fallback !== null,
    usingNative: module !== null,
    usingFallback: module === null && fallback !== null,
    noModuleAvailable: module === null && fallback === null,
    timestamp: Date.now()
  };
}

/**
 * 네이티브 함수 래핑
 * 네이티브 모듈이 없으면 폴백을 사용하고, 두 모듈 모두 없으면 에러 반환
 * @param {string} functionName 함수 이름
 * @param {Array} args 함수 인자
 * @returns {Promise<any>} 함수 실행 결과
 */
async function callNativeFunction(functionName, ...args) {
  // 네이티브 모듈 로드 시도
  const nativeModule = await getNativeModule();
  
  if (nativeModule && typeof nativeModule[functionName] === 'function') {
    // 네이티브 모듈 함수 호출
    return nativeModule[functionName](...args);
  }
  
  // 폴백 모듈 로드 시도
  const fallbackModule = await getNativeFallback();
  
  if (fallbackModule && typeof fallbackModule[functionName] === 'function') {
    // 폴백 모듈 함수 호출
    return fallbackModule[functionName](...args);
  }
  
  // 두 모듈 모두 사용할 수 없음 - 기본값 반환
  logError(`${functionName} 함수를 네이티브 모듈과 폴백 모듈 모두에서 찾을 수 없습니다`);
  
  // 함수별 기본 응답 생성
  return createDefaultResponse(functionName);
}

/**
 * 함수별 기본 응답 생성
 * @param {string} functionName 함수 이름
 * @returns {any} 기본 응답
 */
function createDefaultResponse(functionName) {
  const timestamp = Date.now();
  
  switch (functionName) {
    case 'get_memory_info':
      return JSON.stringify({
        success: false,
        timestamp,
        heap_used: 0,
        heap_total: 0,
        heap_used_mb: 0,
        rss: 0,
        rss_mb: 0,
        percent_used: 0,
        error: 'Memory info not available'
      });
      
    case 'force_garbage_collection':
      return JSON.stringify({
        success: false,
        timestamp,
        freed_memory: 0,
        freed_mb: 0,
        duration: 0,
        error: 'Garbage collection not available'
      });
      
    case 'optimize_memory':
      return JSON.stringify({
        success: false,
        timestamp,
        optimization_level: 'none',
        freed_memory: 0,
        freed_mb: 0,
        duration: 0,
        error: 'Memory optimization not available'
      });
      
    case 'get_gpu_info':
      return JSON.stringify({
        success: false,
        timestamp,
        available: false,
        acceleration_enabled: false,
        name: 'Software Renderer',
        vendor: 'None',
        error: 'GPU info not available'
      });
      
    default:
      return JSON.stringify({
        success: false,
        timestamp,
        error: `Function ${functionName} not implemented`
      });
  }
}

// 공통 네이티브 모듈 함수들
const combinedExports = {
  getNativeModule,
  getNativeFallback,
  getNativeModuleInfo,
  callNativeFunction,
  isNativeModuleAvailable,
  isFallbackModuleAvailable,
  
  // 보다 간편한 사용을 위한 일반적인 함수들
  getMemoryInfo: async () => {
    try {
      return await callNativeFunction('get_memory_info');
    } catch (error) {
      logError('메모리 정보 가져오기 실패', { error: error.message });
      return createDefaultResponse('get_memory_info');
    }
  },
  
  forceGarbageCollection: async () => {
    try {
      return await callNativeFunction('force_garbage_collection');
    } catch (error) {
      logError('가비지 컬렉션 수행 실패', { error: error.message });
      return createDefaultResponse('force_garbage_collection');
    }
  },
  
  optimizeMemory: async (level = 'medium', emergency = false) => {
    try {
      return await callNativeFunction('optimize_memory', level, emergency);
    } catch (error) {
      logError('메모리 최적화 실패', { error: error.message });
      return createDefaultResponse('optimize_memory');
    }
  },
  
  getGpuInfo: async () => {
    try {
      return await callNativeFunction('get_gpu_info');
    } catch (error) {
      logError('GPU 정보 가져오기 실패', { error: error.message });
      return createDefaultResponse('get_gpu_info');
    }
  },
  
  setGpuAcceleration: async (enable) => {
    try {
      const functionName = enable ? 'enable_gpu_acceleration' : 'disable_gpu_acceleration';
      return await callNativeFunction(functionName);
    } catch (error) {
      logError(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 실패`, { error: error.message });
      return JSON.stringify({
        success: false,
        timestamp: Date.now(),
        enabled: false,
        error: `GPU acceleration ${enable ? 'enable' : 'disable'} failed: ${error.message}`
      });
    }
  },
  
  // 네이티브 모듈 API
  ...nativeModuleApi,
  
  // 폴백 구현 함수들
  getMemoryInfo,
  determineOptimizationLevel,
  requestGarbageCollection,
  optimizeMemory,
  isGpuAccelerationAvailable,
  enableGpuAcceleration,
  disableGpuAcceleration,
  getGpuInfo,
  performGpuComputation,
  getNativeModuleInfo
};

// 단일 default export 사용
export default combinedExports;
