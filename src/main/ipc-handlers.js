/**
 * IPC 핸들러 통합 모듈
 * 
 * 이 모듈은 모든 IPC 통신을 처리하는 핸들러를 등록하고 관리합니다.
 * 기능별로 모듈화된 핸들러 파일들을 불러와 사용합니다.
 */
const { ipcMain } = require('electron');
const { appState } = require('./constants');
const { debugLog } = require('./utils');

// 모듈화된 핸들러 가져오기
const ipcHandlers = require('./handlers');

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  try {
    debugLog('IPC 핸들러 설정 중...');
    
    // 모든 IPC 핸들러 등록
    ipcHandlers.setupAllHandlers();
    
    debugLog('IPC 핸들러 설정 완료');
  } catch (error) {
    console.error('IPC 핸들러 설정 오류:', error);
  }
}

/**
 * 모든 IPC 핸들러 등록 - index.js에서 호출하는 함수
 * (기존 코드와의 호환성을 위해 추가)
 */
function registerAllIpcHandlers() {
  setupIpcHandlers();
}

// 모듈 내보내기
module.exports = {
  setupIpcHandlers,
  registerAllIpcHandlers,
  setupKeyboardListenerIfNeeded: ipcHandlers.setupKeyboardListenerIfNeeded,
  cleanupKeyboardListener: ipcHandlers.cleanupKeyboardListener,
  sendStatusToRenderer: ipcHandlers.sendStatusToRenderer
};
