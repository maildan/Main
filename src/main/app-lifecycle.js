const { app } = require('electron');
const { appState, MEMORY_CHECK_INTERVAL, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { createWindow } = require('./window');
const { setupKeyboardListener } = require('./keyboard');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray, destroyTray } = require('./tray');

// 앱 시작 시 하드웨어 가속 비활성화 여부 설정 - app.ready 이벤트 전에 실행
if (appState.settings && !appState.settings.useHardwareAcceleration) {
  try {
    app.disableHardwareAcceleration();
    debugLog('하드웨어 가속 비활성화됨');
  } catch (error) {
    debugLog('하드웨어 가속 비활성화 실패:', error);
  }
}

// GC 노출 설정
try {
  app.commandLine.appendSwitch('js-flags', '--expose-gc');
  debugLog('GC 노출 설정 완료');
} catch (error) {
  debugLog('GC 노출 설정 실패:', error);
}

/**
 * 앱 초기화 함수
 */
async function initializeApp() {
  debugLog('앱 초기화 시작');
  
  // 메모리 사용량 모니터링 시작
  setupMemoryMonitoring();
  
  // 설정 로드
  await loadSettings();
  
  // 메인 윈도우 생성
  createWindow();
  
  // 키보드 리스너 설정
  setupKeyboardListener();
  
  // IPC 핸들러 설정
  setupIpcHandlers();
  
  // 트레이 설정 추가
  if (appState.settings.minimizeToTray) {
    setupTray();
  }
  
  debugLog('앱 초기화 완료');
}

/**
 * 메모리 모니터링 설정
 */
function setupMemoryMonitoring() {
  // 주기적 메모리 체크 및 GC
  const memoryCheckInterval = setInterval(() => {
    const memoryInfo = process.memoryUsage();
    const heapUsedMB = Math.round(memoryInfo.heapUsed / (1024 * 1024));
    
    // 메모리 사용량 저장
    appState.memoryUsage = {
      lastCheck: Date.now(),
      heapUsed: memoryInfo.heapUsed
    };
    
    // 디버그 모드에서만 로깅
    if (process.env.NODE_ENV === 'development') {
      debugLog(`메모리 사용량: ${heapUsedMB}MB (힙), ${Math.round(memoryInfo.rss / (1024 * 1024))}MB (전체)`);
    }
    
    // 임계치 이상이면 GC 수행
    if (memoryInfo.heapUsed > HIGH_MEMORY_THRESHOLD) {
      if (global.gc) {
        debugLog(`메모리 임계치 초과(${heapUsedMB}MB), GC 실행`);
        global.gc();
        
        // GC 후 메모리 재확인
        setTimeout(() => {
          const afterGcMemoryInfo = process.memoryUsage();
          const afterHeapUsedMB = Math.round(afterGcMemoryInfo.heapUsed / (1024 * 1024));
          debugLog(`GC 후 메모리: ${afterHeapUsedMB}MB (이전: ${heapUsedMB}MB, 절약: ${heapUsedMB - afterHeapUsedMB}MB)`);
        }, 500);
      }
    }
    
    // 비활성 시간 체크 (사용자 입력 없을 때)
    const now = Date.now();
    if (appState.currentStats.lastActiveTime) {
      const idleTime = now - appState.currentStats.lastActiveTime;
      appState.idleTime = idleTime;
      
      // 장시간 IDLE 상태면 메모리 정리 더 적극적으로
      if (idleTime > 60000) { // 1분 이상 IDLE
        // 메모리 사용량에 관계없이 GC 실행
        global.gc && global.gc();
        debugLog('장시간 IDLE 상태, 메모리 정리 실행');
      }
    }
  }, MEMORY_CHECK_INTERVAL);
  
  // 앱 종료 시 인터벌 정리
  app.on('will-quit', () => {
    clearInterval(memoryCheckInterval);
  });
}

/**
 * 앱 종료 정리 함수
 */
function cleanupApp() {
  debugLog('앱 종료 정리 시작');
  
  // 키보드 리스너 해제
  if (appState.keyboardListener) {
    appState.keyboardListener.kill();
    appState.keyboardListener = null;
  }
  
  // 모든 인터벌 정리
  if (appState.miniViewStatsInterval) {
    clearInterval(appState.miniViewStatsInterval);
    appState.miniViewStatsInterval = null;
  }
  
  if (appState.updateInterval) {
    clearInterval(appState.updateInterval);
    appState.updateInterval = null;
  }
  
  // 트레이 제거 추가
  destroyTray();
  
  // 최종 메모리 정리
  global.gc && global.gc();
  
  debugLog('앱 종료 정리 완료');
}

/**
 * 앱 이벤트 리스너 설정
 */
function setupAppEventListeners() {
  // 앱 준비 이벤트
  app.on('ready', async () => {
    debugLog('앱 준비 완료');
    await initializeApp();
  });
  
  // 모든 창이 닫힐 때 이벤트 (트레이 모드 지원 추가)
  app.on('window-all-closed', () => {
    // 설정에서 트레이로 최소화 옵션이 비활성화되었거나
    // 명시적으로 종료가 허용된 경우에만 앱 종료
    if (process.platform !== 'darwin' && (!appState.settings.minimizeToTray || appState.allowQuit)) {
      app.quit();
    }
  });
  
  // 앱 활성화 이벤트 (macOS)
  app.on('activate', () => {
    if (appState.mainWindow === null) {
      createWindow();
    }
  });
  
  // 앱 종료 전 이벤트
  app.on('will-quit', cleanupApp);
  
  // 앱이 두 번째로 실행될 때 실행 중인 인스턴스에 포커스
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      // 다른 인스턴스가 실행될 때 메인 윈도우를 복구하고 포커스
      if (appState.mainWindow) {
        if (appState.mainWindow.isMinimized()) appState.mainWindow.restore();
        if (!appState.mainWindow.isVisible()) appState.mainWindow.show();
        appState.mainWindow.focus();
      }
    });
  }
  
  // 렌더러 프로세스 오류 처리
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('렌더러 프로세스 종료:', details);
  });
  
  // 자식 프로세스 오류 처리
  app.on('child-process-gone', (event, details) => {
    console.error('자식 프로세스 종료:', details);
  });
  
  debugLog('앱 이벤트 리스너 설정 완료');
}

module.exports = {
  initializeApp,
  cleanupApp,
  setupAppEventListeners
};
