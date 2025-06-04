/**
 * IPC 핸들러 통합 모듈
 * 
 * 이 모듈은 모든 IPC 통신을 처리하는 핸들러를 등록하고 관리합니다.
 * 기능별로 모듈화된 핸들러 파일들을 불러와 사용합니다.
 */
const { ipcMain, app, dialog, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
// 순환 참조 방지를 위해 setupSecuritySettings 직접 참조 제거
// const { setupSecuritySettings } = require('./main');
const { setupKeyboardListener, checkMacOSPermissions } = require('./keyboard');
const { debugLog } = require('./utils');
const { getSettings, saveSettings } = require('./settings');
const { appState } = require('./constants');
const { setupAutoLaunch } = require('./auto-launch');
const { exec } = require('child_process');
const { processKeyInput } = require('./handlers/keyboard-handlers');
const errorHandler = require('./error-handler');

// 모듈화된 핸들러 가져오기
const ipcHandlers = require('./handlers');

// 이미 설정된 핸들러인지 추적
let isIpcHandlersSetup = false;

/**
 * 모든 IPC 핸들러를 설정합니다.
 */
function setupIpcHandlers() {
  // 이미 설정되었으면 중복 설정 방지
  if (isIpcHandlersSetup) {
    console.log('IPC 핸들러가 이미 설정되어 있습니다.');
    return;
  }

  try {
    debugLog('IPC 핸들러 설정 중...');
    
    // 기존에 등록된 핸들러가 있다면 제거
    try {
      // 시스템 정보 관련 핸들러
      ipcMain.removeHandler('get-current-browser-info');
      ipcMain.removeHandler('get-system-info');
      
      // 윈도우 관련 핸들러
      ipcMain.removeHandler('window-control');
      ipcMain.removeHandler('change-window-mode');
      
      // 설정 관련 핸들러
      ipcMain.removeHandler('load-settings');
      ipcMain.removeHandler('save-settings');
      
      console.log('기존 IPC 핸들러가 제거되었습니다.');
    } catch (error) {
      console.log('핸들러 제거 중 오류 (무시 가능):', error.message);
    }

    // 설정 저장
    ipcMain.on('save-settings', (event, settings) => {
      try {
        saveSettings(settings);
        event.reply('settings-saved', { success: true });
      } catch (error) {
        debugLog(`설정 저장 중 오류: ${error.message}`);
        event.reply('settings-saved', { success: false, error: error.message });
      }
    });
    
    // 설정 로드
    ipcMain.handle('load-settings', async () => {
      try {
        return getSettings() || {};
      } catch (error) {
        debugLog(`설정 로드 중 오류: ${error.message}`);
        return { error: error.message };
      }
    });

    // 자동 실행 설정
    ipcMain.on('check-auto-start', (event, shouldAutoStart) => {
      try {
        setupAutoLaunch(shouldAutoStart);
        event.reply('auto-start-checked', { success: true, autoStart: shouldAutoStart });
      } catch (error) {
        debugLog(`자동 실행 설정 중 오류: ${error.message}`);
        event.reply('auto-start-checked', { success: false, error: error.message });
      }
    });

    // 키보드 이벤트 처리
    ipcMain.on('keyboard-event', (event, data) => {
      try {
        if (appState.isTracking && typeof processKeyInput === 'function') {
          processKeyInput(data);
        }
      } catch (error) {
        debugLog(`키보드 이벤트 처리 중 오류: ${error.message}`);
      }
    });
    
    // 권한 확인 핸들러
    ipcMain.handle('check-permissions', async () => {
      try {
        const permissionStatus = {
          screenRecording: null,
          accessibility: null
        };
        
        // macOS에서만 권한 확인
        if (process.platform === 'darwin') {
          try {
            const keyboard = require('./keyboard');
            
            if (typeof keyboard.checkKeyboardPermissions === 'function') {
              const hasPermission = await keyboard.checkKeyboardPermissions();
              permissionStatus.screenRecording = hasPermission;
            }
            
            // 결과 반환
            return permissionStatus;
          } catch (error) {
            debugLog(`권한 확인 중 오류: ${error.message}`);
            return {
              ...permissionStatus,
              error: `권한 확인 오류: ${error.message}`
            };
          }
        } else {
          // macOS가 아닌 경우 항상 권한 있음으로 처리
          return {
            screenRecording: true,
            accessibility: true
          };
        }
      } catch (error) {
        debugLog(`권한 확인 중 예외: ${error.message}`);
        errorHandler.logErrorToFile(error, 'check-permissions');
        return {
          screenRecording: false,
          accessibility: false,
          error: `권한 확인 오류: ${error.message}`
        };
      }
    });
    
    // 권한 설정 창 열기 핸들러
    ipcMain.on('open-permissions-settings', () => {
      try {
        // macOS에서만 권한 설정 열기
        if (process.platform === 'darwin') {
          // macOS 시스템 설정 열기
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        } else if (process.platform === 'win32') {
          // Windows 개인정보 설정 열기 (Windows 10+)
          shell.openExternal('ms-settings:privacy');
        } else {
          // 리눅스 등 다른 OS는 현재 지원하지 않음
          debugLog('현재 OS에서는 권한 설정 열기를 지원하지 않습니다.');
        }
      } catch (error) {
        debugLog(`권한 설정 창 열기 중 오류: ${error.message}`);
        errorHandler.logErrorToFile(error, 'open-permissions-settings');
      }
    });
    
    // IME 조합 이벤트 핸들러
    ipcMain.on('ime-composition-event', (event, data) => {
      try {
        if (appState.isTracking) {
          // IME 조합 이벤트 처리 로직
          debugLog(`IME 조합 이벤트 수신: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        debugLog(`IME 조합 이벤트 처리 중 오류: ${error.message}`);
      }
    });
    
    // 자모 처리 핸들러
    ipcMain.handle('process-jamo', async (event, data) => {
      try {
        // 키보드 모듈에서 자모 처리 함수 호출
        const keyboard = require('./keyboard');
        if (keyboard && typeof keyboard.processJamo === 'function') {
          return await keyboard.processJamo(data);
        }
        return { success: false, error: '자모 처리 함수를 찾을 수 없습니다.' };
      } catch (error) {
        debugLog(`자모 처리 중 오류: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
    
    // 테스트용 ping-pong 핸들러
    ipcMain.on('ping', (event) => {
      event.reply('pong', { timestamp: Date.now() });
    });

    // 모든 핸들러 등록 (handlers/index.js에서 구현)
    ipcHandlers.setupAllHandlers();
    
    // 핸들러 설정 완료
    isIpcHandlersSetup = true;
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
