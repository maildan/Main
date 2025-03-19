const { BrowserWindow, dialog } = require('electron');
const { appState } = require('./constants');
const { debugLog } = require('./utils');

/**
 * 재시작 안내 창 표시
 * @param {string} message - 표시할 메시지
 * @param {string} title - 창 제목
 * @returns {Promise<number>} - 선택한 버튼 인덱스 (0: 지금 재시작, 1: 나중에)
 */
async function showRestartPrompt(message = '설정 변경을 적용하려면 애플리케이션을 재시작해야 합니다.', title = '재시작 필요') {
  debugLog('재시작 안내 창 표시');
  
  try {
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
      // 재시작 로직은 ipc-handlers.js에서 처리
    } else {
      debugLog('사용자가 나중에 재시작을 선택했습니다');
    }
    
    return response;
  } catch (error) {
    console.error('재시작 안내 창 표시 중 오류:', error);
    return 1; // 오류 시 기본적으로 재시작하지 않음
  }
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
  showMessage
};
