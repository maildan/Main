const { isDev } = require('./constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 로그 파일 경로 설정
const LOG_DIR = isDev
  ? path.join(__dirname, '../../logs')
  : path.join(app.getPath('userData'), 'logs');

// 로그 파일이 저장될 디렉터리 생성
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('로그 디렉터리 생성 오류:', error);
}

// 로그 파일 경로
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

/**
 * 디버깅 로그 출력 및 파일 저장
 */
function debugLog(...args) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] DEBUG: ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ')}`;
  
  // 콘솔에 출력
  console.log(logMessage);
  
  // 로그 파일에 저장 (비동기)
  try {
    fs.appendFile(LOG_FILE, logMessage + '\n', (err) => {
      if (err) {
        console.error('로그 파일 쓰기 오류:', err);
      }
    });
  } catch (error) {
    console.error('로그 저장 오류:', error);
  }
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
 * 파일 경로 안전하게 생성
 * @param {string} basePath 기본 경로
 * @param {string[]} segments 경로 세그먼트
 * @returns {string} 결합된 경로
 */
function safePath(basePath, ...segments) {
  try {
    // undefined, null 등을 빈 문자열로 대체
    const safeBase = basePath || '';
    const safeSegments = segments.map(s => s || '');
    
    return path.join(safeBase, ...safeSegments);
  } catch (error) {
    console.error('경로 생성 오류:', error);
    return '';
  }
}

/**
 * 모듈 안전하게 require
 * @param {string} modulePath 모듈 경로
 * @returns {any} 모듈 또는 null
 */
function safeRequire(modulePath) {
  if (!modulePath) {
    console.warn('모듈 경로가 지정되지 않았습니다.');
    return null;
  }
  
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(`모듈을 로드할 수 없습니다 (${modulePath}):`, error.message);
    return null;
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
  safePath,
  safeRequire,
  isServerRunning,
  waitForServer
};
