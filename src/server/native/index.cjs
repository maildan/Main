/**
 * 네이티브 모듈 브리지 인터페이스
 * 
 * 이 모듈은 네이티브 모듈과 서버 간의 인터페이스를 제공합니다.
 * 네이티브 모듈이 로드되지 않으면 폴백 구현을 사용합니다.
 */

const path = require('path');
const fs = require('fs');

// 디버깅 로그
function debugLog(message, ...args) {
  console.log(`[Native Bridge] ${message}`, ...args);
}

// 오류 로그
function errorLog(message, ...args) {
  console.error(`[Native Bridge ERROR] ${message}`, ...args);
}

// 네이티브 모듈 로드 시도
let nativeModule = null;
let usingFallback = true;

try {
  // 경로 탐색
  const nativeModulePath = path.join(process.cwd(), 'native-modules', 'typing_stats_native.node');
  
  if (fs.existsSync(nativeModulePath)) {
    debugLog(`네이티브 모듈 파일 발견: ${nativeModulePath}`);
    nativeModule = require(nativeModulePath);
    usingFallback = false;
    debugLog('네이티브 모듈 로드 성공');
  } else {
    debugLog(`네이티브 모듈 파일이 없어 폴백 구현을 사용합니다: ${nativeModulePath}`);
  }
} catch (error) {
  errorLog(`네이티브 모듈 로드 오류: ${error.message}`);
}

// 폴백 구현
const fallbackModule = require('./fallback/index.cjs');

// 최종 모듈 내보내기 (네이티브 또는 폴백)
const moduleInterface = {
  // 메모리 관련 기능
  getMemoryInfo: async () => {
    if (!usingFallback && nativeModule && typeof nativeModule.get_memory_info === 'function') {
      try {
        const info = JSON.parse(nativeModule.get_memory_info());
        return {
          success: true,
          memoryInfo: info,
          fallback: false
        };
      } catch (error) {
        errorLog(`네이티브 메모리 정보 가져오기 실패: ${error.message}`);
      }
    }
    
    return fallbackModule.getMemoryInfo();
  },
  
  optimizeMemory: async (level = 2, emergency = false) => {
    if (!usingFallback && nativeModule && typeof nativeModule.optimize_memory === 'function') {
      try {
        const result = JSON.parse(nativeModule.optimize_memory(level, emergency));
        return {
          success: true,
          result,
          fallback: false
        };
      } catch (error) {
        errorLog(`네이티브 메모리 최적화 실패: ${error.message}`);
      }
    }
    
    return fallbackModule.optimizeMemory(level, emergency);
  },
  
  forceGarbageCollection: () => {
    if (!usingFallback && nativeModule && typeof nativeModule.force_garbage_collection === 'function') {
      try {
        const result = nativeModule.force_garbage_collection();
        return { success: result, fallback: false };
      } catch (error) {
        errorLog(`네이티브 GC 실행 실패: ${error.message}`);
      }
    }
    
    return fallbackModule.forceGarbageCollection();
  },
  
  // 상태 확인 함수
  getStatus: () => {
    return {
      available: !usingFallback && nativeModule !== null,
      usingFallback,
      functions: !usingFallback && nativeModule ? Object.keys(nativeModule) : []
    };
  }
};

module.exports = moduleInterface;
