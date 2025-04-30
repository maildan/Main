const { contextBridge, ipcRenderer } = require('electron');

// 재시작 창용 API
contextBridge.exposeInMainWorld('restartAPI', {
  /**
   * 앱 재시작
   */
  restartApp: () => {
    console.log('앱 재시작 요청');
    ipcRenderer.send('restart-app');
  },
  
  /**
   * 재시작 나중에 하기
   */
  closeWindow: () => {
    console.log('재시작 창 닫기');
    ipcRenderer.send('close-restart-window');
  },
  
  /**
   * 다크 모드 상태 가져오기
   * @returns {Promise<boolean>} 다크 모드 상태
   */
  getDarkMode: () => {
    return ipcRenderer.invoke('get-dark-mode');
  }
});

console.log('재시작 창 preload 스크립트 로드됨');
