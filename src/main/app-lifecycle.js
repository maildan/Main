const { app } = require('electron');
const { appState } = require('./constants');
const { createWindow } = require('./window');
const { setupKeyboardListener } = require('./keyboard');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray, destroyTray } = require('./tray'); // 트레이 기능 임포트 추가

/**
 * 앱 초기화 함수
 */
async function initializeApp() {
  debugLog('앱 초기화 시작');
  
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
 * 앱 종료 정리 함수
 */
function cleanupApp() {
  debugLog('앱 종료 정리 시작');
  
  // 키보드 리스너 해제
  if (appState.keyboardListener) {
    appState.keyboardListener.kill();
    appState.keyboardListener = null;
  }
  
  // 트레이 제거 추가
  destroyTray();
  
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
