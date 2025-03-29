/**
 * 공통 유틸리티 함수
 */

// 디버그 모드 체크
const isDebugMode = process.env.NODE_ENV === 'development';

/**
 * 디버그 로그 출력 함수
 * 개발 모드에서만 로그를 출력합니다.
 * @param {string} message 로그 메시지
 * @param {...any} args 추가 인자
 */
function debugLog(message, ...args) {
  if (isDebugMode) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * 에러 로그 출력 함수
 * 항상 로그를 출력합니다.
 * @param {string} message 로그 메시지
 * @param {...any} args 추가 인자
 */
function errorLog(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args);
}

module.exports = {
  debugLog,
  errorLog,
  isDebugMode
};
