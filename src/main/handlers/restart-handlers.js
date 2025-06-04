/**
 * 앱 재시작 관련 IPC 핸들러
 * 
 * 애플리케이션 재시작 및 관련 창 제어 기능을 처리합니다.
 */
const { ipcMain, app } = require('electron');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const { showRestartPrompt } = require('../dialogs');
const { saveSettings } = require('../settings');

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
    
    // 설정 저장
    try {
      const saved = saveSettings(appState.settings);
      debugLog('재시작 전 설정 저장 완료: ' + (saved ? '성공' : '실패'));
    } catch (error) {
      console.error('재시작 전 설정 저장 중 오류:', error);
    }
        
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
 * 앱 재시작 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('앱 재시작 관련 IPC 핸들러 등록 중...');

  // 앱 재시작 핸들러
  ipcMain.on('restart-app', () => {
    debugLog('앱 재시작 요청 수신');
    restartApplication();
  });

  // 재시작 창에서 재시작 요청 핸들러
  ipcMain.on('restart-app-from-dialog', () => {
    debugLog('재시작 창에서 재시작 요청 수신');
    restartApplication();
  });

  // 재시작 안내 창 표시 핸들러
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
      
      // 설정 저장
      try {
        const saved = saveSettings(appState.settings);
        debugLog('재시작 전 설정 저장 완료: ' + (saved ? '성공' : '실패'));
      } catch (error) {
        console.error('재시작 전 설정 저장 중 오류:', error);
      }
          
          // 약간의 지연 후 재시작 (로딩 화면을 보여주기 위해)
          setTimeout(() => {
            debugLog('앱 재시작 실행 (대화 상자에서)');
            app.relaunch();
            app.exit(0);
          }, 1000);
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

  // 앱 종료 요청 처리 (트레이 메뉴에서 호출)
  ipcMain.on('quit-app', () => {
    debugLog('앱 종료 요청 받음');
    appState.allowQuit = true;
    app.quit();
  });

  debugLog('앱 재시작 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register,
  restartApplication
}; 