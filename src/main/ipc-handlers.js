const { ipcMain, app, globalShortcut, BrowserWindow } = require('electron');
const activeWin = require('active-win');
const { appState, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { detectBrowserName, isGoogleDocsWindow } = require('./browser');
const { startTracking, stopTracking, saveStats, resetStats } = require('./stats');
const { debugLog } = require('./utils');
const { applyWindowMode } = require('./settings');
const { saveSettings, getSettings, loadSettings } = require('./settings');
const { createMiniViewWindow, toggleMiniView } = require('./window');
const { showRestartPrompt } = require('./dialogs');
const { 
  forceMemoryOptimization, 
  performGarbageCollection, 
  getCurrentMemoryUsage, 
  getMemoryManagerStats 
} = require('./memory-manager');

// 전역 단축키 등록 함수
function registerShortcuts() {
  try {
    // CTRL+R 단축키 (새로고침) 재정의
    globalShortcut.register('CommandOrControl+R', () => {
      const mainWindow = appState.mainWindow;
      if (!mainWindow || mainWindow.isDestroyed()) return;
      
      debugLog('CTRL+R 단축키 감지, 설정 유지하며 새로고침 실행');
      
      // 새로고침 전에 현재 설정을 임시 저장
      const currentSettings = { ...appState.settings };
      
      // 창 새로고침
      mainWindow.reload();
      
      // 설정을 즉시 다시 적용 (설정 유지)
      setTimeout(() => {
        if (currentSettings.darkMode !== undefined) {
          mainWindow.webContents.executeJavaScript(`
            if (${currentSettings.darkMode}) {
              document.documentElement.classList.add('dark-mode');
              document.body.classList.add('dark-mode');
            } else {
              document.documentElement.classList.remove('dark-mode');
              document.body.classList.remove('dark-mode');
            }
          `).catch(err => {
            console.error('다크 모드 설정 유지 중 오류:', err);
          });
        }
      }, 500);
    });
    
    debugLog('전역 단축키 등록 완료');
  } catch (error) {
    console.error('단축키 등록 중 오류:', error);
  }
}

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  // 자동 모니터링 시작 처리
  if (appState.settings?.autoStartMonitoring) {
    debugLog('자동 모니터링 시작 설정 감지됨');
    
    // 메인 윈도우가 준비되면 자동으로 모니터링 시작
    const startAutoMonitoring = () => {
      if (!appState.isTracking) {
        debugLog('자동 모니터링 시작 실행');
        startTracking();
        
        // 렌더러에 모니터링 시작 상태 알림 (지연 추가)
        setTimeout(() => {
          if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
            appState.mainWindow.webContents.send('auto-tracking-started', {
              timestamp: Date.now(),
              isAutoStart: true
            });
          }
        }, 1000); // 1초 지연으로 렌더러가 준비되도록 함
      }
    };
    
    // 윈도우가 로드된 후 실행
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      appState.mainWindow.webContents.on('did-finish-load', startAutoMonitoring);
    } else {
      // 앱이 시작되고 약간의 지연 후 시작 (윈도우 없는 경우 대비)
      setTimeout(startAutoMonitoring, 2000);
    }
  }

  // 앱이 준비되면 단축키 등록
  if (app.isReady()) {
    registerShortcuts();
  } else {
    app.on('ready', registerShortcuts);
  }

  // 앱 종료 시 단축키 해제
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  // 모니터링 시작 요청 처리
  ipcMain.on('start-tracking', () => {
    debugLog('IPC: 모니터링 시작 요청 수신');
    startTracking();
  });

  // 모니터링 중지 요청 처리
  ipcMain.on('stop-tracking', () => {
    debugLog('IPC: 모니터링 중지 요청 수신');
    stopTracking();
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

  // 설정 저장 요청 처리
  ipcMain.on('save-settings', async (event, newSettings) => {
    try {
      debugLog('IPC: 설정 저장 요청 수신');
      
      // 이전 설정 값 저장
      const prevSettings = { ...appState.settings };
      
      // 자동 모니터링 설정 변경 시 처리
      const autoMonitoringChanged = 
        prevSettings?.autoStartMonitoring !== newSettings.autoStartMonitoring;
      
      // GPU 가속 또는 처리 모드 설정 변경 확인
      const gpuSettingsChanged = 
        prevSettings?.useHardwareAcceleration !== newSettings.useHardwareAcceleration ||
        prevSettings?.processingMode !== newSettings.processingMode;
      
      // 설정 저장
      const saved = await saveSettings(newSettings);
      
      // 앱 상태의 설정도 업데이트
      appState.settings = { ...newSettings };
      
      // 자동 시작 설정 변경 시
      if (autoMonitoringChanged) {
        if (newSettings.autoStartMonitoring && !appState.isTracking) {
          debugLog('설정 변경: 자동 모니터링 활성화됨, 모니터링 시작');
          startTracking();
        } else if (!newSettings.autoStartMonitoring && appState.isTracking) {
          debugLog('설정 변경: 자동 모니터링 비활성화됨');
          // 자동 모니터링을 비활성화해도 현재 세션은 유지
        }
      }
      
      // 창 모드 설정 변경 시 적용
      if (newSettings.windowMode !== prevSettings?.windowMode) {
        const { setWindowMode } = require('./window');
        setWindowMode(newSettings.windowMode);
      }
      
      // 설정 결과 응답
      event.reply('settings-saved', { 
        success: true, 
        settings: newSettings,
        restartRequired: gpuSettingsChanged
      });
      
      // GPU 설정 변경 시 재시작 필요 안내
      if (gpuSettingsChanged) {
        debugLog('GPU 관련 설정 변경됨, 재시작 필요');
        const { showRestartPrompt } = require('./dialogs');
        showRestartPrompt();
      }
    } catch (error) {
      console.error('설정 저장 오류:', error);
      event.reply('settings-saved', { 
        success: false, 
        error: error.message 
      });
    }
  });

  // 설정 로드 요청 처리 - 중복된 핸들러 제거 및 통합
  ipcMain.handle('load-settings', async () => {
    try {
      debugLog('IPC: 설정 로드 요청 수신');
      const settings = await loadSettings();
      return settings;
    } catch (error) {
      console.error('설정 로드 오류:', error);
      // 기본 설정 반환
      return {
        enabledCategories: {
          docs: true,
          office: true,
          coding: true,
          sns: true
        },
        autoStartMonitoring: true,
        darkMode: false,
        windowMode: 'windowed',
        resumeAfterIdle: true,
        minimizeToTray: true,
        showTrayNotifications: true,
        reduceMemoryInBackground: true,
        enableMiniView: true,
        useHardwareAcceleration: false,
        processingMode: 'auto',
        maxMemoryThreshold: 100
      };
    }
  });
  
  // 다크 모드 설정 요청 처리
  ipcMain.on('set-dark-mode', async (event, enabled) => {
    try {
      debugLog(`IPC: 다크 모드 ${enabled ? '활성화' : '비활성화'} 요청 수신`);
      
      // 이전 설정 값 저장
      const prevSettings = { ...appState.settings };
      
      // 설정 업데이트
      const newSettings = {
        ...prevSettings,
        darkMode: !!enabled
      };
      
      // 설정 저장
      const saved = await saveSettings(newSettings);
      
      // 앱 상태의 설정도 업데이트
      appState.settings = newSettings;
      
      // 메인 윈도우에 다크 모드 CSS 적용
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        try {
          const darkModeScript = `
            document.documentElement.classList.${enabled ? 'add' : 'remove'}('dark-mode');
            document.body.classList.${enabled ? 'add' : 'remove'}('dark-mode');
          `;
          
          await appState.mainWindow.webContents.executeJavaScript(darkModeScript);
          debugLog(`다크 모드 CSS ${enabled ? '추가' : '제거'} 완료`);
          
          // 배경색 변경
          appState.mainWindow.setBackgroundColor(enabled ? '#121212' : '#f9f9f9');
        } catch (cssError) {
          console.error('다크 모드 CSS 적용 오류:', cssError);
        }
      }
      
      // 설정 결과 응답
      event.reply('dark-mode-updated', { 
        success: true, 
        darkMode: enabled
      });
    } catch (error) {
      console.error('다크 모드 설정 오류:', error);
      event.reply('dark-mode-updated', { 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // 다크 모드 상태 요청 처리
  ipcMain.handle('get-dark-mode', () => {
    try {
      debugLog('IPC: 다크 모드 상태 요청 수신');
      return appState.settings?.darkMode || false;
    } catch (error) {
      console.error('다크 모드 상태 조회 오류:', error);
      return false;
    }
  });

  // 테마 설정 저장 핸들러
  ipcMain.handle('set-theme', async (event, themeSettings) => {
    try {
      debugLog(`IPC: 테마 설정 저장 요청 수신: ${JSON.stringify(themeSettings)}`);
      
      // 이전 설정 값 저장
      const prevSettings = { ...appState.settings };
      
      // 설정 업데이트
      const newSettings = {
        ...prevSettings,
        darkMode: themeSettings.theme === 'dark',
        colorScheme: themeSettings.colorScheme || 'default',
        useSystemTheme: themeSettings.useSystemTheme || false
      };
      
      // 설정 저장
      const saved = await saveSettings(newSettings);
      
      // 앱 상태의 설정도 업데이트
      appState.settings = newSettings;
      
      // 메인 윈도우에 테마 CSS 적용
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        try {
          const isDarkMode = themeSettings.theme === 'dark';
          const colorScheme = themeSettings.colorScheme || 'default';
          
          const themeScript = `
            // 다크 모드 클래스 적용
            document.documentElement.classList.${isDarkMode ? 'add' : 'remove'}('dark-mode');
            document.body.classList.${isDarkMode ? 'add' : 'remove'}('dark-mode');
            
            // 컬러 스키마 클래스 적용
            document.documentElement.classList.remove(
              'theme-default', 
              'theme-blue', 
              'theme-green', 
              'theme-purple', 
              'theme-high-contrast'
            );
            document.documentElement.classList.add('theme-${colorScheme}');
            
            // 데이터 속성 설정
            document.documentElement.setAttribute('data-theme', '${isDarkMode ? 'dark' : 'light'}');
            document.documentElement.setAttribute('data-color-scheme', '${colorScheme}');
          `;
          
          await appState.mainWindow.webContents.executeJavaScript(themeScript);
          debugLog(`테마 CSS 적용 완료 (다크모드: ${isDarkMode}, 컬러스키마: ${colorScheme})`);
          
          // 배경색 변경
          appState.mainWindow.setBackgroundColor(isDarkMode ? '#121212' : '#f9f9f9');
        } catch (cssError) {
          console.error('테마 CSS 적용 오류:', cssError);
        }
      }
      
      return { success: true, settings: newSettings };
    } catch (error) {
      console.error('테마 설정 저장 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 테마 설정 가져오기 핸들러
  ipcMain.handle('get-theme', () => {
    try {
      debugLog('IPC: 테마 설정 요청 수신');
      
      // 기본 설정이 없는 경우 기본값 반환
      if (!appState.settings) {
        return {
          theme: 'light',
          colorScheme: 'default',
          useSystemTheme: false
        };
      }
      
      return {
        theme: appState.settings.darkMode ? 'dark' : 'light',
        colorScheme: appState.settings.colorScheme || 'default',
        useSystemTheme: appState.settings.useSystemTheme || false
      };
    } catch (error) {
      console.error('테마 설정 조회 오류:', error);
      return {
        theme: 'light',
        colorScheme: 'default',
        useSystemTheme: false,
        error: error.message
      };
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

  // 앱 재시작 핸들러 - 명확하게 재정의
  ipcMain.on('restart-app', () => {
    debugLog('앱 재시작 요청 수신');
    try {
      restartApplication();
      return { success: true };
    } catch (error) {
      console.error('앱 재시작 중 오류:', error);
      return { success: false, error: String(error) };
    }
  });

  // 재시작 창에서 재시작 요청 핸들러 - 명확하게 재정의
  ipcMain.on('restart-app-from-dialog', () => {
    debugLog('재시작 창에서 재시작 요청 수신');
    restartApplication();
  });

  // 재시작 안내 창 표시 핸들러 - 명확하게 재정의
  ipcMain.on('show-restart-prompt', async () => {
    debugLog('재시작 안내 창 표시 요청 수신');
    try {
      const response = await showRestartPrompt();
      
      if (response === 0) {
        // 사용자가 재시작 선택
        restartApplication();
      }
    } catch (error) {
      console.error('재시작 안내 창 표시 중 오류:', error);
    }
  });

  // 대화 상자에서 재시작 요청 처리 (대화 상자 전용 채널)
  ipcMain.on('restart-app-from-dialog', () => {
    debugLog('대화 상자에서 재시작 요청 수신');
    
    // 중복 재시작 방지를 위한 검사
    if (appState.isRestarting) {
      debugLog('이미 재시작이 진행 중입니다. 중복 요청 무시');
      return;
    }
    
    // 재시작 플래그 설정
    appState.isRestarting = true;
    
    // 재시작 관련 모든 창 정리
    const cleanupWindows = () => {
      // 재시작 창 닫기
      if (appState.restartWindow && !appState.restartWindow.isDestroyed()) {
        appState.restartWindow.close();
        appState.restartWindow = null;
      }
      
      // 기타 모달 창 정리 (추가적인 창이 있는 경우)
      Object.keys(appState).forEach(key => {
        if (key.toLowerCase().includes('window') && key !== 'mainWindow' && appState[key]) {
          const win = appState[key];
          if (win && typeof win.close === 'function' && !win.isDestroyed()) {
            try {
              win.close();
            } catch (e) {
              console.debug(`창 닫기 오류 (무시됨): ${e.message}`);
            }
          }
        }
      });
    };
    
    // 재시작 로직
    try {
      // 안전한 종료를 위한 플래그 설정
      appState.allowQuit = true;
      
      // 모든 창 정리
      cleanupWindows();
      
      // 설정 저장 후 재시작
      saveSettings(appState.settings)
        .then(() => {
          debugLog('재시작 전 설정 저장 완료');
          
          // 약간의 지연 후 재시작 (로딩 화면을 보여주기 위해)
          setTimeout(() => {
            debugLog('앱 재시작 실행 (대화 상자에서)');
            app.relaunch();
            app.exit(0);
          }, 1000);
        })
        .catch(error => {
          console.error('재시작 전 설정 저장 중 오류:', error);
          
          // 오류가 있어도 재시작 시도
          setTimeout(() => {
            app.relaunch();
            app.exit(0);
          }, 1000);
        });
    } catch (error) {
      console.error('앱 재시작 처리 중 오류 (대화 상자):', error);
      
      // 오류 발생해도 재시작 시도
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1000);
    }
  });

  // 재시작 창 닫기 핸들러
  ipcMain.on('close-restart-window', () => {
    debugLog('재시작 창 닫기 요청 수신');
    
    if (appState.restartWindow && !appState.restartWindow.isDestroyed()) {
      appState.restartWindow.close();
      appState.restartWindow = null;
    }
  });

  // 윈도우 모드 변경 요청 처리
  ipcMain.on('set-window-mode', async (event, mode) => {
    debugLog('윈도우 모드 변경 요청 받음:', mode);
    
    try {
      applyWindowMode(mode);
      appState.settings.windowMode = mode;
      
      // 설정 저장 (비동기 처리)
      await saveSettings();
      
      // 직렬화 가능한 데이터만 전송
      event.reply('window-mode-changed', { 
        success: true, 
        mode,
        autoHideToolbar: appState.autoHideToolbar,
        isFullScreen: appState.mainWindow?.isFullScreen() || false
      });
      
      // 모든 사용자에게 창 모드 변경 알림 (기존 로직 유지)
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
  
  // 트레이에서 타겟 탭으로 이동하는 이벤트 핸들러
  ipcMain.on('switch-to-tab-handled', (event, tab) => {
    // 탭 전환 완료 알림을 받으면 트레이 메뉴 업데이트
    debugLog(`탭 전환 완료: ${tab}`);
    const { updateTrayMenu } = require('./tray');
    updateTrayMenu();
  });
  
  // 통계 저장 다이얼로그 열기 요청 처리
  ipcMain.on('save-stats-dialog-opened', (event) => {
    // 통계 저장 대화상자가 열렸음을 확인
    debugLog('통계 저장 대화상자 열림');
  });
  
  // 주기적인 통계 업데이트를 위한 핸들러
  ipcMain.on('request-stats-update', (event) => {
    const { updateTrayMenu } = require('./tray');
    updateTrayMenu();
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
  
  // 트레이 설정 업데이트 처리
  ipcMain.on('update-tray-settings', async (event, settings) => {
    debugLog('트레이 설정 업데이트 요청:', settings);
    
    try {
      if (settings.minimizeToTray !== undefined) {
        appState.settings.minimizeToTray = settings.minimizeToTray;
      }
      
      if (settings.showTrayNotifications !== undefined) {
        appState.settings.showTrayNotifications = settings.showTrayNotifications;
      }
      
      if (settings.reduceMemoryInBackground !== undefined) {
        appState.settings.reduceMemoryInBackground = settings.reduceMemoryInBackground;
      }
      
      const { setupTray, destroyTray } = require('./tray');
      
      if (!appState.settings.minimizeToTray && appState.tray) {
        destroyTray();
      } else if (appState.settings.minimizeToTray && !appState.tray) {
        setupTray();
      }
      
      // 설정 업데이트 후 저장 (비동기 처리)
      await saveSettings();
      
      // 직렬화 가능한 데이터만 전송
      event.reply('tray-settings-updated', { 
        success: true, 
        settings: {
          minimizeToTray: appState.settings.minimizeToTray,
          showTrayNotifications: appState.settings.showTrayNotifications,
          reduceMemoryInBackground: appState.settings.reduceMemoryInBackground
        }
      });
      
    } catch (error) {
      console.error('트레이 설정 업데이트 오류:', error);
      event.reply('tray-settings-updated', { 
        success: false, 
        error: String(error)
      });
    }
  });
  
  // 앱 종료 요청 처리 (트레이 메뉴에서 호출)
  ipcMain.on('quit-app', () => {
    debugLog('앱 종료 요청 받음');
    appState.allowQuit = true;
    app.quit();
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
      const { toggleMiniView } = require('./window');
      toggleMiniView();
    } catch (error) {
      console.error('미니뷰 토글 중 오류:', error);
    }
  });

  // 메모리 사용량 정보 요청 처리
  ipcMain.handle('get-memory-usage', () => {
    try {
      const { getMemoryInfo } = require('./memory-manager');
      const memoryInfo = getMemoryInfo();
      debugLog('메모리 사용량 정보 요청됨:', memoryInfo.heapUsedMB + 'MB');
      return memoryInfo;
    } catch (error) {
      console.error('메모리 정보 요청 처리 중 오류:', error);
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        heapUsedMB: 0,
        rssMB: 0,
        percentUsed: 0,
        error: String(error)
      };
    }
  });
  
  // 수동 가비지 컬렉션 요청 처리
  ipcMain.on('request-gc', (event) => {
    debugLog('수동 가비지 컬렉션 요청 받음');
    
    try {
      // 네이티브 모듈 사용 시도
      const nativeModule = require('../native-modules');
      if (nativeModule && typeof nativeModule.force_garbage_collection === 'function') {
        // Rust 네이티브 GC 호출
        const resultJson = nativeModule.force_garbage_collection();
        
        try {
          const result = JSON.parse(resultJson);
          event.reply('gc-completed', {
            success: true,
            timestamp: result.timestamp,
            freedMemory: result.freed_memory || 0,
            freedMB: result.freed_mb || 0
          });
          return;
        } catch (parseError) {
          debugLog('네이티브 GC 결과 파싱 오류:', parseError);
        }
      }
      
      // 네이티브 모듈 사용 불가능한 경우 기본 구현으로 폴백
      const { performGC } = require('./memory-manager');
      const result = performGC();
      
      // 결과 전송
      event.reply('gc-completed', {
        success: true,
        timestamp: Date.now(),
        memoryBefore: result?.before
      });
    } catch (error) {
      console.error('가비지 컬렉션 요청 처리 중 오류:', error);
      event.reply('gc-completed', {
        success: false,
        error: String(error)
      });
    }
  });
  
  // 메모리 최적화 요청 처리
  ipcMain.on('optimize-memory', (event) => {
    debugLog('메모리 최적화 요청 받음');
    
    try {
      // 네이티브 모듈 사용 시도
      const nativeModule = require('../native-modules');
      if (nativeModule && typeof nativeModule.optimize_memory === 'function') {
        // 최적화 레벨 결정
        const isEmergency = appState.memoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD;
        const level = isEmergency ? 4 : 2;
        
        // Rust 네이티브 메모리 최적화 호출
        const resultJson = nativeModule.optimize_memory(level, isEmergency);
        
        try {
          const result = JSON.parse(resultJson);
          const memoryInfo = require('./memory-manager').getMemoryInfo();
          
          event.reply('memory-optimized', {
            success: true,
            result,
            memoryInfo
          });
          return;
        } catch (parseError) {
          debugLog('네이티브 최적화 결과 파싱 오류:', parseError);
        }
      }
      
      // 네이티브 모듈 사용 불가능한 경우 기본 구현으로 폴백
      const { freeUpMemoryResources } = require('./memory-manager');
      const isEmergency = appState.memoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD;
      
      freeUpMemoryResources(isEmergency);
      
      // GC 요청
      if (global.gc) {
        setTimeout(() => {
          global.gc();
          
          // 최적화 후 메모리 정보 반환
          const { getMemoryInfo } = require('./memory-manager');
          const memoryInfo = getMemoryInfo();
          
          event.reply('memory-optimized', {
            success: true,
            memoryInfo
          });
        }, 200);
      } else {
        event.reply('memory-optimized', {
          success: false,
          error: 'GC를 사용할 수 없음 (--expose-gc 플래그 필요)'
        });
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
      event.reply('memory-optimized', {
        success: false,
        error: String(error)
      });
    }
  });

  // 렌더러 프로세스에 GC 요청 수신
  ipcMain.on('renderer-gc-completed', (_, data) => {
    debugLog('렌더러 GC 완료:', data);
    // 필요한 경우 여기서 추가 작업 수행
  });
  
  // 메모리 상태 모니터링 요청
  ipcMain.handle('check-memory', async () => {
    try {
      const { checkMemoryUsage } = require('./memory-manager');
      const memoryInfo = checkMemoryUsage();
      return { success: true, memoryInfo };
    } catch (error) {
      console.error('메모리 상태 확인 중 오류:', error);
      return { 
        success: false, 
        error: String(error) 
      };
    }
  });
  
  // 메모리 모니터링 옵션 업데이트
  ipcMain.on('update-memory-settings', (event, settings) => {
    try {
      if (settings.garbageCollectionInterval !== undefined) {
        appState.settings.garbageCollectionInterval = settings.garbageCollectionInterval;
      }
      
      if (settings.maxMemoryThreshold !== undefined) {
        appState.settings.maxMemoryThreshold = settings.maxMemoryThreshold;
      }
      
      // 설정 저장
      saveSettings();
      
      event.reply('memory-settings-updated', { 
        success: true, 
        settings: {
          garbageCollectionInterval: appState.settings.garbageCollectionInterval,
          maxMemoryThreshold: appState.settings.maxMemoryThreshold
        } 
      });
    } catch (error) {
      console.error('메모리 설정 업데이트 중 오류:', error);
      event.reply('memory-settings-updated', { 
        success: false, 
        error: String(error) 
      });
    }
  });

  // 타이핑 통계 가져오기 핸들러 추가
  ipcMain.handle('get-typing-stats', () => {
    debugLog('타이핑 통계 요청 수신');
    try {
      // 앱 상태에서 현재 통계 정보만 추출
      const stats = {
        keyCount: appState.currentStats.keyCount || 0,
        typingTime: appState.currentStats.typingTime || 0,
        windowTitle: appState.currentStats.currentWindow || '',
        browserName: appState.currentStats.currentBrowser || '',
        totalChars: appState.currentStats.totalChars || 0,
        totalWords: appState.currentStats.totalWords || 0,
        pages: appState.currentStats.pages || 0,
        accuracy: appState.currentStats.accuracy || 100,
        isTracking: appState.isTracking
      };
      return stats;
    } catch (error) {
      console.error('타이핑 통계 요청 처리 중 오류:', error);
      return {
        error: String(error),
        keyCount: 0,
        typingTime: 0,
        isTracking: appState.isTracking || false
      };
    }
  });

  debugLog('IPC 핸들러 설정 완료');
}

/**
 * 앱 재시작 공통 함수
 * 중복 코드를 방지하기 위해 별도 함수로 분리
 */
function restartApplication() {
  try {
    // Track that we're already restarting to prevent multiple restarts
    if (appState.isRestarting) {
      debugLog('이미 재시작이 진행 중입니다. 중복 요청 무시');
      return;
    }
    
    appState.isRestarting = true;
    
    // 모든 창 정리 (이미 있는 cleanupWindows 함수 사용)
    const cleanupWindows = () => {
      // Close all windows including modals
      Object.keys(appState).forEach(key => {
        if (key.toLowerCase().includes('window') && appState[key]) {
          const win = appState[key];
          if (win && typeof win.close === 'function' && !win.isDestroyed()) {
            try {
              win.close();
            } catch (e) {
              console.debug(`창 닫기 오류 (무시됨): ${e.message}`);
            }
          }
        }
      });
    };
    
    // 재시작 전에 로딩 화면 표시
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      appState.mainWindow.webContents.send('show-restart-loading', { 
        message: '재시작 중입니다...',
        timeout: 1500
      });
    }
    
    // 안전한 종료를 위한 플래그 설정
    appState.allowQuit = true;
    
    // 설정 저장 확인
    saveSettings(appState.settings)
      .then(() => {
        debugLog('재시작 전 설정 저장 완료');
        
        // 약간의 지연 후 재시작 (로딩 화면을 보여주기 위해)
        setTimeout(() => {
          debugLog('앱 재시작 실행');
          try {
            app.relaunch();
            app.exit(0);
          } catch (error) {
            console.error('앱 재시작 실행 중 오류:', error);
          }
        }, 1000);
      })
      .catch(error => {
        console.error('재시작 전 설정 저장 중 오류:', error);
        // 오류가 있어도 재시작 시도
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 1000);
      });
  } catch (error) {
    console.error('앱 재시작 처리 중 오류:', error);
    
    // 오류가 발생해도 일정 시간 후 재시작 시도
    setTimeout(() => {
      try {
        app.relaunch();
        app.exit(0);
      } catch (innerError) {
        console.error('최종 재시작 시도 중 오류:', innerError);
      }
    }, 2000);
  }
}

/**
 * 메모리 관련 IPC 핸들러 등록
 */
function registerMemoryIpcHandlers() {
  // 메모리 최적화 요청 처리
  ipcMain.handle('optimize-memory', async (event, level = 2, emergency = false) => {
    try {
      const result = await forceMemoryOptimization(level, emergency);
      return { success: true, result };
    } catch (error) {
      console.error('메모리 최적화 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 가비지 컬렉션 요청 처리
  ipcMain.handle('request-gc', async (event, emergency = false) => {
    try {
      const result = await performGarbageCollection(emergency);
      return { success: true, result };
    } catch (error) {
      console.error('GC 요청 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 메모리 사용량 요청 처리
  ipcMain.handle('get-memory-usage', async () => {
    try {
      const memoryInfo = await getCurrentMemoryUsage();
      return { success: true, memoryInfo };
    } catch (error) {
      console.error('메모리 사용량 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 메모리 관리자 상태 요청 처리
  ipcMain.handle('get-memory-manager-stats', () => {
    try {
      const stats = getMemoryManagerStats();
      return { success: true, stats };
    } catch (error) {
      console.error('메모리 관리자 상태 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 메모리 최적화 요청 (렌더러 → 메인)
  ipcMain.on('renderer-gc-completed', (event, data) => {
    console.log('렌더러 GC 완료 알림 수신:', data);
  });
  
  console.log('메모리 관련 IPC 핸들러 등록 완료');
}

/**
 * 모든 IPC 핸들러 등록
 */
function registerAllIpcHandlers() {
  registerMemoryIpcHandlers();
  // 다른 IPC 핸들러 등록...
  
  console.log('모든 IPC 핸들러 등록 완료');
}

module.exports = {
  setupIpcHandlers,
  registerAllIpcHandlers,
  registerMemoryIpcHandlers
};
