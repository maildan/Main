const { ipcMain } = require('electron');
const activeWin = require('active-win');
const { appState } = require('./constants');
const { detectBrowserName, isGoogleDocsWindow } = require('./browser');
const { startTracking, stopTracking, saveStats } = require('./stats');
const { debugLog } = require('./utils');
const { applyWindowMode } = require('./settings');

/**
 * IPC 이벤트 핸들러 등록
 */
function setupIpcHandlers() {
  // 타이핑 모니터링 시작
  ipcMain.on('start-tracking', (event) => {
    debugLog('타이핑 모니터링 시작 요청 받음');
    
    if (!appState.isTracking) {
      startTracking();
      
      // 초기 상태 전송 (UI 업데이트를 위해)
      if (appState.mainWindow) {
        appState.mainWindow.webContents.send('typing-stats-update', {
          isTracking: appState.isTracking,
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
    } else {
      debugLog('이미 모니터링 중입니다');
    }
  });

  // 타이핑 모니터링 중지
  ipcMain.on('stop-tracking', () => {
    debugLog('타이핑 추적 중지 요청 받음');
    stopTracking();
  });

  // 통계 저장 요청
  ipcMain.on('save-stats', (event, content) => {
    debugLog('통계 저장 요청 받음');
    
    try {
      const stats = saveStats(content);
      
      // 메인 창으로 저장 완료 이벤트 전송
      event.reply('stats-saved', stats);
      
      debugLog('통계 저장 및 초기화 완료');
    } catch (error) {
      console.error('통계 저장 중 오류:', error);
    }
  });

  // 브라우저 정보 요청
  ipcMain.on('get-current-browser-info', async (event) => {
    try {
      const windowInfo = await activeWin();
      const browserName = windowInfo ? detectBrowserName(windowInfo) : null;
      const displayName = browserName ? appState.BROWSER_DISPLAY_NAMES[browserName] || browserName : null;
      
      event.reply('current-browser-info', { 
        name: displayName,
        isGoogleDocs: windowInfo ? isGoogleDocsWindow(windowInfo) : false,
        title: windowInfo ? windowInfo.title : null
      });
    } catch (error) {
      console.error('브라우저 정보 가져오기 오류:', error);
      event.reply('current-browser-info', { 
        name: null,
        isGoogleDocs: false,
        title: null,
        error: String(error)
      });
    }
  });

  // 디버그 정보 요청
  ipcMain.on('get-debug-info', (event) => {
    event.reply('debug-info', {
      isTracking: appState.isTracking,
      currentStats: { ...appState.currentStats },
      platform: process.platform,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    });
  });

  // 설정 저장 요청
  ipcMain.on('save-settings', (event, settings) => {
    debugLog('설정 저장 요청 받음:', settings);
    
    try {
      // 임시로 앱 상태에 저장
      appState.settings = settings;
      
      // 응답
      event.reply('settings-saved', { success: true });
      
      debugLog('설정 저장 완료');
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
      event.reply('settings-saved', { success: false, error: String(error) });
    }
  });

  // 설정 로드 요청
  ipcMain.on('load-settings', (event) => {
    debugLog('설정 로드 요청 받음');
    
    try {
      // 임시로 기본 설정 반환
      const settings = appState.settings || {
        enabledCategories: {
          docs: true,
          office: true,
          coding: true,
          sns: true
        },
        autoStartMonitoring: true
      };
      
      event.reply('settings-loaded', settings);
      
      debugLog('설정 로드 완료');
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
      event.reply('settings-loaded', { 
        enabledCategories: {
          docs: true,
          office: true,
          coding: true, 
          sns: true
        },
        autoStartMonitoring: true,
        error: String(error)
      });
    }
  });

  // 윈도우 모드 변경 요청 처리
  ipcMain.on('set-window-mode', (event, mode) => {
    debugLog('윈도우 모드 변경 요청 받음:', mode);
    
    try {
      applyWindowMode(mode);
      appState.settings.windowMode = mode;
      
      // 설정 저장
      event.reply('window-mode-changed', { success: true, mode });
      
      debugLog('윈도우 모드 변경 완료:', mode);
    } catch (error) {
      console.error('윈도우 모드 변경 중 오류:', error);
      event.reply('window-mode-changed', { success: false, error: String(error) });
    }
  });

  // 다크 모드 설정 처리
  ipcMain.on('set-dark-mode', (event, enabled) => {
    debugLog('다크 모드 설정 요청 받음:', enabled);
    
    try {
      appState.settings.darkMode = enabled;
      
      // 설정 저장 
      event.reply('dark-mode-changed', { success: true, enabled });
      
      debugLog('다크 모드 설정 완료:', enabled);
    } catch (error) {
      console.error('다크 모드 설정 중 오류:', error);
      event.reply('dark-mode-changed', { success: false, error: String(error) });
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

  // 윈도우 제어 처리 (minimize, maximize, close)
  ipcMain.on('window-control', (event, command) => {
    debugLog('창 제어 요청 받음:', command);
    
    try {
      if (!appState.mainWindow) {
        console.error('창 제어를 위한 유효한 윈도우가 없습니다');
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
        default:
          console.error('지원되지 않는 창 제어 명령:', command);
      }
    } catch (error) {
      console.error('창 제어 중 오류:', error);
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
  
  debugLog('IPC 핸들러 설정 완료');
}

module.exports = {
  setupIpcHandlers
};
