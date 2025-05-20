/**
 * 모니터링 관련 IPC 핸들러
 * 
 * 추적 시작/중지, 통계 저장 등 모니터링 관련 기능을 처리합니다.
 */
const { ipcMain } = require('electron');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const { startTracking, stopTracking, saveStats } = require('../stats');

// 외부 모듈에서 사용할 키보드 리스너 인스턴스 (index.js에서 접근 가능하도록)
let keyboardListenerInstance = null;

/**
 * 자동 모니터링 시작 함수
 * sendStatusToRenderer 함수에서 사용
 */
function startAutoMonitoring() {
  try {
    debugLog('자동 모니터링 시작 시도');
    
    // 설정에서 자동 시작 여부 확인
    const autoStartMonitoring = appState.settings?.autoStartMonitoring;
    
    if (autoStartMonitoring && !appState.isTracking) {
      debugLog('설정에 따라 자동 모니터링 시작');
      startTracking();
      
      if (appState.mainWindow) {
        appState.mainWindow.webContents.send('auto-tracking-started', {
          message: '모니터링이 자동으로 시작되었습니다.'
        });
      }
    }
  } catch (error) {
    console.error('자동 모니터링 시작 오류:', error);
  }
}

/**
 * 렌더러에 모니터링 상태 전송
 */
function sendStatusToRenderer() {
  try {
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      appState.mainWindow.webContents.on('did-finish-load', startAutoMonitoring);
    } else {
      // 앱이 시작되고 약간의 지연 후 시작 (윈도우 없는 경우 대비)
      setTimeout(startAutoMonitoring, 2000);
    }
  } catch (error) {
    console.error('상태 전송 중 오류:', error);
  }
}

/**
 * 현재 상태 저장 (필요한 경우 구현)
 */
function saveCurrentState() {
  // 필요에 따라 구현
  debugLog('현재 상태 저장');
}

/**
 * 모니터링 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('모니터링 관련 IPC 핸들러 등록 중...');

  // 모니터링 시작 핸들러
  ipcMain.handle('start-monitoring', async () => {
    try {
      debugLog('모니터링 시작 요청 수신');
      
      if (appState.isTracking) {
        debugLog('이미 모니터링 중입니다');
        return { 
          success: true, 
          message: '이미 모니터링 중입니다',
          isTracking: true 
        };
      }
      
      // 키보드 리스너 설정
      const { setupKeyboardListenerIfNeeded } = require('./keyboard-handlers');
      const keyboardListenerResult = setupKeyboardListenerIfNeeded();
      
      // 모니터링 상태 변경
      appState.isTracking = true;
      
      // startTracking 함수가 있으면 호출
      if (typeof startTracking === 'function') {
        startTracking();
      }
      
      // 상태 저장
      saveCurrentState();
      
      // 메인 윈도우에 상태 변경 알림
      sendStatusToRenderer();
      
      debugLog('모니터링 시작됨 (키보드 리스너 상태: ' + 
              (keyboardListenerResult ? '활성화됨' : '비활성화됨') + ')');
      
      return { 
        success: true, 
        message: '모니터링 시작됨',
        isTracking: true,
        keyboardActive: keyboardListenerResult
      };
    } catch (error) {
      console.error('모니터링 시작 오류:', error);
      return { success: false, message: error.message };
    }
  });
  
  // 모니터링 중지 핸들러
  ipcMain.handle('stop-monitoring', async () => {
    try {
      debugLog('모니터링 중지 요청 수신');
      
      if (!appState.isTracking) {
        debugLog('이미 모니터링이 중지되었습니다');
        return { 
          success: true, 
          message: '이미 모니터링이 중지되었습니다',
          isTracking: false 
        };
      }
      
      // 키보드 리스너 정리
      const { cleanupKeyboardListener } = require('./keyboard-handlers');
      cleanupKeyboardListener();
      
      // 모니터링 상태 변경
      appState.isTracking = false;
      
      // stopTracking 함수가 있으면 호출
      if (typeof stopTracking === 'function') {
        stopTracking();
      }
      
      // 상태 저장
      if (typeof saveCurrentState === 'function') {
        saveCurrentState();
      }
      
      // 메인 윈도우에 상태 변경 알림
      sendStatusToRenderer();
      
      debugLog('모니터링 중지됨');
      
      return { 
        success: true, 
        message: '모니터링 중지됨',
        isTracking: false 
      };
    } catch (error) {
      console.error('모니터링 중지 오류:', error);
      return { success: false, message: error.message };
    }
  });

  // 앱 전환 모니터링 핸들러 (웹 컴포넌트에서 호출)
  ipcMain.handle('app-switch-detected', async (event, { appName, windowTitle, url }) => {
    try {
      debugLog(`앱 전환 감지 (렌더러에서): ${appName}, ${windowTitle}`);
      
      if (!appState.isTracking) {
        debugLog('모니터링이 꺼져 있어 앱 전환을 처리하지 않음');
        return { success: false, message: '모니터링이 꺼져 있습니다' };
      }
      
      // 키보드 모듈의 updateAppTypingStats 함수 사용
      const { updateAppTypingStats } = require('../keyboard');
      if (typeof updateAppTypingStats === 'function') {
        updateAppTypingStats(appName, windowTitle, url, 5, 200);
        debugLog('앱 전환 타이핑 통계 업데이트 완료');
        return { success: true };
      }
      
      return { success: false, message: 'updateAppTypingStats 함수를 찾을 수 없습니다' };
    } catch (error) {
      console.error('앱 전환 처리 오류:', error);
      return { success: false, message: error.message };
    }
  });

  // 모니터링 시작 요청 처리
  ipcMain.on('start-tracking', () => {
    debugLog('IPC: 모니터링 시작 요청 수신');
    startTracking();
    
    // 키보드 리스너 설정
    const { setupKeyboardListenerIfNeeded } = require('./keyboard-handlers');
    setupKeyboardListenerIfNeeded();
  });

  // 모니터링 중지 요청 처리
  ipcMain.on('stop-tracking', () => {
    debugLog('IPC: 모니터링 중지 요청 수신');
    stopTracking();
    
    // 키보드 리스너 해제
    const { cleanupKeyboardListener } = require('./keyboard-handlers');
    cleanupKeyboardListener();
  });

  // 통계 저장 요청 처리
  ipcMain.on('save-stats', (event, content) => {
    debugLog('IPC: 통계 저장 요청 수신:', content);
    const savedStats = saveStats(content);
    
    // 저장 결과를 렌더러에 전송
    if (savedStats) {
      event.reply('stats-saved', {
        ...savedStats,
        success: true
      });
    } else {
      event.reply('stats-saved', {
        success: false,
        error: '통계 저장 중 오류가 발생했습니다.'
      });
    }
  });

  // 자동 시작 설정 확인
  ipcMain.on('check-auto-start', (event, shouldAutoStart) => {
    if (shouldAutoStart) {
      debugLog('설정에 따라 자동 모니터링 시작');
      startTracking();
      
      if (appState.mainWindow) {
        appState.mainWindow.webContents.send('auto-tracking-started', {
          message: '모니터링이 자동으로 시작되었습니다.'
        });
      }
    }
  });

  // 통계 저장 다이얼로그 열기 요청 처리
  ipcMain.on('save-stats-dialog-opened', (event) => {
    // 통계 저장 대화상자가 열렸음을 확인
    debugLog('통계 저장 대화상자 열림');
  });

  // 주기적인 통계 업데이트를 위한 핸들러
  ipcMain.on('request-stats-update', (event) => {
    const { updateTrayMenu } = require('../tray');
    updateTrayMenu();
  });

  debugLog('모니터링 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register,
  sendStatusToRenderer,
  startAutoMonitoring,
  getKeyboardListenerInstance: () => keyboardListenerInstance,
  setKeyboardListenerInstance: (instance) => { keyboardListenerInstance = instance; }
};