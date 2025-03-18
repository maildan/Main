const { appState, BROWSER_DISPLAY_NAMES, IDLE_TIMEOUT } = require('./constants');
const { debugLog, formatTime } = require('./utils');

/**
 * 키 입력 처리
 * @param {string} windowTitle - 현재 활성 창 제목
 * @param {string} browserName - 감지된 브라우저 이름
 */
function processKeyInput(windowTitle, browserName) {
  const now = Date.now();
  
  // 창 전환 감지
  if (appState.currentStats.currentWindow !== windowTitle) {
    appState.currentStats.currentWindow = windowTitle;
    appState.currentStats.currentBrowser = BROWSER_DISPLAY_NAMES[browserName] || browserName;
    debugLog('창 전환 감지:', {
      title: windowTitle,
      browser: appState.currentStats.currentBrowser
    });
  }

  // 타자 수 증가
  appState.currentStats.keyCount++;
  
  // 첫 키 입력이거나 일정 시간 이후 입력인 경우
  if (!appState.currentStats.startTime || (now - appState.currentStats.lastActiveTime) > IDLE_TIMEOUT) {
    if (!appState.currentStats.startTime) {
      appState.currentStats.startTime = now;
      debugLog('타이핑 세션 시작');
    } else {
      debugLog('타이핑 세션 재개 (일정 시간 후)');
    }
  }
  
  appState.currentStats.lastActiveTime = now;
  
  // 현재 통계 업데이트 및 UI에 전송
  updateAndSendStats();
}

/**
 * 통계 업데이트 및 UI로 전송
 */
function updateAndSendStats() {
  if (!appState.mainWindow) return;
  
  // 현재 시간 기준으로 타이핑 시간 계산
  const now = Date.now();
  const typingTime = appState.currentStats.startTime 
    ? Math.floor((now - appState.currentStats.startTime) / 1000) 
    : 0;
    
  // 타이핑 시간 업데이트
  appState.currentStats.typingTime = typingTime;
  
  // 분당 타자 수 계산 (KPM)
  const kpm = typingTime > 0 
    ? Math.round((appState.currentStats.keyCount / typingTime) * 60) 
    : 0;
    
  // 평균 단어 수 추정 (약 5타 = 1단어로 가정)
  const estimatedWords = Math.round(appState.currentStats.keyCount / 5);
  
  // 총 단어 수와 글자 수 업데이트 (구글 문서 기준)
  if (!appState.currentStats.totalWords) {
    appState.currentStats.totalWords = estimatedWords;
  }
  
  if (!appState.currentStats.totalChars) {
    appState.currentStats.totalChars = appState.currentStats.keyCount;
  }
  
  // 공백 제외 글자 수 (문서 기준)
  if (!appState.currentStats.totalCharsNoSpace) {
    appState.currentStats.totalCharsNoSpace = Math.round(appState.currentStats.keyCount * 0.8); // 약 80%로 추정
  }
  
  // 페이지 수 계산 (약 1800자 = 1페이지로 가정)
  appState.currentStats.pages = appState.currentStats.totalChars ? appState.currentStats.totalChars / 1800 : 0;
  
  // UI에 통계 전송
  if (appState.mainWindow && appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('typing-stats-update', {
      keyCount: appState.currentStats.keyCount,
      typingTime: appState.currentStats.typingTime,
      windowTitle: appState.currentStats.currentWindow,
      browserName: appState.currentStats.currentBrowser,
      totalChars: appState.currentStats.totalChars,
      totalCharsNoSpace: appState.currentStats.totalCharsNoSpace,
      totalWords: appState.currentStats.totalWords,
      pages: appState.currentStats.pages,
      accuracy: appState.currentStats.accuracy
    });
  }
  
  // 트레이 메뉴도 갱신
  const { updateTrayMenu } = require('./tray');
  if (typeof updateTrayMenu === 'function') {
    updateTrayMenu();
  }
  
  // 디버깅용 로그
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && appState.currentStats.keyCount % 50 === 0) {
    debugLog('통계 업데이트:', {
      keyCount: appState.currentStats.keyCount,
      typingTime: formatTime(typingTime),
      kpm,
      window: appState.currentStats.currentWindow
    });
  }
}

/**
 * 통계 저장 처리
 * @param {string} content - 저장할 내용 설명
 * @returns {object} 저장된 통계 데이터
 */
function saveStats(content) {
  if (!appState.mainWindow) return null;
  
  const stats = {
    content,
    keyCount: appState.currentStats.keyCount,
    typingTime: appState.currentStats.typingTime,
    timestamp: new Date().toISOString(),
    windowTitle: appState.currentStats.currentWindow,
    browserName: appState.currentStats.currentBrowser,
    totalChars: appState.currentStats.totalChars,
    totalCharsNoSpace: appState.currentStats.totalCharsNoSpace,
    totalWords: appState.currentStats.totalWords,
    pages: appState.currentStats.pages,
    accuracy: appState.currentStats.accuracy
  };
  
  debugLog('저장할 통계 데이터:', stats);
  
  // 통계 초기화
  resetStats();
  
  return stats;
}

/**
 * 통계 초기화
 */
function resetStats() {
  appState.currentStats = {
    keyCount: 0,
    typingTime: 0,
    startTime: null,
    lastActiveTime: null,
    currentWindow: null,
    currentBrowser: null,
    totalChars: 0, 
    totalWords: 0,
    totalCharsNoSpace: 0,
    pages: 0,
    accuracy: 100
  };
  
  debugLog('통계 초기화 완료');
}

/**
 * 통계 시작
 */
function startTracking() {
  appState.isTracking = true;
  appState.currentStats.startTime = Date.now();
  appState.currentStats.lastActiveTime = Date.now();
  
  debugLog('타이핑 모니터링 시작됨');
  return true;
}

/**
 * 통계 중지
 */
function stopTracking() {
  appState.isTracking = false;
  debugLog('타이핑 모니터링 중지됨');
  return true;
}

module.exports = {
  processKeyInput,
  updateAndSendStats,
  saveStats,
  resetStats,
  startTracking,
  stopTracking
};
