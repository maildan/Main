const { contextBridge, ipcRenderer } = require('electron');

// 개발 환경 감지
const isDev = process.env.NODE_ENV === 'development';
console.warn(`현재 환경: ${isDev ? '개발' : '프로덕션'}`);

// DOM 로드 시 CSP 메타 태그를 처리하는 함수
function handleCSPMetaTags() {
  try {
    if (isDev) {
      // 로그 제어 변수 (최대 3번만 출력)
      let cspRemovalLogCount = 0;
      const MAX_CSP_LOGS = 3;
      let lastLogTime = 0;
      const LOG_THROTTLE_MS = 2000; // 2초에 한 번만 로그 출력
      
      // 개발 환경에서는 CSP 메타 태그를 완전히 제거
      const removeAllCSPMetaTags = () => {
        const allMetaTags = document.querySelectorAll('meta');
        let removed = 0;
        
        allMetaTags.forEach(tag => {
          const httpEquiv = tag.getAttribute('http-equiv');
          if (httpEquiv && 
              (httpEquiv.toLowerCase() === 'content-security-policy' || 
               httpEquiv.toLowerCase() === 'content-security-policy-report-only')) {
            tag.remove();
            removed++;
          }
        });
        
        // 제거된 태그가 있고 로그 출력 횟수가 제한 이내인 경우에만 로그 출력
        if (removed > 0 && cspRemovalLogCount < MAX_CSP_LOGS) {
          const now = Date.now();
          if (now - lastLogTime > LOG_THROTTLE_MS || cspRemovalLogCount === 0) {
            console.warn('동적 CSP 메타 태그 감지 및 제거됨');
            lastLogTime = now;
            cspRemovalLogCount++;
            
            // 마지막 로그 출력일 때 제한 알림
            if (cspRemovalLogCount === MAX_CSP_LOGS) {
              console.warn('추가 CSP 메타 태그 제거 작업은 로그 없이 계속됩니다.');
            }
          }
        }
        
        // 개발용 CSP 메타 태그 추가 (모든 제한 해제)
        const newCSPMeta = document.createElement('meta');
        newCSPMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        newCSPMeta.setAttribute('content', 
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "connect-src * 'unsafe-inline' data: blob:; " +
          "img-src * data: blob:; " +
          "style-src * 'unsafe-inline'; " +
          "font-src * data:; " +
          "frame-src * data: blob:; " +
          "worker-src * data: blob:;"
        );
        document.head.appendChild(newCSPMeta);
        
        if (cspRemovalLogCount < MAX_CSP_LOGS) {
          console.warn('개발용 완전 개방 CSP 메타 태그 추가됨');
        }
      };
      
      // 즉시 실행 및 DOM 로드 후 실행
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeAllCSPMetaTags);
      } else {
        removeAllCSPMetaTags();
      }
      
      // CSP meta 태그 동적 감시 - Next.js가 런타임에 추가할 수 있음
      const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        let tagsRemoved = 0;
        
        mutations.forEach((mutation) => {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
              // meta 태그 추가 확인
              if (node.tagName === 'META') {
                const httpEquiv = node.getAttribute('http-equiv');
                if (httpEquiv && 
                    (httpEquiv.toLowerCase() === 'content-security-policy' || 
                     httpEquiv.toLowerCase() === 'content-security-policy-report-only')) {
                  node.remove();
                  tagsRemoved++;
                  needsUpdate = true;
                }
              }
              
              // head나 body에 뭔가 추가되었을 때도 CSP 메타 태그 확인
              if (node.querySelectorAll) {
                const cspTags = node.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="Content-Security-Policy-Report-Only"]');
                if (cspTags.length > 0) {
                  cspTags.forEach(tag => tag.remove());
                  tagsRemoved += cspTags.length;
                  needsUpdate = true;
                }
              }
            });
          }
        });
        
        // 로그 출력을 시간 기반으로 조절
        const now = Date.now();
        if (needsUpdate && (cspRemovalLogCount < MAX_CSP_LOGS || now - lastLogTime > LOG_THROTTLE_MS)) {
          if (cspRemovalLogCount < MAX_CSP_LOGS) {
            console.warn('동적 CSP 메타 태그 감지 및 제거됨');
            lastLogTime = now;
            cspRemovalLogCount++;
            
            // 마지막 로그 출력일 때 제한 알림
            if (cspRemovalLogCount === MAX_CSP_LOGS) {
              console.warn('추가 CSP 메타 태그 제거 작업은 로그 없이 계속됩니다.');
            }
          }
          
          // 개발용 CSP 메타 태그 다시 추가
          const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (!existingCSP) {
            const newCSPMeta = document.createElement('meta');
            newCSPMeta.setAttribute('http-equiv', 'Content-Security-Policy');
            newCSPMeta.setAttribute('content', 
              "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
              "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
              "connect-src * 'unsafe-inline' data: blob:; " +
              "img-src * data: blob:; " +
              "style-src * 'unsafe-inline'; " +
              "font-src * data:; " +
              "frame-src * data: blob:; " +
              "worker-src * data: blob:;"
            );
            document.head.appendChild(newCSPMeta);
          }
        }
      });
      
      // 전체 문서 변화 감시 시작 (head 뿐만 아니라)
      observer.observe(document, { 
        childList: true, 
        subtree: true 
      });
      
      // unsafe-eval 지원을 위한 특수 처리 (eval 직접 호출 없이 안전한 방식으로 구현)
      try {
        // webpack HMR을 위한 지원 코드 (안전한 방식으로 구현)
        window.__webpack_require__ = window.__webpack_require__ || function() {};
        window.__webpack_hash__ = window.__webpack_hash__ || '';
        
        console.warn('eval 관련 보조 함수 설정 완료');
      } catch (evalError) {
        console.error('eval 관련 설정 오류:', evalError);
      }
    }
  } catch (error) {
    console.error('CSP 메타 태그 처리 중 오류:', error);
  }
}

// DOM 로드 시 CSP 메타 태그 처리 실행
document.addEventListener('DOMContentLoaded', () => {
  console.warn('DOM 콘텐츠가 로드되었습니다. 키보드 이벤트 핸들러 설정 중...');
  handleCSPMetaTags();
  
  // ... 기존 코드 유지 ...
});

// 페이지 로드 시에도 CSP 메타 태그 처리 실행 (추가)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  handleCSPMetaTags();
}

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

  // 키보드 이벤트 전송 API
  sendKeyboardEvent: (eventData) => {
    console.log('키보드 이벤트 전송:', eventData);
    return ipcRenderer.invoke('sendKeyboardEvent', eventData);
  },
  
  // 한글 자모음 조합 상태 확인
  getHangulStatus: () => {
    return ipcRenderer.invoke('get-hangul-status');
  },
  
  // 키보드 이벤트 직접 테스트 (디버깅용)
  testKeyboardInput: (key) => {
    console.log('키보드 입력 테스트:', key);
    return ipcRenderer.invoke('test-keyboard-input', key);
  },
  
  // 한글 입력 테스트
  testHangulInput: async (text) => {
    console.log('한글 입력 테스트:', text);
    
    // 테스트 설정
    const testOptions = {
      text: text || '안녕하세요', // 테스트할 텍스트
      durationSec: 5,            // 테스트 기간 (초)
      measureWpm: true,          // WPM 측정 여부
      measureAccuracy: true      // 정확도 측정 여부
    };
    
    try {
      // 한글 입력 테스트 요청
      const result = await ipcRenderer.invoke('test-hangul-input', testOptions);
      
      if (result.success) {
        console.log('한글 입력 테스트 성공:', result);
        return {
          success: true,
          keystrokes: result.keystrokes,
          duration: result.duration,
          wpm: result.wpm,
          accuracy: result.accuracy
        };
      } else {
        console.error('한글 입력 테스트 실패:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('한글 입력 테스트 오류:', error);
      return {
        success: false,
        error: error.message || '알 수 없는 오류'
      };
    }
  },

  // 한글 자모 분해 헬퍼 함수
  decomposeHangul: (char) => {
    // 한글 유니코드 범위 체크
    if (!/^[가-힣]$/.test(char)) {
      return [char]; // 한글이 아니면 그대로 반환
    }
    
    // 한글 유니코드 값 계산
    const code = char.charCodeAt(0) - 0xAC00;
    
    // 초성, 중성, 종성 추출
    const jong = code % 28;
    const jung = ((code - jong) / 28) % 21;
    const cho = Math.floor((code / 28) / 21);
    
    // 자모음 배열
    const choList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const jungList = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
    const jongList = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    
    // 디버그용 출력
    console.log(`한글 분해: ${char} → 초성: ${choList[cho]}, 중성: ${jungList[jung]}, 종성: ${jongList[jong]}`);
    
    // 중간 조합 과정용 배열 반환
    const result = [];
    
    // 초성만 있는 상태
    result.push(choList[cho]);
    
    // 초성+중성 있는 상태
    const choJung = String.fromCharCode(0xAC00 + cho * 21 * 28 + jung * 28);
    result.push(choJung);
    
    // 종성이 있으면 추가
    if (jong > 0) {
      const complete = char;
      result.push(complete);
    }
    
    return result;
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
    const validCommands = ['minimize', 'maximize', 'close', 'showHeader', 'hideHeader'];
    if (!validCommands.includes(command)) {
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

// 최대한 빨리 실행하기 위해 즉시 호출
if (isDev) {
  handleCSPMetaTags();
}