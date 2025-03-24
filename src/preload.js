const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  /**
   * 타이핑 통계 업데이트 이벤트 수신
   * @param {Function} callback - 타이핑 통계를 받아서 처리할 콜백 함수
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onTypingStatsUpdate: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    // 이벤트 핸들러 정의
    const handler = (_event, data) => {
      console.log('타이핑 통계 업데이트 수신:', data);
      callback(data);
    };

    // 이벤트 리스너 등록
    ipcRenderer.on('typing-stats-update', handler);

    // 이벤트 리스너 제거 함수 반환 (메모리 누수 방지를 위해 필요)
    return () => {
      ipcRenderer.removeListener('typing-stats-update', handler);
    };
  },

  /**
   * 타이핑 모니터링 시작
   */
  startTracking: () => {
    console.log('모니터링 시작 요청');
    ipcRenderer.send('start-tracking');
  },

  /**
   * 타이핑 모니터링 중지
   */
  stopTracking: () => {
    console.log('모니터링 중지 요청');
    ipcRenderer.send('stop-tracking');
  },

  /**
   * 통계 저장
   * @param {string} content - 저장할 내용 설명
   */
  saveStats: (content) => {
    console.log('통계 저장 요청:', content);
    ipcRenderer.send('save-stats', content);
  },

  /**
   * 현재 브라우저 정보 요청
   * @returns {Promise<any>} - 브라우저 정보 (이름, Google Docs 여부, 제목)
   */
  getCurrentBrowserInfo: () => {
    console.log('현재 브라우저 정보 요청');
    return ipcRenderer.invoke('get-current-browser-info');
  },

  /**
   * 디버그 정보 요청
   * @returns {Promise<any>} - 디버그 정보 (추적 상태, 현재 통계, 플랫폼 등)
   */
  getDebugInfo: () => {
    console.log('디버그 정보 요청');
    return ipcRenderer.invoke('get-debug-info');
  },

  /**
   * 설정 저장
   * @param {any} settings - 설정 객체
   */
  saveSettings: (settings) => {
    console.log('설정 저장 요청:', settings);
    ipcRenderer.send('save-settings', settings);
  },

  /**
   * 설정 로드
   * @returns {Promise<any>} - 설정 객체
   */
  loadSettings: () => {
    console.log('설정 로드 요청');
    return ipcRenderer.invoke('load-settings');
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

    const handler = (_event, data) => {
      console.log('자동 모니터링 시작 알림 수신:', data);
      callback(data);
    };

    ipcRenderer.on('auto-tracking-started', handler);

    return () => {
      ipcRenderer.removeListener('auto-tracking-started', handler);
    };
  },

  /**
   * 윈도우 모드 변경
   * @param {string} mode - 윈도우 모드 ('windowed' 또는 'fullscreen')
   */
  setWindowMode: (mode) => {
    console.log('윈도우 모드 변경 요청:', mode);
    ipcRenderer.send('set-window-mode', mode);
  },

  /**
   * 다크 모드 설정
   * @param {boolean} enabled - 다크 모드 활성화 여부
   */
  setDarkMode: (enabled) => {
    console.log('다크 모드 변경 요청:', enabled);
    ipcRenderer.send('set-dark-mode', enabled);
  },

  /**
   * 윈도우 컨트롤 함수
   * @param {string} command - 창 제어 명령 (minimize, maximize, close)
   */
  windowControl: (command) => {
    // 지원하는 명령 명시적으로 검증
    const validCommands = ['minimize', 'maximize', 'close', 'setTitle'];
    
    if (!validCommands.includes(command)) {
      // showHeader와 hideHeader 명령에 대한 특수 처리
      if (command === 'showHeader' || command === 'hideHeader') {
        console.warn(`'${command}' 명령은 더 이상 사용되지 않습니다. 자동 숨김 처리는 설정에서 구성하세요.`);
        return;
      }
      
      // 그 외 유효하지 않은 명령
      console.error(`유효하지 않은 창 제어 명령: ${command}`);
      return;
    }
    
    console.log('창 제어 요청:', command);
    ipcRenderer.send('window-control', command);
  },

  /**
   * 윈도우 모드 변경
   * @param {string} mode - 윈도우 모드 ('windowed' 또는 'fullscreen')
   * @returns {Promise<any>} - 윈도우 모드 변경 결과
   */
  changeWindowMode: (mode) => {
    return new Promise((resolve) => {
      ipcRenderer.send('change-window-mode', mode);
      ipcRenderer.once('window-mode-change-result', (_, result) => {
        resolve(result);
      });
    });
  },

  /**
   * 트레이 설정 업데이트
   * @param {Object} settings - 트레이 관련 설정
   * @returns {Promise<any>} - 설정 업데이트 결과
   */
  updateTraySettings: (settings) => {
    console.log('트레이 설정 업데이트 요청:', settings);
    return new Promise((resolve) => {
      ipcRenderer.once('tray-settings-updated', (_event, result) => {
        resolve(result);
      });
      ipcRenderer.send('update-tray-settings', settings);
    });
  },

  /**
   * 앱 종료 요청 (트레이에서 종료할 때 사용)
   */
  quitApp: () => {
    ipcRenderer.send('quit-app');
  },

  /**
   * 창 표시/숨김 토글
   */
  toggleWindow: () => {
    ipcRenderer.send('toggle-window');
  },

  /**
   * 백그라운드 모드 변경 이벤트
   * @param {Function} callback - 백그라운드 모드 변경 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onBackgroundModeChange: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, isBackground) => {
      console.log('백그라운드 모드 변경:', isBackground);
      callback(isBackground);
    };

    ipcRenderer.on('background-mode', handler);

    return () => {
      ipcRenderer.removeListener('background-mode', handler);
    };
  },

  /**
   * 트레이에서 명령 이벤트 수신
   */
  onTrayCommand: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const startHandler = () => {
      callback('start');
    };

    const stopHandler = () => {
      callback('stop');
    };

    ipcRenderer.on('start-tracking-from-tray', startHandler);
    ipcRenderer.on('stop-tracking-from-tray', stopHandler);

    return () => {
      ipcRenderer.removeListener('start-tracking-from-tray', startHandler);
      ipcRenderer.removeListener('stop-tracking-from-tray', stopHandler);
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
      
      // 다이얼로그가 열렸음을 알림
      ipcRenderer.send('save-stats-dialog-opened');
    };

    ipcRenderer.on('open-save-stats-dialog', handler);

    return () => {
      ipcRenderer.removeListener('open-save-stats-dialog', handler);
    };
  },

  /**
   * 트레이 통계 업데이트 요청
   */
  requestStatsUpdate: () => {
    console.log('트레이 통계 업데이트 요청');
    ipcRenderer.send('request-stats-update');
  },

  /**
   * 앱 재시작
   */
  restartApp: () => {
    console.log('앱 재시작 요청');
    ipcRenderer.send('restart-app');
  },
  
  /**
   * 재시작 안내 창 표시
   */
  showRestartPrompt: () => {
    console.log('재시작 안내 창 표시 요청');
    ipcRenderer.send('show-restart-prompt');
  },

  /**
   * 재시작 창 닫기 (restart.html용)
   */
  closeWindow: () => {
    console.log('재시작 창 닫기 요청');
    ipcRenderer.send('close-restart-window');
  },

  /**
   * 다크 모드 설정 가져오기 (restart.html용)
   * @returns {Promise<boolean>} 다크 모드 활성화 상태
   */
  getDarkMode: () => {
    console.log('다크 모드 설정 요청');
    return ipcRenderer.invoke('get-dark-mode');
  },

  /**
   * 재시작 로딩 이벤트 수신
   * @param {Function} callback - 재시작 로딩 표시 콜백
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onShowRestartLoading: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, data) => {
      console.log('재시작 로딩 화면 표시 요청 수신:', data);
      callback(data);
    };

    ipcRenderer.on('show-restart-loading', handler);

    return () => {
      ipcRenderer.removeListener('show-restart-loading', handler);
    };
  },

  /**
   * 통계 저장 결과 이벤트 수신
   * @param {Function} callback - 통계 저장 결과를 처리할 콜백 함수
   * @returns {Function} - 이벤트 리스너 제거 함수
   */
  onStatsSaved: (callback) => {
    if (!callback || typeof callback !== 'function') {
      console.error('유효한 콜백 함수가 필요합니다');
      return () => {};
    }

    const handler = (_event, data) => {
      console.log('통계 저장 결과 수신:', data);
      callback(data);
    };

    ipcRenderer.on('stats-saved', handler);

    return () => {
      ipcRenderer.removeListener('stats-saved', handler);
    };
  },

  /**
   * 윈도우 모드 가져오기
   * @returns {Promise<string>} - 현재 윈도우 모드
   */
  getWindowMode: () => {
    console.log('현재 윈도우 모드 요청');
    return ipcRenderer.invoke('get-window-mode');
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
      console.log('미니뷰 통계 업데이트 수신:', data);
      callback(data);
    };

    ipcRenderer.on('mini-view-stats-update', handler);

    return () => {
      ipcRenderer.removeListener('mini-view-stats-update', handler);
    };
  },

  /**
   * 미니뷰 토글
   */
  toggleMiniView: () => {
    console.log('미니뷰 토글 요청');
    ipcRenderer.send('toggle-mini-view');
  }
};

// electronAPI 객체를 window.electronAPI로 노출
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 동일한 API를 window.electron으로도 노출 (하위 호환성을 위해)
contextBridge.exposeInMainWorld('electron', electronAPI);

// 재시작 창을 위한 별도의 API (restart.html에서 사용)
contextBridge.exposeInMainWorld('restartAPI', {
  restartApp: () => {
    console.log('재시작 창에서 앱 재시작 요청');
    ipcRenderer.send('restart-app-from-dialog');
  },
  closeWindow: () => {
    console.log('재시작 창 닫기 요청');
    ipcRenderer.send('close-restart-window-from-dialog'); // 채널 이름 확인 완료
  },
  getDarkMode: () => {
    console.log('다크 모드 설정 요청');
    return ipcRenderer.invoke('get-dark-mode');
  }
});

// 디버그용 로그
console.log('Electron preload 스크립트가 로드되었습니다.');
console.log('노출된 API 함수:', Object.keys(electronAPI).join(', '));