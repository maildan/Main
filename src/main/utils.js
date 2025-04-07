const { isDev } = require('./constants.js');
const http = require('http');

/**
 * 디버깅 로그 출력
 */
function debugLog(...args) {
  const timestamp = new Date().toISOString();

  // 개발 모드 또는 디버그 모드인 경우에만 로그 출력
  if (isDev || process.env.ELECTRON_DEBUG === 'true') {
    console.log(`[${timestamp}] DEBUG:`, ...args);
  }

  // 로그 파일에 저장 (필요시 구현)
}

/**
 * 시간 형식화 함수 (디버깅용)
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
}

/**
 * 안전하게 모듈 로드
 * @param {string} modulePath - 로드할 모듈 경로
 * @param {Object} fallbackModule - 대체 모듈 (로드 실패 시 사용)
 * @returns {Object} 로드된 모듈 또는 대체 모듈
 */
function safeRequire(modulePath, fallbackModule = {}) {
  try {
    const mod = require(modulePath);
    debugLog(`모듈 로드 성공: ${modulePath}`);
    return mod;
  } catch (error) {
    debugLog(`모듈 로드 실패: ${modulePath}, 오류: ${error.message}`);
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
    try {
      const req = http.get(`http://${host}:${port}`, (res) => {
        resolve(res.statusCode === 200);
        req.destroy();
      });

      req.on('error', () => {
        resolve(false);
        req.destroy();
      });

      req.setTimeout(2000, () => {
        resolve(false);
        req.destroy();
      });
    } catch (error) {
      debugLog(`서버 연결 확인 중 오류: ${error.message}`);
      resolve(false);
    }
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
  const endTime = startTime + timeout;

  debugLog(`서버 준비 대기 시작: ${host}:${port}`);

  while (Date.now() < endTime) {
    if (await isServerRunning(host, port)) {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      debugLog(`서버 준비 완료 (${elapsedSec}초 소요)`);
      return true;
    }

    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    debugLog(`서버 대기 중... (${elapsedSec}초)`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  debugLog(`서버 준비 타임아웃 (${timeout / 1000}초)`);
  return false;
}

/**
 * 디버그용 메모리 정보 출력
 */
function logMemoryUsage() {
  try {
    const memoryInfo = process.memoryUsage();
    const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

    debugLog('메모리 사용량:');
    debugLog(`- RSS: ${formatMB(memoryInfo.rss)}`);
    debugLog(`- Heap Total: ${formatMB(memoryInfo.heapTotal)}`);
    debugLog(`- Heap Used: ${formatMB(memoryInfo.heapUsed)}`);
    debugLog(`- External: ${formatMB(memoryInfo.external || 0)}`);
    debugLog(`- Array Buffers: ${formatMB(memoryInfo.arrayBuffers || 0)}`);
  } catch (error) {
    debugLog('메모리 정보 가져오기 오류:', error);
  }
}

// 모듈 내보내기
module.exports = {
  debugLog,
  formatTime,
  safeRequire,
  isServerRunning,
  waitForServer,
  logMemoryUsage
};
