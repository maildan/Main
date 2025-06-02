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
const { createLogger } = require('./utils/logger');

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
    const fallbackPath = path.join(__dirname, './fallback/index.js');
    moduleState.nativeModule = require(fallbackPath);
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
    // 가능한 모든 네이티브 모듈 경로 시도 (정적 방식)
    const possiblePaths = [
      // 릴리즈 빌드 경로
      path.join(__dirname, '../native-modules/target/release/typing_stats_native.node'),
      // 디버그 빌드 경로 
      path.join(__dirname, '../native-modules/target/debug/typing_stats_native.node'),
      // macOS 동적 라이브러리 (.dylib)
      path.join(__dirname, '../native-modules/libtyping_stats_native.dylib'),
      // Linux 동적 라이브러리 (.so)
      path.join(__dirname, '../native-modules/libtyping_stats_native.so'),
      // Windows 동적 라이브러리 (.dll)
      path.join(__dirname, '../native-modules/typing_stats_native.dll')
    ];

    // 모든 가능한 경로에서 모듈 로드 시도
    for (const modulePath of possiblePaths) {
      if (fs.existsSync(modulePath)) {
        logInfo(`네이티브 모듈 발견: ${modulePath}`);
        moduleState.nativeModule = require(modulePath);
        setModuleAvailability(true, false);
        break;
      }
    }

    // 모듈을 찾지 못한 경우 폴백으로 전환
    if (moduleState.nativeModule === null) {
      logWarning('네이티브 모듈을 찾을 수 없음');
      loadFallbackModule();
    }
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
