// ...existing code...

// 창 모드 변경 함수
contextBridge.exposeInMainWorld('electronAPI', {
  // ...existing code...
  
  changeWindowMode: (mode) => {
    return new Promise((resolve) => {
      ipcRenderer.send('change-window-mode', mode);
      ipcRenderer.once('window-mode-change-result', (_, result) => {
        resolve(result);
      });
    });
  },
  
  // ...existing code...
});

// ...existing code...
