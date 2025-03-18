const { isDev } = require('./constants');

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

module.exports = {
  debugLog,
  formatTime
};
