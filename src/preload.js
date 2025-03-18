import { contextBridge, ipcRenderer } from 'electron';

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
  }
};

// electronAPI 객체를 window.electronAPI로 노출
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 동일한 API를 window.electron으로도 노출 (하위 호환성을 위해)
contextBridge.exposeInMainWorld('electron', electronAPI);