/**
 * 설정 관련 IPC 핸들러
 * 
 * 애플리케이션 설정의 저장, 로드 및 변경 사항 처리를 담당합니다.
 */
const { ipcMain } = require('electron');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const { saveSettings, loadSettings, getSettings } = require('../settings');
const { showRestartPrompt } = require('../dialogs');

/**
 * 설정 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('설정 관련 IPC 핸들러 등록 중...');

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
          const { startTracking } = require('../stats');
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

  // 설정 로드 요청 처리
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

  // 다크 모드 설정 가져오기 핸들러 추가
  ipcMain.handle('get-dark-mode', () => {
    debugLog('다크 모드 설정 요청 수신');
    return appState.settings?.darkMode || false;
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
      const { setupTray, destroyTray } = require('../tray');
      
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

  debugLog('설정 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register
}; 