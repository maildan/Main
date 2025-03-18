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
  
  /**
   * 창 모드 설정
   * @param {string} mode - 창 모드 ('windowed', 'fullscreen', 'fullscreen-auto-hide')
   * @returns {Promise<object>} - 설정 결과
   */
  setWindowMode: (mode) => {
    console.log('창 모드 설정 요청:', mode);
    return new Promise((resolve) => {
      // 응답 핸들러 등록
      ipcRenderer.once('window-mode-changed', (_event, result) => {
        console.log('창 모드 변경 결과:', result);
        
        // 이벤트 발생
        if (result.success) {
          // 다른 컴포넌트에 알리기 위해 커스텀 이벤트 발생
          window.dispatchEvent(new CustomEvent('window-mode-changed', { 
            detail: result.mode 
          }));
        }
        
        resolve(result);
      });
      
      // 요청 보내기
      ipcRenderer.send('set-window-mode', mode);
    });
  },
  
  // 창 모드 상태 확인 (Promise 반환으로 업데이트)
  getWindowMode: () => {
    return new Promise((resolve) => {
      ipcRenderer.once('window-mode-status', (_event, result) => {
        console.log('창 모드 상태:', result);
        resolve(result.mode || 'windowed');
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
  },

  /**
   * 트레이에서 특정 탭으로 이동
   * @param {Function} callback - 탭 전환 콜백 함수
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onSwitchTab: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, tabName) => {
      console.log('탭 전환 요청 수신:', tabName);
      callback(tabName);
      
      // 탭 전환 완료 알림
      setTimeout(() => {
        ipcRenderer.send('switch-to-tab-handled', tabName);
      }, 100);
    };

    ipcRenderer.on('switch-to-tab', handler);

    return () => {
      ipcRenderer.removeListener('switch-to-tab', handler);
    };
  },

  /**
   * 통계 저장 다이얼로그 열기 요청
   * @param {Function} callback - 저장 다이얼로그 열기 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onOpenSaveStatsDialog: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = () => {
      console.log('통계 저장 다이얼로그 열기 요청 수신');
      callback();
    };

    ipcRenderer.on('open-save-stats-dialog', handler);

    return () => {
      ipcRenderer.removeListener('open-save-stats-dialog', handler);
    };
  },

  /**
   * 통계 업데이트 요청
   */
  requestStatsUpdate: () => {
    console.log('통계 업데이트 요청');
    ipcRenderer.send('request-stats-update');
  },

  /**
   * 미니뷰 통계 업데이트 이벤트 수신
   * @param {Function} callback - 미니뷰 통계 업데이트 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onMiniViewStatsUpdate: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, data) => {
      callback(data);
    };
    
    ipcRenderer.on('mini-view-stats-update', handler);
    
    return () => {
      ipcRenderer.removeListener('mini-view-stats-update', handler);
    };
  },
  
  /**
   * 미니뷰 토글 (열기/닫기)
   */
  toggleMiniView: () => {
    ipcRenderer.send('toggle-mini-view');
  }
});

// 디버그용 로그
console.log('Electron preload 스크립트가 로드되었습니다.');