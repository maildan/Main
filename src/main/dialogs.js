const { BrowserWindow, dialog, app, ipcMain } = require('electron');
const { appState } = require('./constants');
const { debugLog } = require('./utils');
const path = require('path');

/**
 * 재시작 안내 창 표시
 * @param {string} message - 표시할 메시지
 * @param {string} title - 창 제목
 * @returns {Promise<number>} - 선택한 버튼 인덱스 (0: 지금 재시작, 1: 나중에)
 */
async function showRestartPrompt(message = '설정 변경을 적용하려면 애플리케이션을 재시작해야 합니다.', title = '재시작 필요') {
  debugLog('재시작 안내 창 표시');
  
  try {
    // 기존 재시작 창이 있으면 닫기
    if (appState.restartWindow && !appState.restartWindow.isDestroyed()) {
      appState.restartWindow.close();
    }
    
    // HTML 기반 재시작 창 사용
    const useHtmlDialog = true;
    
    if (useHtmlDialog) {
      return await showHtmlRestartPrompt();
    } else {
      const { response } = await dialog.showMessageBox(
        appState.mainWindow || BrowserWindow.getFocusedWindow(), 
        {
          type: 'info',
          title: title,
          message: message,
          buttons: ['지금 재시작', '나중에'],
          defaultId: 0,
          cancelId: 1,
        }
      );
      
      if (response === 0) {
        debugLog('사용자가 재시작을 선택했습니다');
      } else {
        debugLog('사용자가 나중에 재시작을 선택했습니다');
      }
      
      return response;
    }
  } catch (error) {
    console.error('재시작 안내 창 표시 중 오류:', error);
    return 1;
  }
}

/**
 * HTML 기반 재시작 안내 창 표시
 * @returns {Promise<number>} - 응답 코드 (0: 재시작, 1: 취소)
 */
function showHtmlRestartPrompt() {
  return new Promise((resolve) => {
    try {
      if (appState.restartWindow && !appState.restartWindow.isDestroyed()) {
        debugLog('기존 재시작 창이 이미 열려 있습니다. 포커스 이동합니다.');
        appState.restartWindow.focus();
        return resolve(1);
      }
      
      // 관련 IPC 이벤트 리스너 모두 제거
      ipcMain.removeAllListeners('restart-app-from-dialog');
      ipcMain.removeAllListeners('close-restart-window-from-dialog');
      
      const restartWindow = new BrowserWindow({
        width: 400,
        height: 250,
        frame: false,
        resizable: false,
        show: false,
        center: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '..', 'preload.js')
        },
        parent: appState.mainWindow,
        modal: true
      });
      
      // 개발 모드에서는 DevTools 열기
      if (process.env.NODE_ENV === 'development') {
        restartWindow.webContents.openDevTools({ mode: 'detach' });
      }
      
      appState.restartWindow = restartWindow;
      
      restartWindow.once('closed', () => {
        if (appState.restartWindow === restartWindow) {
          debugLog('재시작 창이 닫혔습니다');
          resolve(1);
          appState.restartWindow = null;
          ipcMain.removeAllListeners('restart-app-from-dialog');
          ipcMain.removeAllListeners('close-restart-window-from-dialog');
        }
      });
      
      ipcMain.once('restart-app-from-dialog', () => {
        debugLog('재시작 창에서 재시작 요청 수신');
        resolve(0);
        ipcMain.removeAllListeners('restart-app-from-dialog');
        ipcMain.removeAllListeners('close-restart-window-from-dialog');
        if (!restartWindow.isDestroyed()) {
          restartWindow.close();
        }
        appState.restartWindow = null;
      });
      
      ipcMain.once('close-restart-window-from-dialog', () => {
        debugLog('재시작 창에서 닫기 요청 수신');
        resolve(1);
        ipcMain.removeAllListeners('restart-app-from-dialog');
        ipcMain.removeAllListeners('close-restart-window-from-dialog');
        if (!restartWindow.isDestroyed()) {
          restartWindow.close();
        }
        appState.restartWindow = null;
      });
      
      if (process.env.NODE_ENV === 'development') {
        restartWindow.loadURL('http://localhost:3000/restart');
      } else {
        restartWindow.loadFile(path.join(__dirname, '../renderer/restart.html'));
      }
      
      restartWindow.once('ready-to-show', () => {
        restartWindow.show();
      });
      
    } catch (error) {
      console.error('재시작 창 생성 중 오류:', error);
      resolve(1);
    }
  });
}

/**
 * 간단한 메시지 대화 상자 표시
 * @param {string} message - 메시지 내용
 * @param {string} type - 대화 상자 유형 ('info', 'warning', 'error', 'question')
 */
function showMessage(message, type = 'info') {
  try {
    const parentWindow = appState.mainWindow || BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(parentWindow, {
      type,
      title: type === 'error' ? '오류' : '알림',
      message
    });
  } catch (error) {
    console.error('메시지 창 표시 중 오류:', error);
  }
}

module.exports = {
  showRestartPrompt,
  showHtmlRestartPrompt,
  showMessage
};
