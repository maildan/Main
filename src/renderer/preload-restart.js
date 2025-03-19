const { contextBridge, ipcRenderer } = require('electron');

// 재시작 창 전용 API 노출
contextBridge.exposeInMainWorld('restartAPI', {
  getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
  restartApp: () => ipcRenderer.send('restart-app'),
  closeWindow: () => ipcRenderer.send('close-restart-window')
});

console.log('Restart preload script loaded successfully');