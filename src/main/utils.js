const { isDev } = require('./constants.js');
const http = require('http');

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

/**
 * 로컬 서버가 실행 중인지 확인
 * @param {string} host - 호스트 주소
 * @param {number} port - 포트 번호
 * @returns {Promise<boolean>} 서버 실행 여부
 */
function isServerRunning(host = 'localhost', port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
      res.resume(); // 리소스 해제
    }).on('error', () => {
      resolve(false);
    }).on('timeout', () => {
      req.abort();
      resolve(false);
    });
  });
}

/**
 * 서버가 준비될 때까지 대기
 * @param {string} host - 호스트 주소
 * @param {number} port - 포트 번호
 * @param {number} timeout - 제한 시간 (ms)
 * @param {number} interval - 확인 간격 (ms)
 * @returns {Promise<boolean>} 성공 여부
 */
async function waitForServer(host = 'localhost', port = 3000, timeout = 30000, interval = 1000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await isServerRunning(host, port)) {
      return true;
    }
    debugLog(`서버 대기 중... (${Math.round((Date.now() - startTime) / 1000)}초)`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

// CommonJS 방식으로 내보내기
module.exports = {
  debugLog,
  formatTime,
  safeRequire,
  isServerRunning,
  waitForServer
};
