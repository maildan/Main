const { isDev } = require('./constants.js');

/**
 * 디버깅 로그 출력
 */
function debugLog(...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] DEBUG:`, ...args);
}

/**
 * 시간 형식화 함수 (디버깅용)
 */
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}초`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}분 ${remainingSeconds}초`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}시간 ${remainingMinutes}분 ${remainingSeconds}초`;
}

/**
 * 안전하게 모듈 로드
 * @param {string} modulePath - 로드할 모듈 경로
 * @param {Object} fallbackModule - 대체 모듈 (로드 실패 시 사용)
 * @returns {Object} 로드된 모듈 또는 대체 모듈
 */
function safeRequire(modulePath, fallbackModule = {}) {
  try {
    const module = require(modulePath);
    
    // DLL이나 네이티브 모듈 로딩 시도인 경우 추가 확인
    if (modulePath.endsWith('.node') || modulePath.endsWith('.dll')) {
      // 유효한 JS 객체인지 확인 (네이티브 모듈은 객체여야 함)
      if (typeof module !== 'object') {
        throw new Error(`유효하지 않은 네이티브 모듈 형식: ${typeof module}`);
      }
    }
    
    return module;
  } catch (error) {
    debugLog(`모듈 '${modulePath}' 로드 실패: ${error.message}`);
    return fallbackModule;
  }
}

// CommonJS 방식으로 내보내기
module.exports = {
  debugLog,
  formatTime,
  safeRequire
};
