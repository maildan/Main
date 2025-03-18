const { contextBridge, ipcRenderer } = require('electron');

// 안전한 IPC 통신을 위한 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  onTypingStatsUpdate: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, data) => {
      console.log('타이핑 통계 업데이트 수신:', data);
      callback(data);
    };
    
    ipcRenderer.on('typing-stats-update', handler);
    
    return () => {
      ipcRenderer.removeListener('typing-stats-update', handler);
    };
  },
  
  startTracking: () => {
    console.log('모니터링 시작 요청');
    ipcRenderer.send('start-tracking');
  },
  
  stopTracking: () => {
    console.log('모니터링 중지 요청');
    ipcRenderer.send('stop-tracking');
  },
  
  saveStats: (content) => {
    console.log('통계 저장 요청:', content);
    ipcRenderer.send('save-stats', content);
  },
  
  // 현재 브라우저 정보 가져오기
  getCurrentBrowserInfo: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('current-browser-info', (_event, data) => {
        console.log('브라우저 정보 수신:', data);
        resolve(data);
      });
      ipcRenderer.send('get-current-browser-info');
    });
  },

  // 디버그 정보 가져오기
  getDebugInfo: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('debug-info', (_event, data) => {
        console.log('디버그 정보 수신:', data);
        resolve(data);
      });
      ipcRenderer.send('get-debug-info');
    });
  },

  // 나머지 API 메서드들...
  onStatsSaved: (callback) => {
    if (!callback || typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('stats-saved', handler);
    return () => ipcRenderer.removeListener('stats-saved', handler);
  },

  // 설정 관련 API
  saveSettings: (settings) => {
    console.log('설정 저장 요청:', settings);
    return new Promise((resolve) => {
      ipcRenderer.once('settings-saved', (_event, result) => {
        resolve(result);
      });
      ipcRenderer.send('save-settings', settings);
    });
  },
  
  loadSettings: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('settings-loaded', (_event, data) => {
        console.log('설정 로드 수신:', data);
        resolve(data);
      });
      
      ipcRenderer.send('load-settings');
    });
  },
  
  setDarkMode: (enabled) => {
    console.log('다크 모드 설정 요청:', enabled);
    return new Promise((resolve) => {
      ipcRenderer.once('dark-mode-changed', (_event, result) => {
        resolve(result);
      });
      ipcRenderer.send('set-dark-mode', enabled);
    });
  },
  
  setWindowMode: (mode) => {
    console.log('창 모드 설정 요청:', mode);
    return new Promise((resolve) => {
      ipcRenderer.once('window-mode-changed', (_event, result) => {
        resolve(result);
      });
      ipcRenderer.send('set-window-mode', mode);
    });
  },
  
  getWindowMode: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('window-mode-status', (_event, mode) => {
        resolve(mode);
      });
      ipcRenderer.send('get-window-mode');
    });
  },
  
  windowControl: (command) => {
    if (!['minimize', 'maximize', 'close'].includes(command)) {
      console.error('유효하지 않은 창 제어 명령:', command);
      return;
    }
    console.log('창 제어 요청:', command);
    ipcRenderer.send('window-control', command);
  },

  /**
   * 자동 시작 설정 확인
   * @param {boolean} shouldAutoStart - 자동 시작 여부
   */
  checkAutoStart: (shouldAutoStart) => {
    console.log('자동 시작 설정 확인:', shouldAutoStart);
    ipcRenderer.send('check-auto-start', shouldAutoStart);
  },

  /**
   * 자동 모니터링 시작 이벤트 수신
   * @param {Function} callback - 자동 모니터링 시작 알림 콜백 함수
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onAutoTrackingStarted: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    // 이벤트 핸들러 정의
    const handler = (_event, data) => {
      console.log('자동 모니터링 시작됨:', data);
      callback(data);
    };
    
    // 이벤트 리스너 등록
    ipcRenderer.on('auto-tracking-started', handler);
    
    // 이벤트 리스너 제거 함수 반환
    return () => {
      ipcRenderer.removeListener('auto-tracking-started', handler);
    };
  }
});

// 디버그용 로그
console.log('Electron preload 스크립트가 로드되었습니다.');