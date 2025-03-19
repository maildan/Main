const { Worker } = require('worker_threads');
const path = require('path');
const { appState, BROWSER_DISPLAY_NAMES, IDLE_TIMEOUT } = require('./constants');
const { debugLog, formatTime } = require('./utils');
const { saveStats: saveStatsToDb, getStatById } = require('./database');

// 워커 인스턴스 관리
let statWorker = null;

/**
 * 워커 초기화 - CPU 집약적 계산을 위한 별도 스레드
 */
function initializeWorker() {
  if (statWorker) {
    return;
  }
  
  try {
    const workerPath = path.join(__dirname, './workers/stat-worker.js');
    statWorker = new Worker(workerPath);
    
    statWorker.on('message', (message) => {
      switch (message.action) {
        case 'stats-calculated':
          // 계산된 통계 처리
          updateCalculatedStats(message.result);
          break;
        case 'pattern-analyzed':
          // 분석된 패턴 처리
          updateTypingPattern(message.result);
          break;
        case 'error':
          console.error('워커 오류:', message.error);
          break;
      }
    });
    
    statWorker.on('error', (error) => {
      console.error('워커 실행 오류:', error);
      statWorker = null; // 워커 참조 제거
    });
    
    statWorker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`워커가 코드 ${code}로 종료됨`);
      }
      statWorker = null; // 워커 참조 제거
    });
    
    debugLog('통계 워커 초기화 완료');
  } catch (error) {
    console.error('워커 초기화 오류:', error);
    statWorker = null;
  }
}

/**
 * 계산된 통계 정보로 앱 상태 업데이트
 * @param {Object} result - 계산된 통계 결과
 */
function updateCalculatedStats(result) {
  if (!result) return;
  
  // 계산된 값으로 통계 업데이트 (객체 복제 없이 직접 속성 업데이트)
  appState.currentStats.totalWords = result.wordCount;
  appState.currentStats.totalChars = result.characterCount;
  appState.currentStats.pages = result.pageCount;
  appState.currentStats.accuracy = result.accuracy;
  
  // UI에 통계 전송
  updateAndSendStats();
}

/**
 * 분석된 타이핑 패턴 정보 업데이트
 * @param {Object} result - 분석된 패턴 결과
 */
function updateTypingPattern(result) {
  if (!result) return;
  
  // 패턴 정보를 앱 상태에 저장 (필요한 경우)
  appState.typingPatterns = result;
  
  // 필요한 경우 UI에 전송
  if (appState.mainWindow && appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('typing-patterns-update', result);
  }
}

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
  
  // 일정 키 입력마다 별도 스레드에서 고급 통계 계산
  if (appState.currentStats.keyCount % 20 === 0) {
    calculateStatsInWorker();
  }
}

/**
 * 워커를 사용하여 통계 계산
 * 메모리 최적화: CPU 집약적 작업을 별도 스레드로 분리
 */
function calculateStatsInWorker() {
  if (!statWorker) {
    initializeWorker();
  }
  
  if (statWorker) {
    // 현재 입력 내용을 워커로 전송 (필요한 데이터만 전송)
    statWorker.postMessage({
      action: 'calculate-stats',
      data: {
        keyCount: appState.currentStats.keyCount,
        typingTime: appState.currentStats.typingTime,
        content: appState.currentContent || '',
        errors: appState.currentStats.errors || 0
      }
    });
  } else {
    // 워커 사용 불가능한 경우 메인 스레드에서 간단히 계산
    updateCalculatedStatsMain();
  }
}

/**
 * 워커 없이 메인 스레드에서 간단한 통계 계산 (폴백)
 * 메모리 최적화: 필수 계산만 수행
 */
function updateCalculatedStatsMain() {
  const { keyCount } = appState.currentStats;
  
  // 간단한 추정
  appState.currentStats.totalWords = Math.round(keyCount / 5);
  appState.currentStats.totalChars = keyCount;
  appState.currentStats.pages = keyCount / 1800;
  appState.currentStats.accuracy = 100; // 기본값
}

/**
 * 통계 업데이트 및 UI로 전송
 * 메모리 최적화: 객체 복제 최소화
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
  
  // 속도 계산 (KPM)
  const kpm = typingTime > 0 
    ? Math.round((appState.currentStats.keyCount / typingTime) * 60) 
    : 0;
    
  // 필요한 통계 계산 (객체 복제 없이)
  if (!appState.currentStats.totalWords) {
    appState.currentStats.totalWords = Math.round(appState.currentStats.keyCount / 5);
  }
  
  if (!appState.currentStats.totalChars) {
    appState.currentStats.totalChars = appState.currentStats.keyCount;
  }
  
  if (!appState.currentStats.totalCharsNoSpace) {
    appState.currentStats.totalCharsNoSpace = Math.round(appState.currentStats.keyCount * 0.8);
  }
  
  appState.currentStats.pages = appState.currentStats.totalChars / 1800;
  
  // UI에 통계 전송 (불필요한 속성 제외)
  if (appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('typing-stats-update', {
      keyCount: appState.currentStats.keyCount,
      typingTime: appState.currentStats.typingTime,
      windowTitle: appState.currentStats.currentWindow,
      browserName: appState.currentStats.currentBrowser,
      totalChars: appState.currentStats.totalChars,
      totalWords: appState.currentStats.totalWords,
      pages: appState.currentStats.pages,
      accuracy: appState.currentStats.accuracy
    });
  }
  
  // 트레이 메뉴 갱신
  const { updateTrayMenu } = require('./tray');
  if (typeof updateTrayMenu === 'function') {
    updateTrayMenu();
  }
  
  // 주기적 메모리 사용량 체크 (50회 간격)
  if (appState.currentStats.keyCount % 50 === 0) {
    const { checkMemoryUsage } = require('./memory-manager');
    checkMemoryUsage();
  }
  
  // 디버깅용 로그 (필수적인 경우만)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && appState.currentStats.keyCount % 200 === 0) {
    debugLog('통계 업데이트:', {
      keyCount: appState.currentStats.keyCount,
      typingTime: formatTime(typingTime),
      kpm,
      window: appState.currentStats.currentWindow?.substring(0, 30)
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
  
  try {
    // 메모리 최적화: 필요한 데이터만 포함
    const stats = {
      content,
      key_count: appState.currentStats.keyCount,
      typing_time: appState.currentStats.typingTime,
      timestamp: new Date().toISOString(),
      window_title: appState.currentStats.currentWindow,
      browser_name: appState.currentStats.currentBrowser,
      total_chars: appState.currentStats.totalChars,
      total_words: appState.currentStats.totalWords,
      pages: appState.currentStats.pages,
      accuracy: appState.currentStats.accuracy
    };
    
    debugLog('저장할 통계 데이터:', stats);
    
    // SQLite 데이터베이스에 저장
    const savedId = saveStatsToDb(stats);
    
    // 메모리 사용량 최적화를 위한 통계 초기화
    resetStats();
    
    // 저장된 데이터 반환
    return getStatById(savedId) || stats;
  } catch (error) {
    console.error('통계 저장 중 오류:', error);
    
    // 오류 발생 시에도 통계 초기화
    resetStats();
    return null;
  }
}

/**
 * 통계 초기화
 * 메모리 최적화: 객체 재생성 대신 속성만 초기화
 */
function resetStats() {
  // 기존 객체의 참조는 유지하면서 내부 값만 초기화
  const stats = appState.currentStats;
  stats.keyCount = 0;
  stats.typingTime = 0;
  stats.startTime = null;
  stats.lastActiveTime = null;
  stats.totalChars = 0;
  stats.totalWords = 0;
  stats.totalCharsNoSpace = 0;
  stats.pages = 0;
  stats.accuracy = 100;
  
  // 창 정보는 유지 (불필요한 문자열 재생성 방지)
  debugLog('통계 초기화 완료');
  
  // 메모리 정리
  if (global.gc && appState.currentStats.keyCount > 1000) {
    global.gc();
  }
}

/**
 * 통계 시작
 */
function startTracking() {
  appState.isTracking = true;
  appState.currentStats.startTime = Date.now();
  appState.currentStats.lastActiveTime = Date.now();
  
  // 워커 초기화
  initializeWorker();
  
  debugLog('타이핑 모니터링 시작됨');
  return true;
}

/**
 * 통계 중지
 * 메모리 최적화: 불필요한 리소스 정리
 */
function stopTracking() {
  appState.isTracking = false;
  
  // 워커 종료 (메모리 해제)
  if (statWorker) {
    statWorker.terminate();
    statWorker = null;
  }
  
  debugLog('타이핑 모니터링 중지됨');
  return true;
}

/**
 * 리소스 해제 함수 (메모리 누수 방지)
 */
function cleanup() {
  if (statWorker) {
    statWorker.terminate();
    statWorker = null;
  }
  
  // 참조 정리
  appState.currentContent = null;
}

module.exports = {
  processKeyInput,
  updateAndSendStats,
  saveStats,
  resetStats,
  startTracking,
  stopTracking,
  cleanup, // 리소스 해제 함수 추가
  initializeWorker // 워커 초기화 함수 내보내기
};
