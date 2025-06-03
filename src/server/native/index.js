/**
 * 네이티브 모듈 래퍼
 * 
 * 이 파일은 Rust 네이티브 모듈과 JavaScript 애플리케이션 간의 인터페이스를 제공합니다.
 * 성능 지표 수집, 오류 처리, 폴백 메커니즘을 포함하여 안정적인 운영을 보장합니다.
 * 
 * @module NativeModuleWrapper
 */

const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
// utils/logger 가져오기 (사용 가능한 경우)
let createLogger;
try {
  createLogger = require('./utils/logger').createLogger;
} catch (err) {
  createLogger = (name) => ({
    info: console.log.bind(console, `[${name}]`),
    error: console.error.bind(console, `[${name}]`),
    warning: console.warn.bind(console, `[${name}]`),
    debug: console.debug.bind(console, `[${name}]`)
  });
}

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
    lastDuration: 0,
    totalTime: 0
  }
};

/**
 * 모듈 가용성 설정
 * @param {boolean} available - 모듈 사용 가능 여부
 * @param {boolean} fallback - 폴백 사용 여부
 */
const setModuleAvailability = (available, fallback = true) => {
  moduleState.isAvailable = available;
  moduleState.isFallback = fallback;
};

/**
 * 모듈 가용성 확인
 * @returns {boolean} 모듈 사용 가능 여부
 */
const isModuleAvailable = () => moduleState.isAvailable;

/**
 * 폴백 모듈을 로드합니다.
 * 네이티브 모듈 로드에 실패했을 때 사용됩니다.
 */
const loadFallbackModule = () => {
  try {
    logWarning('네이티브 모듈 사용 불가, 폴백 JavaScript 구현으로 전환');
    // 폴백 모듈 로드 (정적 경로)
    moduleState.nativeModule = require('./fallback');
    setModuleAvailability(true, true);
  } catch (fallbackError) {
    logError('폴백 모듈 로드 실패:', fallbackError);
    moduleState.lastError = fallbackError;
    setModuleAvailability(false, false);
  }
};

/**
 * 네이티브 모듈을 초기화합니다.
 */
const initializeModule = () => {
  if (moduleState.nativeModule !== null) {
    return moduleState.nativeModule;
  }

  try {
    // 바이너리 경로 (Webpack 경고를 피하기 위해 정적 문자열로 체크)
    const debugBinaryPath = '../native-modules/target/debug/typing_stats_native.node';
    const releaseBinaryPath = '../native-modules/target/release/typing_stats_native.node';
    
    // 경로 확인용 (로그용)
    const debugBinaryFullPath = path.join(__dirname, debugBinaryPath);
    const releaseBinaryFullPath = path.join(__dirname, releaseBinaryPath);

    logInfo('네이티브 모듈 로딩 시작...');
    
    // 개발 모드에서는 디버그 바이너리 먼저 시도
    if (process.env.NODE_ENV !== 'production') {
      try {
        if (fs.existsSync(debugBinaryFullPath)) {
          logInfo(`디버그 빌드 발견: ${debugBinaryFullPath}`);
          // 웹팩이 정적으로 분석할 수 있는 리터럴 문자열 사용
          moduleState.nativeModule = require('../native-modules/target/debug/typing_stats_native.node');
          logInfo('디버그 빌드 성공적으로 로드됨');
          setModuleAvailability(true, false);
          return moduleState.nativeModule;
        }
      } catch (debugError) {
        logWarning('디버그 빌드 로드 실패:', debugError);
      }
    }
    
    // 릴리즈 바이너리 시도
    try {
      if (fs.existsSync(releaseBinaryFullPath)) {
        logInfo(`릴리즈 빌드 발견: ${releaseBinaryFullPath}`);
        // 웹팩이 정적으로 분석할 수 있는 리터럴 문자열 사용
        moduleState.nativeModule = require('../native-modules/target/release/typing_stats_native.node');
        logInfo('릴리즈 빌드 성공적으로 로드됨');
        setModuleAvailability(true, false);
        return moduleState.nativeModule;
      }
    } catch (releaseError) {
      logWarning('릴리즈 빌드 로드 실패:', releaseError);
    }
    
    // 네이티브 모듈을 찾지 못했거나 로드 실패 시 폴백 사용
    logWarning('네이티브 모듈을 찾을 수 없거나 로드 실패. 폴백으로 전환합니다.');
    loadFallbackModule();
  } catch (error) {
    logError('네이티브 모듈 로드 중 오류 발생:', error);
    moduleState.lastError = error;
    loadFallbackModule();
  }

  return moduleState.nativeModule;
};

// 네이티브 모듈 초기화
initializeModule();

/**
 * 성능 측정 래퍼 함수
 * @param {Function} fn - 측정할 함수
 * @returns {Function} 래핑된 함수
 */
const withPerformanceTracking = (fn) => {
  return (...args) => {
    if (!moduleState.isAvailable) {
      return null;
    }

    moduleState.metrics.calls++;
    const startTime = performance.now();
    
    try {
      const result = fn(...args);
      const duration = performance.now() - startTime;
      
      // 메트릭 업데이트
      moduleState.metrics.totalTime += duration;
      moduleState.metrics.lastDuration = duration;
      moduleState.metrics.avgExecutionTime = 
        moduleState.metrics.totalTime / moduleState.metrics.calls;

      return result;
    } catch (error) {
      moduleState.metrics.errors++;
      moduleState.lastError = error;
      logError('네이티브 함수 실행 중 오류:', error);
      return null;
    }
  };
};

// 모듈이 사용 가능한 경우 모든 함수를 성능 측정으로 래핑
const wrapModuleFunctions = () => {
  if (!moduleState.nativeModule) return null;
  
  const wrappedModule = {};
  
  // 모든 함수를 성능 측정 래퍼로 래핑
  Object.keys(moduleState.nativeModule).forEach(key => {
    const value = moduleState.nativeModule[key];
    if (typeof value === 'function') {
      wrappedModule[key] = withPerformanceTracking(value);
    } else {
      wrappedModule[key] = value;
    }
  });
  
  // 추가 유틸리티 함수 제공
  wrappedModule.getModuleState = () => ({
    available: moduleState.isAvailable,
    isFallback: moduleState.isFallback,
    metrics: { ...moduleState.metrics }
  });
  
  wrappedModule.getLastError = () => moduleState.lastError;
  
  return wrappedModule;
};

// 래핑된 모듈 내보내기
module.exports = wrapModuleFunctions();
