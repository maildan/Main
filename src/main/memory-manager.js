// ES 모듈 방식에서 CommonJS 방식으로 변경
const { app } = require('electron');
const { appState, MEMORY_CHECK_INTERVAL, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { debugLog } = require('./utils');
const path = require('path');
const fs = require('fs');

// 메모리 관리 상태
let lastMemoryCheck = 0;
let memoryCheckInterval = null;
let optimizeOnIdle = true;
let lastOptimizationTime = 0;

// 네이티브 모듈 로딩 상태
let nativeModulePromise = null;
let nativeModule = null;

// 네이티브 모듈 로드 함수
async function loadNativeModule() {
  if (nativeModulePromise) return nativeModulePromise;

  nativeModulePromise = (async () => {
    // 다양한 경로 시도
    const possiblePaths = [
      path.join(app.getAppPath(), 'native-modules', 'target', 'release', 'typing_stats_native.node'),
      path.join(app.getAppPath(), 'native-modules', 'target', 'debug', 'typing_stats_native.node'),
      // __dirname은 CommonJS에서 유효함
      path.join(__dirname, '..', '..', 'native-modules', 'target', 'release', 'typing_stats_native.node'),
      path.join(__dirname, '..', '..', 'native-modules', 'target', 'debug', 'typing_stats_native.node')
    ];

    // 존재하는 모듈 파일 찾기
    for (const modulePath of possiblePaths) {
      if (fs.existsSync(modulePath)) {
        debugLog(`네이티브 모듈 발견: ${modulePath}`);
        try {
          const require = require;
          nativeModule = require(modulePath);
          debugLog('네이티브 모듈 로드 성공');
          return nativeModule;
        } catch (moduleLoadError) {
          debugLog(`발견된 모듈 로드 실패: ${moduleLoadError.message}`);
        }
      }
    }

    // 폴백 모듈 로드 시도
    const possibleFallbackPaths = [
      path.join(app.getAppPath(), 'src', 'server', 'native', 'fallback', 'index.js'),
      path.join(__dirname, '..', 'server', 'native', 'fallback', 'index.js'),
      path.join(__dirname, '..', 'server', 'native', 'fallback.js'),
      path.join(process.cwd(), 'src', 'server', 'native', 'fallback', 'index.js'),
      path.join(process.cwd(), 'src', 'server', 'native', 'fallback.js')
    ];

    for (const fallbackPath of possibleFallbackPaths) {
      if (fs.existsSync(fallbackPath)) {
        try {
          const fallbackModule = require(fallbackPath);
          nativeModule = fallbackModule.default || fallbackModule;
          debugLog(`폴백 모듈 로드 성공: ${fallbackPath}`);
          return nativeModule;
        } catch (fallbackError) {
          debugLog(`폴백 모듈 로드 실패: ${fallbackError.message}`);
        }
      }
    }

    debugLog('네이티브 또는 폴백 모듈을 찾을 수 없음');
    return null;
  })();

  return nativeModulePromise;
}

/**
 * 네이티브 모듈 사용 가능 여부 확인
 * @returns {Promise<boolean>} 네이티브 모듈 사용 가능 여부
 */
async function isNativeModuleAvailable() {
  await loadNativeModule();
  return nativeModule !== null;
}

/**
 * 메모리 관리자 초기화
 * @param {Object} options 초기화 옵션
 */
function initializeMemoryManager(options = {}) {
  const {
    checkInterval = MEMORY_CHECK_INTERVAL,
    optimizeIdle = true
  } = options;

  debugLog('메모리 관리자 초기화');

  optimizeOnIdle = optimizeIdle;

  // 주기적 메모리 체크 시작
  startMemoryMonitoring(checkInterval);

  // 초기 메모리 사용량 체크
  checkMemoryUsage();
}

/**
 * 메모리 모니터링 시작
 * @param {number} interval 체크 간격 (ms)
 */
function startMemoryMonitoring(interval = MEMORY_CHECK_INTERVAL) {
  stopMemoryMonitoring(); // 기존 인터벌 정리

  memoryCheckInterval = setInterval(() => {
    checkMemoryUsage();
  }, interval);

  debugLog(`메모리 모니터링 시작 (간격: ${interval}ms)`);
}

/**
 * 메모리 모니터링 중지
 */
function stopMemoryMonitoring() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
    debugLog('메모리 모니터링 중지됨');
  }
}

/**
 * 메모리 사용량 확인 및 필요시 최적화
 * @returns {Object} 메모리 사용량 정보
 */
function checkMemoryUsage() {
  try {
    lastMemoryCheck = Date.now();

    // 현재 메모리 사용량 가져오기
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const rss = memoryUsage.rss;

    // MB 단위로 변환
    const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 100) / 100;
    const heapTotalMB = Math.round(heapTotal / (1024 * 1024) * 100) / 100;
    const rssMB = Math.round(rss / (1024 * 1024) * 100) / 100;

    // 메모리 사용량 상태 업데이트
    appState.memoryUsage = {
      lastCheck: lastMemoryCheck,
      heapUsed,
      heapTotal,
      rss,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      percentUsed: Math.round((heapUsed / heapTotal) * 100)
    };

    // 메모리 임계치 초과 시 최적화 실행
    if (heapUsed > HIGH_MEMORY_THRESHOLD) {
      // 마지막 최적화로부터 일정 시간 경과한 경우에만 실행
      const now = Date.now();
      if (now - lastOptimizationTime > 60000) { // 1분에 최대 1회
        debugLog(`메모리 사용량 높음 (${heapUsedMB}MB), 최적화 실행`);
        forceMemoryOptimization(2, heapUsed > HIGH_MEMORY_THRESHOLD * 1.5);
        lastOptimizationTime = now;
      }
    }

    return appState.memoryUsage;
  } catch (error) {
    debugLog(`메모리 사용량 확인 중 오류: ${error.message}`);
    return null;
  }
}

/**
 * 백그라운드 모드를 위한 메모리 최적화
 * 백그라운드에서 실행 중일 때 메모리 사용량 최소화
 */
function optimizeMemoryForBackground() {
  try {
    debugLog('백그라운드 메모리 최적화 실행');

    // 주요 리소스 정리 및 메모리 최적화
    forceMemoryOptimization(3, false);

    // 가비지 컬렉션 권장
    if (global.gc) {
      global.gc();
      debugLog('GC 강제 수행 완료');
    }

    // 네이티브 모듈 메모리 최적화 실행
    if (isNativeModuleAvailable() && typeof nativeModule.optimize_memory === 'function') {
      try {
        nativeModule.optimize_memory('high', true);
        debugLog('네이티브 메모리 최적화 완료');
      } catch (nativeError) {
        debugLog(`네이티브 메모리 최적화 실패: ${nativeError.message}`);
      }
    }

    return true;
  } catch (error) {
    debugLog(`백그라운드 메모리 최적화 중 오류: ${error.message}`);
    return false;
  }
}

/**
 * 메모리 리소스 정리
 * 불필요한 메모리 리소스 정리 및 최적화
 * @param {boolean} aggressive 적극적 정리 여부
 */
function freeUpMemoryResources(aggressive = false) {
  try {
    debugLog(`메모리 리소스 정리 ${aggressive ? '(적극적 모드)' : ''}`);

    // 가비지 컬렉션 수행
    performGarbageCollection(aggressive);

    // 네이티브 모듈 메모리 최적화
    if (isNativeModuleAvailable() && typeof nativeModule.release_unused_resources === 'function') {
      try {
        nativeModule.release_unused_resources();
        debugLog('네이티브 리소스 정리 완료');
      } catch (nativeError) {
        debugLog(`네이티브 리소스 정리 실패: ${nativeError.message}`);
      }
    }

    return true;
  } catch (error) {
    debugLog(`메모리 리소스 정리 중 오류: ${error.message}`);
    return false;
  }
}

/**
 * 메모리 모니터링 설정 함수
 * main.js에서 직접 접근할 수 있도록 함수 추가/수정
 * @param {Object} options 초기화 옵션
 */
function setupMemoryMonitoring(settings = {}) {
  const {
    interval = MEMORY_CHECK_INTERVAL,
    enableAutoOptimize = true,
    threshold = HIGH_MEMORY_THRESHOLD
  } = settings;

  debugLog(`메모리 모니터링 설정 (간격: ${interval}ms, 자동 최적화: ${enableAutoOptimize}, 임계치: ${threshold / (1024 * 1024)}MB)`);

  // 기존 모니터링 중지 및 재설정
  stopMemoryMonitoring();

  if (enableAutoOptimize) {
    startMemoryMonitoring(interval);
  }

  return true;
}

/**
 * 강제 메모리 최적화 수행
 * @param {number} level 최적화 수준 (1-3)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function forceMemoryOptimization(level = 2, emergency = false) {
  try {
    debugLog(`강제 메모리 최적화 수행 (레벨: ${level}, 긴급: ${emergency})`);

    let result;

    // 네이티브 모듈 사용 가능한 경우
    if (await isNativeModuleAvailable() && nativeModule) {
      // 네이티브 최적화 수준 매핑
      const nativeLevel = ['normal', 'low', 'medium', 'high', 'critical'][level] || 'medium';

      try {
        // 함수 이름 확인 (다양한 가능성 대비)
        const optimizeFuncNames = [
          'optimize_memory',
          'optimize_memory_async',
          'performMemoryOptimization'
        ];

        let optimizeFunc = null;
        for (const funcName of optimizeFuncNames) {
          if (typeof nativeModule[funcName] === 'function') {
            optimizeFunc = nativeModule[funcName];
            break;
          }
        }

        if (optimizeFunc) {
          const jsonResult = optimizeFunc(nativeLevel, emergency);
          result = typeof jsonResult === 'string' ? JSON.parse(jsonResult) : jsonResult;
          debugLog(`네이티브 메모리 최적화 완료: ${result.freed_mb || 0}MB 정리됨`);
        } else {
          throw new Error('메모리 최적화 함수를 찾을 수 없음');
        }
      } catch (nativeError) {
        debugLog(`네이티브 메모리 최적화 실패, JS 구현으로 폴백: ${nativeError.message}`);
        result = await optimizeMemoryWithJS(level, emergency);
      }
    } else {
      // JS 기반 메모리 최적화 수행
      result = await optimizeMemoryWithJS(level, emergency);
    }

    return result;
  } catch (error) {
    debugLog(`메모리 최적화 중 오류: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * JS 기반 메모리 최적화 수행
 * 네이티브 모듈 사용 불가능한 경우 폴백 구현
 * @param {number} level 최적화 수준 (1-3)
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} 최적화 결과
 */
async function optimizeMemoryWithJS(level, emergency) {
  debugLog(`JS 기반 메모리 최적화 실행 (레벨: ${level}, 긴급: ${emergency})`);

  const memoryBefore = process.memoryUsage();

  // 가비지 컬렉션 수행
  if (global.gc) {
    global.gc(emergency);
  }

  // 메모리 사용량에 따른 대기 시간 적용
  await new Promise(resolve => setTimeout(resolve, 100));

  // 메모리 최적화 후 사용량 확인
  const memoryAfter = process.memoryUsage();
  const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;

  debugLog(`JS 메모리 최적화 완료: ${freedMB}MB 정리됨`);

  return {
    success: true,
    optimization_level: level,
    memory_before: {
      heap_used: memoryBefore.heapUsed,
      heap_total: memoryBefore.heapTotal,
      rss: memoryBefore.rss,
      heap_used_mb: Math.round(memoryBefore.heapUsed / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((memoryBefore.heapUsed / memoryBefore.heapTotal) * 100)
    },
    memory_after: {
      heap_used: memoryAfter.heapUsed,
      heap_total: memoryAfter.heapTotal,
      rss: memoryAfter.rss,
      heap_used_mb: Math.round(memoryAfter.heapUsed / (1024 * 1024) * 100) / 100,
      percent_used: Math.round((memoryAfter.heapUsed / memoryAfter.heapTotal) * 100)
    },
    freed_memory: freedMemory,
    freed_mb: freedMB,
    timestamp: Date.now()
  };
}

/**
 * 강제 가비지 컬렉션 수행
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Promise<Object>} GC 결과
 */
async function performGarbageCollection(emergency = false) {
  try {
    debugLog(`강제 가비지 컬렉션 수행 (긴급: ${emergency})`);

    let result;

    if (await isNativeModuleAvailable()) {
      // 네이티브 GC 수행
      try {
        const jsonResult = nativeModule.force_garbage_collection();
        result = typeof jsonResult === 'string' ? JSON.parse(jsonResult) : jsonResult;
        debugLog(`네이티브 GC 완료: ${result.freed_mb || 0}MB 정리됨`);
      } catch (nativeError) {
        debugLog(`네이티브 GC 실패, JS 구현으로 폴백: ${nativeError.message}`);
        // JavaScript 기반 GC 수행
        result = performJsGarbageCollection(emergency);
      }
    } else {
      // JavaScript 기반 GC 수행
      result = performJsGarbageCollection(emergency);
    }

    return result;
  } catch (error) {
    debugLog(`가비지 컬렉션 중 오류: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * JavaScript 기반 가비지 컬렉션 수행
 * @param {boolean} emergency 긴급 상황 여부
 * @returns {Object} GC 결과
 */
function performJsGarbageCollection(emergency) {
  const memoryBefore = process.memoryUsage();

  // JavaScript GC 수행
  if (global.gc) {
    global.gc(emergency);
    debugLog('JavaScript GC 강제 수행 완료');
  } else {
    // GC 유도를 위한 대용량 객체 생성 및 해제
    // 사용되지 않는 변수는 선언 자체 제외
    const tmpArrays = [];
    for (let i = 0; i < 10; i++) {
      tmpArrays.push(new Array(100000).fill(0));
    }
    // 배열 비우기
    tmpArrays.length = 0;
    debugLog('JavaScript GC 유도 완료');
  }

  const memoryAfter = process.memoryUsage();
  const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;

  return {
    success: true,
    freed_memory: freedMemory,
    freed_mb: freedMB,
    timestamp: Date.now()
  };
}

/**
 * 현재 메모리 사용량 가져오기
 * @returns {Object} 메모리 사용량 정보
 */
function getCurrentMemoryUsage() {
  try {
    // 현재 메모리 사용량 가져오기
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const rss = memoryUsage.rss;

    // MB 단위로 변환
    const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 100) / 100;
    const heapTotalMB = Math.round(heapTotal / (1024 * 1024) * 100) / 100;
    const rssMB = Math.round(rss / (1024 * 1024) * 100) / 100;

    // 결과 반환
    return {
      lastCheck: Date.now(),
      heapUsed,
      heapTotal,
      rss,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      percentUsed: Math.round((heapUsed / heapTotal) * 100)
    };
  } catch (error) {
    debugLog(`현재 메모리 사용량 가져오기 중 오류: ${error.message}`);
    return {
      lastCheck: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      rss: 0,
      heapUsedMB: 0,
      heapTotalMB: 0,
      rssMB: 0,
      percentUsed: 0
    };
  }
}

/**
 * 메모리 관리자 상태 가져오기
 * @returns {Object} 메모리 관리자 상태
 */
function getMemoryManagerStats() {
  return {
    lastMemoryCheck,
    isMonitoring: memoryCheckInterval !== null,
    optimizeOnIdle,
    lastOptimizationTime,
    nativeModuleAvailable: isNativeModuleAvailable(),
    memoryUsage: appState.memoryUsage
  };
}

// 모듈 내보내기 방식 통일 (추가)
// ESM과 CommonJS 호환성을 모두 제공
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeMemoryManager,
    performGarbageCollection,
    optimizeMemoryForBackground,
    freeUpMemoryResources,
    forceMemoryOptimization,
    stopMemoryMonitoring,
    setupMemoryMonitoring,
    getCurrentMemoryUsage,
    getMemoryManagerStats
  };
}
