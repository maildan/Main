/**
 * 네이티브 모듈 래퍼 (CommonJS 형식)
 * 
 * 이 파일은 Rust 네이티브 모듈과 JavaScript 애플리케이션 간의 인터페이스를 제공합니다.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// 로깅 유틸리티 함수
function logInfo(message, data) {
  console.log(`[INFO][native-module] ${message}`, data || '');
}

function logError(message, data) {
  console.error(`[ERROR][native-module] ${message}`, data || '');
}

function logWarning(message, data) {
  console.warn(`[WARNING][native-module] ${message}`, data || '');
}

// 네이티브 모듈 상태 관리
const moduleState = {
  nativeModule: null,
  isAvailable: false,
  isFallback: true,
  lastError: null,
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
    path.join(__dirname, 'typing_stats_native.node'),
    // 대체 위치 - Node.js 확장 디렉토리
    path.join(process.cwd(), 'node_modules', '.native-modules', 'typing_stats_native.node')
  ];
}

/**
 * 네이티브 모듈 사용 가능 여부 확인
 */
function isNativeModuleAvailable() {
  if (!moduleState.initialization.attempted) {
    loadNativeModule();
  }
  return moduleState.isAvailable && !moduleState.isFallback;
}

/**
 * 네이티브 모듈 로드 시도
 */
function loadNativeModule() {
  if (moduleState.initialization.attempted) {
    return moduleState.isAvailable;
  }

  moduleState.initialization.attempted = true;
  moduleState.initialization.timestamp = Date.now();

  const potentialPaths = resolveNativeModulePath();
  logInfo('네이티브 모듈 로드 시도', { paths: potentialPaths });

  // 모든 가능한 경로에서 모듈 로드 시도
  for (const modulePath of potentialPaths) {
    if (fs.existsSync(modulePath)) {
      try {
        logInfo(`네이티브 모듈 발견: ${modulePath}`);
        // .node 파일은 require로 로드
        moduleState.nativeModule = require(modulePath);
        moduleState.isAvailable = true;
        moduleState.isFallback = false;

        // 모듈 초기화 수행
        if (typeof moduleState.nativeModule.initialize_native_modules === 'function') {
          const initSuccess = moduleState.nativeModule.initialize_native_modules();
          logInfo(`네이티브 모듈 초기화 ${initSuccess ? '성공' : '실패'}`);

          // 초기화 실패 시 모듈 사용 불가 처리
          if (!initSuccess) {
            moduleState.isAvailable = false;
            moduleState.lastError = new Error('네이티브 모듈 초기화 실패');
            continue;
          }
        }

        moduleState.initialization.success = true;
        logInfo('네이티브 모듈 로드 성공');
        return true;
      } catch (error) {
        logError('네이티브 모듈 로드 오류', { error: error.message });
        moduleState.lastError = error;
      }
    }
  }

  // 네이티브 모듈 로드 실패 시 폴백 모듈 로드
  if (!moduleState.isAvailable) {
    try {
      const fallbackPath = path.join(__dirname, 'fallback', 'index.js');
      if (fs.existsSync(fallbackPath)) {
        logInfo(`폴백 모듈 로드: ${fallbackPath}`);
        const fallbackModule = require(fallbackPath);
        moduleState.nativeModule = fallbackModule.default || fallbackModule;
        moduleState.isAvailable = true;
        moduleState.isFallback = true;
      } else {
        logError('폴백 모듈을 찾을 수 없음', { path: fallbackPath });
      }
    } catch (fallbackError) {
      logError('폴백 모듈 로드 오류', { error: fallbackError.message });
      moduleState.lastError = fallbackError;
    }
  }

  return moduleState.isAvailable;
}

/**
 * 메모리 정보 가져오기
 */
function getMemoryInfo() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }

  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.get_memory_info === 'function') {
      const result = moduleState.nativeModule.get_memory_info();
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    }
    
    // 폴백: 기본 Node.js 메모리 정보
    const memoryUsage = process.memoryUsage();
    return {
      heap_used: memoryUsage.heapUsed,
      heap_total: memoryUsage.heapTotal,
      heap_limit: memoryUsage.rss * 2,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      heap_used_mb: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100,
      rss_mb: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100,
      timestamp: Date.now()
    };
  } catch (error) {
    logError('메모리 정보 가져오기 오류', { error: error.message });
    
    // 오류 발생 시 기본값 반환
    return {
      heap_used: 0,
      heap_total: 0,
      heap_used_mb: 0,
      rss_mb: 0,
      percent_used: 0,
      timestamp: Date.now(),
      error: error.message
    };
  }
}

/**
 * 최적화 수준 결정
 */
function determineOptimizationLevel(memoryInfo, emergency) {
  try {
    if (!memoryInfo) {
      memoryInfo = getMemoryInfo();
    }
    
    const percentUsed = memoryInfo.percent_used || 0;
    
    if (emergency === true || percentUsed > 90) {
      return 4; // 최고 수준 (긴급)
    } else if (percentUsed > 75) {
      return 3; // 높은 수준
    } else if (percentUsed > 60) {
      return 2; // 중간 수준
    } else if (percentUsed > 40) {
      return 1; // 낮은 수준
    }
    return 0; // 필요 없음
  } catch (error) {
    logError('최적화 수준 결정 오류', { error: error.message });
    return emergency ? 3 : 1; // 기본 값
  }
}

/**
 * 메모리 최적화 수행
 */
function optimizeMemory(level, emergency) {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    // 네이티브 모듈 메모리 최적화 함수 사용
    if (moduleState.nativeModule && typeof moduleState.nativeModule.optimize_memory === 'function') {
      const result = moduleState.nativeModule.optimize_memory(level, !!emergency);
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    }
    
    // 폴백: 기본 GC 실행
    const memBefore = process.memoryUsage();
    
    if (typeof global.gc === 'function') {
      global.gc();
      
      // 높은 레벨이면 여러 번 실행
      if (level >= 3 || emergency) {
        setTimeout(() => global.gc(), 100);
      }
    }
    
    const memAfter = process.memoryUsage();
    const freedMemory = Math.max(0, memBefore.heapUsed - memAfter.heapUsed);
    
    return {
      success: true,
      optimization_level: level,
      freed_memory: freedMemory,
      freed_mb: Math.round(freedMemory / (1024 * 1024) * 100) / 100,
      timestamp: Date.now()
    };
  } catch (error) {
    logError('메모리 최적화 오류', { error: error.message });
    
    return {
      success: false,
      optimization_level: level,
      freed_memory: 0,
      freed_mb: 0,
      timestamp: Date.now(),
      error: error.message
    };
  }
}

/**
 * 가비지 컬렉션 강제 실행
 */
function forceGarbageCollection(emergency) {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    // 네이티브 모듈 GC 함수 사용
    if (moduleState.nativeModule && typeof moduleState.nativeModule.force_garbage_collection === 'function') {
      const result = moduleState.nativeModule.force_garbage_collection();
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    }
    
    // 폴백: 기본 GC 실행
    const memBefore = process.memoryUsage();
    
    if (typeof global.gc === 'function') {
      global.gc();
    }
    
    const memAfter = process.memoryUsage();
    const freedMemory = Math.max(0, memBefore.heapUsed - memAfter.heapUsed);
    
    return {
      success: true,
      freed_memory: freedMemory,
      freed_mb: Math.round(freedMemory / (1024 * 1024) * 100) / 100,
      timestamp: Date.now()
    };
  } catch (error) {
    logError('가비지 컬렉션 오류', { error: error.message });
    
    return {
      success: false,
      freed_memory: 0,
      freed_mb: 0,
      timestamp: Date.now(),
      error: error.message
    };
  }
}

/**
 * GC 요청
 */
function requestGarbageCollection(emergency) {
  return forceGarbageCollection(emergency);
}

/**
 * GPU 가속 가능 여부 확인
 */
function isGpuAccelerationAvailable() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.is_gpu_acceleration_available === 'function') {
      return moduleState.nativeModule.is_gpu_acceleration_available();
    }
    return false;
  } catch (error) {
    logError('GPU 가속 가능 여부 확인 오류', { error: error.message });
    return false;
  }
}

/**
 * GPU 가속 활성화
 */
function enableGpuAcceleration() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.enable_gpu_acceleration === 'function') {
      return moduleState.nativeModule.enable_gpu_acceleration();
    }
    return false;
  } catch (error) {
    logError('GPU 가속 활성화 오류', { error: error.message });
    return false;
  }
}

/**
 * GPU 가속 비활성화
 */
function disableGpuAcceleration() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.disable_gpu_acceleration === 'function') {
      return moduleState.nativeModule.disable_gpu_acceleration();
    }
    return true;
  } catch (error) {
    logError('GPU 가속 비활성화 오류', { error: error.message });
    return true;
  }
}

/**
 * GPU 정보 가져오기
 */
function getGpuInfo() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.get_gpu_info === 'function') {
      const result = moduleState.nativeModule.get_gpu_info();
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    }
    
    // 폴백: 기본 GPU 정보
    return {
      name: 'JavaScript Fallback GPU',
      vendor: 'Node.js',
      driver_info: 'JavaScript 폴백 구현',
      device_type: 'CPU',
      backend: 'JavaScript',
      available: false
    };
  } catch (error) {
    logError('GPU 정보 가져오기 오류', { error: error.message });
    
    return {
      name: 'Unknown',
      vendor: 'Unknown',
      available: false,
      error: error.message
    };
  }
}

/**
 * GPU 계산 수행
 */
function performGpuComputation(data, computationType) {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.perform_gpu_computation === 'function') {
      const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
      const result = moduleState.nativeModule.perform_gpu_computation(dataStr, computationType);
      if (typeof result === 'string') {
        return JSON.parse(result);
      }
      return result;
    }
    
    // 폴백: 계산 불가 응답
    return {
      success: false,
      task_type: computationType,
      duration_ms: 0,
      result: null,
      error: '네이티브 GPU 구현을 사용할 수 없습니다',
      timestamp: Date.now()
    };
  } catch (error) {
    logError('GPU 계산 수행 오류', { error: error.message });
    
    return {
      success: false,
      task_type: computationType,
      duration_ms: 0,
      result: null,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * 네이티브 모듈 정보 가져오기
 */
function getNativeModuleInfo() {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  return {
    available: moduleState.isAvailable,
    usingNative: !moduleState.isFallback,
    usingFallback: moduleState.isFallback,
    lastError: moduleState.lastError ? moduleState.lastError.message : null,
    initialized: moduleState.initialization.attempted,
    initSuccess: moduleState.initialization.success,
    initTimestamp: moduleState.initialization.timestamp,
    timestamp: Date.now()
  };
}

/**
 * 메모리 설정 초기화
 */
function initializeMemorySettings(settings) {
  if (!moduleState.isAvailable) {
    loadNativeModule();
  }
  
  try {
    if (moduleState.nativeModule && typeof moduleState.nativeModule.initialize_memory_settings === 'function') {
      const settingsStr = typeof settings === 'object' ? JSON.stringify(settings) : String(settings);
      return moduleState.nativeModule.initialize_memory_settings(settingsStr);
    }
    
    // 폴백: 설정 저장하지 않음
    return true;
  } catch (error) {
    logError('메모리 설정 초기화 오류', { error: error.message });
    return false;
  }
}

// CommonJS 모듈로 내보내기
module.exports = {
  // 네이티브 모듈 상태 관련
  isNativeModuleAvailable,
  getNativeModuleInfo,
  
  // 메모리 관련 함수
  getMemoryInfo,
  determineOptimizationLevel,
  optimizeMemory,
  forceGarbageCollection,
  requestGarbageCollection,
  initializeMemorySettings,
  
  // GPU 관련 함수
  isGpuAccelerationAvailable,
  enableGpuAcceleration,
  disableGpuAcceleration,
  getGpuInfo,
  performGpuComputation
};
