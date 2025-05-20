/**
 * 창/윈도우 관련 IPC 핸들러
 * 
 * 애플리케이션 윈도우 모드, 창 제어, 미니뷰 등 UI 관련 기능을 처리합니다.
 */
const { ipcMain, BrowserWindow } = require('electron');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const { applyWindowMode } = require('../settings');
const { toggleMiniView } = require('../window');
const { saveSettings } = require('../settings');

/**
 * 창/윈도우 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('창/윈도우 관련 IPC 핸들러 등록 중...');

  // 윈도우 모드 변경 요청 처리
  ipcMain.on('set-window-mode', (event, mode) => {
    debugLog('윈도우 모드 변경 요청 받음:', mode);
    
    try {
      applyWindowMode(mode);
      appState.settings.windowMode = mode;
      
      // 설정 저장
      const saveResult = saveSettings();
      
      // 더 자세한 응답 제공
      event.reply('window-mode-changed', { 
        success: true, 
        mode,
        autoHideToolbar: appState.autoHideToolbar,
        isFullScreen: appState.mainWindow?.isFullScreen() || false,
        saveResult 
      });
      
      // 모든 사용자에게 창 모드 변경 알림
      if (appState.mainWindow && appState.mainWindow.webContents) {
        appState.mainWindow.webContents.send('window-mode-status', {
          mode: mode,
          autoHideToolbar: appState.autoHideToolbar
        });
      }
      
      debugLog('윈도우 모드 변경 완료:', mode);
    } catch (error) {
      console.error('윈도우 모드 변경 중 오류:', error);
      event.reply('window-mode-changed', { success: false, error: String(error) });
    }
  });

  // 현재 창 모드 상태 확인 요청 처리
  ipcMain.on('get-window-mode', (event) => {
    try {
      const isFullScreen = appState.mainWindow?.isFullScreen() || false;
      const mode = isFullScreen ? 'fullscreen' : 'windowed';
      debugLog('창 모드 상태 요청 처리:', mode);
      event.reply('window-mode-status', mode);
    } catch (error) {
      console.error('창 모드 상태 확인 오류:', error);
      event.reply('window-mode-status', 'windowed');
    }
  });

  // 윈도우 제어 처리 (minimize, maximize, close, showHeader, hideHeader, setTitle)
  ipcMain.on('window-control', (event, command, param) => {
    debugLog('창 제어 요청 받음:', command, param);
    
    try {
      if (!appState.mainWindow || appState.mainWindow.isDestroyed()) {
        console.error('창 제어를 위한 유효한 윈도우가 없습니다');
        return;
      }
      
      // 명시적으로 유효한 명령만 처리
      const validCommands = ['minimize', 'maximize', 'close', 'setTitle'];
      if (!validCommands.includes(command)) {
        console.error(`유효하지 않은 창 제어 명령: ${command}`);
        return;
      }
      
      switch (command) {
        case 'minimize':
          appState.mainWindow.minimize();
          break;
        case 'maximize':
          if (appState.mainWindow.isMaximized()) {
            appState.mainWindow.unmaximize();
          } else {
            appState.mainWindow.maximize();
          }
          break;
        case 'close':
          appState.mainWindow.close();
          break;
        case 'setTitle':
          if (param) {
            appState.mainWindow.setTitle(param);
          }
          break;
      }
    } catch (error) {
      console.error('창 제어 중 오류 발생:', error);
    }
  });

  // 창 표시/숨김 토글 요청 처리
  ipcMain.on('toggle-window', (event) => {
    if (!appState.mainWindow) return;
    
    if (appState.mainWindow.isVisible()) {
      appState.mainWindow.hide();
    } else {
      appState.mainWindow.show();
      appState.mainWindow.focus();
    }
  });

  // 미니뷰 토글 요청 처리
  ipcMain.on('toggle-mini-view', () => {
    debugLog('미니뷰 토글 요청 받음');
    
    try {
      toggleMiniView();
    } catch (error) {
      console.error('미니뷰 토글 중 오류:', error);
    }
  });

  // 윈도우 모드 변경 핸들러 수정
  ipcMain.on('change-window-mode', (event, mode) => {
    try {
      // 로그 추가
      console.debug(`윈도우 모드 변경 요청 받음: ${mode}`);
      
      const mainWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
      if (!mainWindow) {
        event.reply('window-mode-change-result', { success: false, error: '윈도우를 찾을 수 없음' });
        return;
      }
      
      console.debug(`창 모드 적용: ${mode}`);
      
      if (mode === 'fullscreen') {
        mainWindow.setFullScreen(true);
      } else if (mode === 'maximized') {
        mainWindow.setFullScreen(false);
        mainWindow.maximize();
      } else if (mode === 'windowed') {
        mainWindow.setFullScreen(false);
        mainWindow.unmaximize();
      }
      
      // 설정 저장
      const success = saveSettings({ windowMode: mode });
      
      event.reply('window-mode-change-result', { success });
    } catch (error) {
      console.error('윈도우 모드 변경 중 오류:', error);
      event.reply('window-mode-change-result', { success: false, error: error.message });
    }
  });

  debugLog('창/윈도우 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register
}; 