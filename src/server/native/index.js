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
    // 실제 빌드된 .dylib 파일 경로로 변경
    const dylibPath = '../../src/native-modules/libtyping_stats_native.dylib';
    
    // 경로 확인용 (로그용)
    const dylibFullPath = path.join(__dirname, dylibPath);

    logInfo('네이티브 모듈 로딩 시작...');
    
      try {
      if (fs.existsSync(dylibFullPath)) {
        logInfo(`라이브러리 파일 발견: ${dylibFullPath}`);
        // 실제 .dylib 파일 로드
        moduleState.nativeModule = require(dylibPath);
        logInfo('.dylib 모듈 성공적으로 로드됨');
        setModuleAvailability(true, false);
        return moduleState.nativeModule;
      } else {
        logWarning(`라이브러리 파일을 찾을 수 없음: ${dylibFullPath}`);
      }
    } catch (loadError) {
      logWarning('라이브러리 로드 실패:', loadError);
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
