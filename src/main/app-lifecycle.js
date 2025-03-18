const { app } = require('electron');
const { appState } = require('./constants');
const { createWindow } = require('./window');
const { setupKeyboardListener } = require('./keyboard');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadSettings } = require('./settings');
const { debugLog } = require('./utils');

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
  
  // 모든 창이 닫힐 때 이벤트
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
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
