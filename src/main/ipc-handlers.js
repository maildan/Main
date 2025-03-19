const { ipcMain, app } = require('electron');
const activeWin = require('active-win');
const { appState, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { detectBrowserName, isGoogleDocsWindow } = require('./browser');
const { startTracking, stopTracking, saveStats, resetStats } = require('./stats');
const { debugLog } = require('./utils');
const { applyWindowMode } = require('./settings');
const { saveSettings, getSettings, loadSettings } = require('./settings');
const { createMiniViewWindow, toggleMiniView } = require('./window');
const { showRestartPrompt } = require('./dialogs');

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  // 자동 모니터링 시작 처리 - 수정된 부분
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
      
      // 자동 모니터링 설정 변경 시 처리
      const autoMonitoringChanged = 
        appState.settings?.autoStartMonitoring !== newSettings.autoStartMonitoring;
      
      // GPU 가속 또는 처리 모드 설정 변경 확인
      const gpuSettingsChanged = 
        appState.settings?.useHardwareAcceleration !== newSettings.useHardwareAcceleration ||
        appState.settings?.processingMode !== newSettings.processingMode;
      
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
      
      // 설정 결과 응답
      event.reply('settings-saved', { 
        success: true, 
        settings: newSettings,
        restartRequired: gpuSettingsChanged
      });
      
      // GPU 설정 변경 시 재시작 필요 안내
      if (gpuSettingsChanged) {
        debugLog('GPU 관련 설정 변경됨, 재시작 필요');
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

  // 설정 로드 요청 처리 - invoke/handle 패턴으로 변경
  ipcMain.handle('load-settings', async () => {
    try {
      debugLog('IPC: 설정 로드 요청 수신');
      const settings = await loadSettings();
      return settings;
    } catch (error) {
      console.error('설정 로드 오류:', error);
      throw new Error('설정을 로드하지 못했습니다');
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
  ipcMain.on('save-settings', async (event, newSettings) => {
    try {
      // 이전 설정 값 저장
      const prevSettings = { ...appState.settings };
      
      // 새 설정 저장
      await saveSettings(newSettings);
      
      // 설정 변경 시 필요한 업데이트 적용
      if (newSettings.darkMode !== prevSettings.darkMode) {
        appState.mainWindow.webContents.send('dark-mode-changed', { 
          success: true, 
          darkMode: newSettings.darkMode 
        });
      }
      
      // 창 모드 설정 변경 시 적용
      if (newSettings.windowMode !== prevSettings.windowMode) {
        const { setWindowMode } = require('./window');
        setWindowMode(newSettings.windowMode);
      }
      
      // 설정 저장 결과 전송
      event.reply('settings-saved', { success: true, settings: newSettings });
      
      // GPU 가속화 설정 변경 감지 (로깅만 추가)
      if (newSettings.useHardwareAcceleration !== prevSettings.useHardwareAcceleration) {
        debugLog('GPU 가속화 설정이 변경되었습니다. 재시작 시 적용됩니다.');
      }
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
      event.reply('settings-saved', { success: false, error: error.message });
    }
  });
  
  // 앱 재시작 핸들러 추가
  ipcMain.on('restart-app', () => {
    debugLog('앱 재시작 요청 수신');
    appState.allowQuit = true;
    
    // 앱 재시작
    app.relaunch();
    app.exit(0);
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

  // 윈도우 제어 처리 (minimize, maximize, close, showHeader, hideHeader, setTitle)
  ipcMain.on('window-control', (event, command, param) => {
    debugLog('창 제어 요청 받음:', command, param);
    
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
        case 'showHeader':
          // 프레임 있는(네이티브) 헤더 모드에서는 무시
          break;
        case 'hideHeader':
          // 프레임 있는(네이티브) 헤더 모드에서는 무시
          break;
        case 'setTitle':
          if (param) {
            appState.mainWindow.setTitle(param);
          }
          break;
        default:
          console.warn('알 수 없는 창 제어 명령:', command);
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
  ipcMain.on('update-tray-settings', (event, settings) => {
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
      
      // 설정 저장 시도
      const { setupTray, destroyTray } = require('./tray');
      
      // 트레이 옵션이 꺼졌는데 트레이가 활성화된 경우 제거
      if (!appState.settings.minimizeToTray && appState.tray) {
        destroyTray();
      } else if (appState.settings.minimizeToTray && !appState.tray) {
        // 트레이 옵션이 켜졌는데 트레이가 없는 경우 생성
        setupTray();
      }
      
      // 설정 업데이트 후 저장
      const saveResult = saveSettings();
      
      event.reply('tray-settings-updated', { 
        success: true, 
        settings: appState.settings
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

  debugLog('IPC 핸들러 설정 완료');
}

module.exports = {
  setupIpcHandlers
};
