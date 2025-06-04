const { contextBridge, ipcRenderer } = require('electron');

// 개발 환경 감지
const isDev = process.env.NODE_ENV === 'development';
console.warn(`현재 환경: ${isDev ? '개발' : '프로덕션'}`);

// 키보드 이벤트를 위한 전역 변수
let _loopKeydownHandler = null;
let _loopCompositionStartHandler = null;
let _loopCompositionUpdateHandler = null;
let _loopCompositionEndHandler = null;

// IME Composition 이벤트를 위한 전역 변수
let isComposing = false;
let compositionBuffer = '';

// DOM 로드 시 CSP 메타 태그를 처리하는 함수
function handleCSPMetaTags() {
  try {
    if (isDev) {
      // 로그 제어 변수
      let cspRemovalLogCount = 0;
      const MAX_CSP_LOGS = 3;
      let lastLogTime = 0;
      const LOG_THROTTLE_MS = 2000; // 2초에 한 번만 로그 출력
      
      // 모든 CSP 메타 태그 제거 또는 대체
      const removeAllCSPMetaTags = () => {
        try {
          if (!document || !document.head) return;
          
          const allMetaTags = document.querySelectorAll('meta');
          let removed = 0;
          
          allMetaTags.forEach(tag => {
            const httpEquiv = tag.getAttribute('http-equiv');
            if (httpEquiv && 
                (httpEquiv.toLowerCase() === 'content-security-policy' || 
                 httpEquiv.toLowerCase() === 'content-security-policy-report-only')) {
              
              // 개발 환경에서는 태그를 완전히 제거
              tag.remove();
              removed++;
            }
          });
          
          // 로그 출력 제한 (빈번한 로그 방지)
          if (removed > 0) {
            const now = Date.now();
            if (cspRemovalLogCount < MAX_CSP_LOGS && now - lastLogTime > LOG_THROTTLE_MS) {
              console.debug('동적 CSP 메타 태그 감지 및 제거됨', removed);
              lastLogTime = now;
              cspRemovalLogCount++;
              
              if (cspRemovalLogCount === MAX_CSP_LOGS) {
                console.debug('추가 CSP 메타 태그 제거 작업은 로그 없이 계속됩니다.');
              }
            }
            
            // 항상 완전 개방된 CSP 메타 태그 추가
            try {
              insertOpenCSPMetaTag();
            } catch (e) {
              console.error('개방 CSP 메타 태그 추가 실패:', e);
            }
          }
        } catch (e) {
          console.error('CSP 태그 제거 중 오류:', e);
        }
      };

      // 완전 개방된 CSP 메타 태그 추가
      const insertOpenCSPMetaTag = () => {
        try {
          if (!document || !document.head) return;
          
          // 기존 devCSP 태그 제거
          const existingDevCsp = document.querySelector('meta[name="electron-csp-dev"]');
          if (existingDevCsp) {
            existingDevCsp.remove();
          }
          
          // 완전히 개방된 CSP 메타 태그 추가
          const devCspMeta = document.createElement('meta');
          devCspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
          devCspMeta.setAttribute('name', 'electron-csp-dev');
          devCspMeta.setAttribute('content', 
            "default-src * 'unsafe-inline' 'unsafe-eval'; " +
            "script-src * 'unsafe-inline' 'unsafe-eval'; " + 
            "style-src * 'unsafe-inline'; " +
            "img-src * data: blob:; " +
            "font-src * data:; " +
            "connect-src * ws: wss:; " +
            "media-src * blob:; " +
            "object-src *;"
          );
          
          document.head.appendChild(devCspMeta);
          console.debug('개발용 완전 개방 CSP 메타 태그 추가됨');
        } catch (e) {
          console.error('CSP 메타 태그 추가 중 오류:', e);
        }
      };

      // 초기 로드 시 기존 CSP 메타 태그 제거
      setTimeout(() => {
        try {
          removeAllCSPMetaTags();
        } catch (e) {
          console.error('초기 CSP 제거 오류:', e);
        }
        
        // eval 관련 에러 감지
        try {
          window.addEventListener('error', (event) => {
            if (event.error && (
                event.error.name === 'EvalError' || 
                (event.message && event.message.includes('Content Security Policy'))
            )) {
              console.debug('CSP 관련 오류 감지됨:', event.error || event.message);
              // CSP 관련 오류 발생 시 CSP 다시 확인하고 재설정
              removeAllCSPMetaTags();
            }
          });
          
          console.debug('eval 관련 보조 함수 설정 완료');
        } catch (evalHelperError) {
          console.error('eval 보조 함수 설정 실패:', evalHelperError);
        }
        
        // MutationObserver로 동적 CSP 메타 태그 감시 설정
        try {
          if (document && document.head) {
            const observer = new MutationObserver((mutations) => {
              let shouldRemove = false;
              
              mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                  mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'META') {
                      const httpEquiv = node.getAttribute && node.getAttribute('http-equiv');
                      if (httpEquiv && httpEquiv.toLowerCase().includes('content-security-policy')) {
                        shouldRemove = true;
                      }
                    }
                  });
                }
              });
              
              if (shouldRemove) {
                removeAllCSPMetaTags();
              }
            });
            
            // document.head 변경 감시 설정
            observer.observe(document.head, { 
              childList: true, 
              subtree: true 
            });
          }
        } catch (observerError) {
          console.error('MutationObserver 설정 실패:', observerError);
        }
      }, 0);
      
      // CSP 위반 이벤트 리스너 추가
      document.addEventListener('securitypolicyviolation', (e) => {
        console.info('CSP 위반:', e.violatedDirective);
          // 위반 발생 시 CSP 메타 태그 재설정
          removeAllCSPMetaTags();
      });
      
      // DOM 콘텐츠가 로드된 후 키보드 이벤트 핸들러 설정
      window.addEventListener('DOMContentLoaded', (event) => {
        console.debug('DOM 콘텐츠가 로드되었습니다. 키보드 이벤트 핸들러 설정 중...');
        
        // 현재 CSP 상태 재확인 및 개발용 메타 태그 추가
        removeAllCSPMetaTags();
      });
      
      // 키보드 이벤트 핸들러 설정 완료 통지
      document.addEventListener('keydown', function handler() {
        console.warn('DOM 키보드 이벤트 핸들러 설정 완료');
        document.removeEventListener('keydown', handler);
      });
      
      // 스크립트 로딩 시 CSP 메타 태그 즉시 설정 시도
      insertOpenCSPMetaTag();
    }
  } catch (error) {
    console.error('CSP 처리 중 오류 발생:', error);
  }
}

// 키보드 이벤트 핸들러 설정 함수
function setupKeyboardEventHandlers() {
  try {
    console.log('키보드 이벤트 핸들러를 설정합니다...');
    
    // API 상태 확인
    if (!window.electronAPI) {
      console.error('electronAPI 객체가 존재하지 않습니다. 키보드 이벤트 핸들러를 설정할 수 없습니다.');
      
      // 자동 재시도 메커니즘
      if (!window._setupRetryCount) {
        window._setupRetryCount = 0;
      }
      
      window._setupRetryCount++;
      
      // 최대 3번 재시도
      if (window._setupRetryCount <= 3) {
        console.warn(`키보드 핸들러 초기화 재시도 (${window._setupRetryCount}/3)...`);
        setTimeout(() => {
          setupKeyboardEventHandlers();
        }, 500 * window._setupRetryCount); // 점점 길어지는 대기 시간
      } else {
        console.error('최대 재시도 횟수를 초과했습니다. 초기화를 중단합니다.');
        
        // API를 강제로 재생성하여 복구 시도
        if (contextBridge && ipcRenderer) {
          try {
            console.warn('키보드 이벤트 처리를 위한 API 강제 생성 시도');
            contextBridge.exposeInMainWorld('electronAPI', {
              // 필수 API 메서드 선언
              sendKeyboardEvent: (data) => {
                console.log(`[비상 복구] 키보드 이벤트 전송: ${JSON.stringify(data)}`);
                return ipcRenderer.send('keyboard-event', data);
              },
              sendImeCompositionEvent: (data) => {
                console.log(`[비상 복구] IME 이벤트 전송: ${JSON.stringify(data)}`);
                return ipcRenderer.send('ime-composition-event', data);
              },
              isReady: true,
              isEmergencyRecovery: true
            });
            
            // 복구 성공 후 다시 시도
            setTimeout(() => {
              window._setupRetryCount = 0;
              setupKeyboardEventHandlers();
            }, 200);
          } catch (err) {
            console.error('API 강제 생성 실패:', err);
          }
        }
      }
      return;
    }
    
    // 전송 API 메서드 확인
    if (typeof window.electronAPI.sendKeyboardEvent !== 'function') {
      console.error('electronAPI.sendKeyboardEvent 함수가 없습니다.');
      return;
    }
    
    // 이미 이벤트 핸들러가 있다면 제거
    if (_loopKeydownHandler) {
      document.removeEventListener('keydown', _loopKeydownHandler);
      _loopKeydownHandler = null;
    }
    
    if (_loopCompositionStartHandler) {
      document.removeEventListener('compositionstart', _loopCompositionStartHandler);
      _loopCompositionStartHandler = null;
    }
    
    if (_loopCompositionUpdateHandler) {
      document.removeEventListener('compositionupdate', _loopCompositionUpdateHandler);
      _loopCompositionUpdateHandler = null;
    }
    
    if (_loopCompositionEndHandler) {
      document.removeEventListener('compositionend', _loopCompositionEndHandler);
      _loopCompositionEndHandler = null;
    }
    
    // 이벤트 핸들러 정의
    _loopKeydownHandler = (e) => {
      if (isComposing) return; // IME 조합 중에는 키 이벤트 무시
      
      try {
        window.electronAPI.sendKeyboardEvent({
          key: e.key,
          code: e.code,
          type: 'keyDown',
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          timestamp: Date.now()
        });
        
        console.log(`키보드 이벤트 전송: ${e.key} (${e.code})`);
      } catch (err) {
        console.error('키보드 이벤트 처리 중 오류:', err);
      }
    };
    
    _loopCompositionStartHandler = (e) => {
      try {
        isComposing = true;
        compositionBuffer = '';
        
        window.electronAPI.sendImeCompositionEvent({
          type: 'compositionstart',
          timestamp: Date.now()
        });
        
        console.log('IME Composition 시작');
      } catch (err) {
        console.error('IME Composition Start 이벤트 처리 오류:', err);
      }
    };
    
    _loopCompositionUpdateHandler = (e) => {
      try {
        if (!isComposing) return;
        
        compositionBuffer = e.data;
        
        window.electronAPI.sendImeCompositionEvent({
          type: 'compositionupdate',
          text: e.data,
          timestamp: Date.now()
        });
        
        console.log(`IME Composition 업데이트: ${e.data}`);
      } catch (err) {
        console.error('IME Composition Update 이벤트 처리 오류:', err);
      }
    };
    
    _loopCompositionEndHandler = (e) => {
      try {
        isComposing = false;
        
        window.electronAPI.sendImeCompositionEvent({
          type: 'compositionend',
          text: e.data,
          timestamp: Date.now()
        });
        
        console.log(`IME Composition 종료: ${e.data}`);
      } catch (err) {
        console.error('IME Composition End 이벤트 처리 오류:', err);
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('keydown', _loopKeydownHandler);
    document.addEventListener('compositionstart', _loopCompositionStartHandler);
    document.addEventListener('compositionupdate', _loopCompositionUpdateHandler);
    document.addEventListener('compositionend', _loopCompositionEndHandler);
    
    console.log('키보드 이벤트 핸들러가 성공적으로 설정되었습니다.');
    
    // 상태 정보 IPC 전송 (메인 프로세스에 알림)
    try {
      ipcRenderer.send('keyboard-handler-initialized', {
        success: true,
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('키보드 핸들러 초기화 알림 실패:', err);
    }
    
    // 성공 플래그 설정
    window._keyboardHandlersInitialized = true;
    window._setupRetryCount = 0; // 재시도 카운터 초기화
  } catch (error) {
    console.error('키보드 이벤트 핸들러 설정 중 오류 발생:', error);
    
    // 오류 정보 전송
    try {
      ipcRenderer.send('keyboard-handler-error', {
        error: error.message || String(error),
        timestamp: Date.now()
      });
    } catch (ipcErr) {
      console.warn('오류 정보 전송 실패:', ipcErr);
    }
  }
}

// electronAPI가 성공적으로 초기화되었는지 확인하는 함수
function verifyElectronAPI() {
  try {
    const apiAvailable = !!(window.electronAPI && typeof window.electronAPI.sendKeyboardEvent === 'function');
    
    // 메인 프로세스에 초기화 상태 알리기
    if (apiAvailable) {
      // IPC 연결 테스트
      ipcRenderer.send('preload-api-ready', {
        success: true,
        timestamp: Date.now()
      });
      
      // 초기화 성공 표시
      console.log('electronAPI 초기화 확인 완료 - 사용 가능');
      return true;
    } else {
      console.error('electronAPI 초기화 실패 - 사용 불가');
      
      // 실패 정보 전송
      ipcRenderer.send('preload-api-failed', {
        error: 'API 초기화 실패',
        timestamp: Date.now()
      });
      
      return false;
    }
  } catch (err) {
    console.error('electronAPI 확인 중 오류:', err);
    return false;
  }
}

// 문서가 로드되면 CSP 처리 함수 실행
if (typeof document !== 'undefined') {
  try {
    handleCSPMetaTags();
    console.warn('Electron preload 스크립트가 로드되었습니다.');
    
    // 글로벌 전역 변수 등록 (여러 시도에서 사용)
    window._electronAPIInitAttempts = 0;
    window._maxInitAttempts = 5;
    window._apiInitInterval = null;
    
    // API 초기화 상태 확인 및 복구 함수
    window._checkAndRecoverAPI = () => {
      try {
        window._electronAPIInitAttempts++;
        const apiExists = window.electronAPI && typeof window.electronAPI.isReady === 'boolean';
        
        if (apiExists && window.electronAPI.isReady) {
          console.log('electronAPI 객체 확인 완료 - 초기화 성공');
          
          // 성공적으로 초기화되었다면 타이머 정리
          if (window._apiInitInterval) {
            clearInterval(window._apiInitInterval);
            window._apiInitInterval = null;
          }
          
          // 키보드 이벤트 핸들러 설정 시도
          if (typeof setupKeyboardEventHandlers === 'function') {
            setTimeout(() => setupKeyboardEventHandlers(), 50);
          }
          
          return true;
        } else {
          console.warn(`electronAPI 초기화 확인 실패 (시도 ${window._electronAPIInitAttempts}/${window._maxInitAttempts})`);
          
          // 최대 시도 횟수를 초과하면 복구 시도
          if (window._electronAPIInitAttempts >= window._maxInitAttempts) {
            console.error('API 초기화 복구 시도');
            
            // 타이머 정리
            if (window._apiInitInterval) {
              clearInterval(window._apiInitInterval);
              window._apiInitInterval = null;
            }
            
            // API 복구 시도 - 다시 contextBridge를 통해 노출
            try {
              // 폴백 API 강제 재생성
              console.warn('contextBridge를 통한 API 재노출 시도');
              contextBridge.exposeInMainWorld('electronAPI', {
                // 기본 API 설정
                sendKeyboardEvent: (data) => {
                  console.log(`[복구] 키보드 이벤트 전송: ${JSON.stringify(data)}`);
                  return ipcRenderer.send('keyboard-event', data);
                },
                sendImeCompositionEvent: (data) => {
                  console.log(`[복구] IME 이벤트 전송: ${JSON.stringify(data)}`);
                  return ipcRenderer.send('ime-composition-event', data);
                },
                isReady: true,
                isRecovered: true,
                recoveredAt: new Date().toISOString()
              });
              
              // 복구 후 잠시 대기했다가 핸들러 설정
              setTimeout(() => {
                if (typeof setupKeyboardEventHandlers === 'function') {
                  setupKeyboardEventHandlers();
                }
              }, 100);
            } catch (recoveryError) {
              console.error('API 복구 실패:', recoveryError);
            }
          }
          
          return false;
        }
      } catch (err) {
        console.error('API 초기화 확인 중 오류:', err);
        return false;
      }
    };
    
    // 주기적으로 API 초기화 상태 확인 (500ms 간격)
    window._apiInitInterval = setInterval(() => {
      window._checkAndRecoverAPI();
    }, 500);
    
    // 1초 후 API 초기화 상태 확인
    setTimeout(verifyElectronAPI, 1000);
  } catch (e) {
    console.error('preload 스크립트 초기화 오류:', e);
  }
}

// 안전한 IPC 통신을 위한 API 노출
try {
  // contextBridge API 설정 (먼저 실행)
contextBridge.exposeInMainWorld('electronAPI', {
    // 키보드 이벤트 전송 API
    sendKeyboardEvent: (data) => {
      console.log(`키보드 이벤트 전송: ${JSON.stringify(data)}`);
      ipcRenderer.send('keyboard-event', data);
    },
    
    // 한글 IME Composition 이벤트 전송 함수
    sendImeCompositionEvent: (data) => {
      console.log(`키보드 이벤트 전송: ${JSON.stringify(data)}`);
      ipcRenderer.send('ime-composition-event', data);
    },
    
    // IPC invoke 메서드 추가
    invoke: (channel, ...args) => {
      return ipcRenderer.invoke(channel, ...args);
    },
    
    // 권한 확인 함수
    checkPermissions: () => {
      console.log('권한 확인 요청');
      return ipcRenderer.invoke('check-permissions');
    },
    
    // 권한 설정 창 열기
    openPermissionsSettings: () => {
      console.log('권한 설정 창 열기 요청');
      return ipcRenderer.send('open-permissions-settings');
  },
   
    // 권한 오류 이벤트 리스너
    onPermissionError: (callback) => {
      if (!callback || typeof callback !== 'function') {
        console.error('유효한 콜백 함수가 필요합니다');
        return () => {};
      }
 
      const handler = (_event, data) => {
        console.log('권한 오류 알림 수신:', data);
        callback(data);
      };
      
      ipcRenderer.on('permission-error', handler);
      
      return () => {
        ipcRenderer.removeListener('permission-error', handler);
      };
    },
   
    // 권한 상태 이벤트 리스너
    onPermissionStatus: (callback) => {
      if (!callback || typeof callback !== 'function') {
        console.error('유효한 콜백 함수가 필요합니다');
        return () => {};
      }
 
      const handler = (_event, data) => {
        console.log('권한 상태 업데이트 수신:', data);
        callback(data);
      };
      
      ipcRenderer.on('permission-status', handler);
      
      return () => {
        ipcRenderer.removeListener('permission-status', handler);
      };
    },
  
    // 자모음 처리 함수
    processJamo: (data) => {
      console.log(`자모음 처리 요청: ${JSON.stringify(data)}`);
      return ipcRenderer.invoke('process-jamo', data);
  },
  
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
   
    // 마지막으로 완성된 IME 텍스트 가져오기
    getLastCompletedImeText: () => {
      return ipcRenderer.invoke('get-last-completed-text');
    },

    // 한글 자모 확인 헬퍼 함수
    isHangulJamo: (char) => {
      return /^[ㄱ-ㅎㅏ-ㅣ]$/.test(char);
    },

    // 한글 음절 확인 헬퍼 함수
    isHangulSyllable: (char) => {
      return /^[가-힣]$/.test(char);
    },

    // 외부 앱 키보드 후킹 활성화/비활성화
    setExternalKeyboardHook: (enable) => {
      return ipcRenderer.invoke('set-external-keyboard-hook', enable);
    },

    // 키보드 이벤트 연결 테스트
    testKeyboardConnection: async () => {
      try {
        console.log('키보드 이벤트 연결 테스트 중...');
        
        // electronAPI가 제대로 초기화되었는지 확인
        if (!window.electronAPI || !window.electronAPI.isReady) {
          return {
            success: false,
            error: 'electronAPI 객체가 초기화되지 않았습니다.'
          };
        }
        
        // 이벤트 핸들러가 설정되었는지 확인
        const handlersInitialized = !!(window._keyboardHandlersInitialized);
        
        // 메인 프로세스에 테스트 요청
        const serverResponse = await ipcRenderer.invoke('test-keyboard-connection');
        
        // 테스트 응답과 로컬 상태 결합
        return {
          success: true,
          clientState: {
            apiInitialized: !!(window.electronAPI && window.electronAPI.isReady),
            handlersInitialized,
            electronAPI: window.electronAPI ? '사용 가능' : '사용 불가',
            isRecovered: !!(window.electronAPI && window.electronAPI.isRecovered),
            recoveredAt: window.electronAPI && window.electronAPI.recoveredAt,
          },
          serverState: serverResponse || { success: false, error: '서버 응답 없음' },
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('키보드 연결 테스트 중 오류:', error);
        return {
          success: false,
          error: error.message || String(error)
        };
      }
    },

    // 마지막에 isReady 플래그 추가
    isReady: true
  });
  
  console.log('electronAPI 객체가 성공적으로 생성되었습니다.');
  
  // electronAPI가 확실히 생성된 후 직접 키보드 이벤트 핸들러 설정을 트리거
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('문서가 이미 로드됨, 키보드 이벤트 핸들러 직접 설정');
    setTimeout(() => setupKeyboardEventHandlers(), 100);
  } else {
    // DOM이 로드된 후에 키보드 이벤트 핸들러 설정
    window.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded 이벤트 발생, 키보드 이벤트 핸들러 준비 중...');
      
      // 지연 시간을 늘려 electronAPI가 완전히 준비되도록 함 (100ms → 500ms)
      setTimeout(() => {
        if (window.electronAPI && window.electronAPI.isReady) {
          console.log('electronAPI 객체 확인됨, 키보드 이벤트 핸들러 설정 시작');
          setupKeyboardEventHandlers();
        } else {
          console.warn('electronAPI 객체가 아직 준비되지 않음, 추가 지연 후 재시도');
          
          // 첫 번째 시도 실패 시 더 긴 지연으로 재시도
          setTimeout(() => {
            if (window.electronAPI && window.electronAPI.isReady) {
              console.log('electronAPI 객체가 지금 준비됨, 키보드 이벤트 핸들러 설정 시작');
              setupKeyboardEventHandlers();
            } else {
              console.error('electronAPI 객체 로드 실패, 최종 재시도');
              
              // 마지막 시도 - 더 긴 지연
              setTimeout(() => {
                if (window.electronAPI && window.electronAPI.isReady) {
                  console.log('electronAPI 객체 최종 확인 성공, 키보드 이벤트 핸들러 설정');
                  setupKeyboardEventHandlers();
                } else {
                  console.error('electronAPI 객체를 찾을 수 없음, 키보드 이벤트 핸들러 설정 실패');
                }
              }, 1500); // 1.5초 더 지연
            }
          }, 1000); // 1초 더 지연
        }
      }, 500);
    });
  }
  
  console.log('DOMContentLoaded 이벤트 리스너가 등록되었습니다.');
} catch (error) {
  console.error('contextBridge API 설정 중 오류 발생:', error);
  console.warn('contextIsolation이 비활성화되어 있을 수 있습니다. 보안을 위해 활성화하는 것이 좋습니다.');
  
  // contextBridge 실패 시 전역 객체로 직접 노출 (안전하지 않음, 마지막 수단)
  if (window) {
    try {
      console.warn('contextBridge 실패로 인한 전역 window 객체에 직접 폴백 API 노출 시도');
      
      // 기존 객체 있으면 복원
      const existingAPI = window.electronAPI || {};
      
      window.electronAPI = {
        ...existingAPI,
        sendKeyboardEvent: (data) => {
          console.log(`폴백: 키보드 이벤트 전송: ${JSON.stringify(data)}`);
          return ipcRenderer.send('keyboard-event', data);
        },
        sendImeCompositionEvent: (data) => {
          console.log(`폴백: IME 이벤트 전송: ${JSON.stringify(data)}`);
          return ipcRenderer.send('ime-composition-event', data);
        },
        onImeCompositionEnd: (callback) => {
          if (!callback || typeof callback !== 'function') return () => {};
          ipcRenderer.on('ime-composition-end', (_, text) => callback(text));
          return () => ipcRenderer.removeListener('ime-composition-end', callback);
        },
        getLastCompletedImeText: () => ipcRenderer.invoke('get-last-completed-text'),
        isAPIAvailable: () => true,
        isReady: true,
        isFallback: true,
        _fallbackCreatedAt: new Date().toISOString()
      };
      
      console.log('폴백 electronAPI 객체 생성 완료 - 기본 기능만 지원');
      
      // 폴백 방식에서도 DOM 로드 후 핸들러 설정
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('폴백: 문서가 이미 로드됨, 즉시 키보드 이벤트 핸들러 설정');
        setTimeout(setupKeyboardEventHandlers, 100);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          console.log('폴백: DOMContentLoaded 감지, 키보드 이벤트 핸들러 설정');
          setTimeout(setupKeyboardEventHandlers, 500);
        });
      }
    } catch (fallbackError) {
      console.error('폴백 electronAPI 생성 중 치명적 오류:', fallbackError);
    }
  } else {
    console.error('window 객체가 없습니다. 브라우저 환경이 아닌 것 같습니다.');
  }
}

console.log('Electron preload 스크립트가 완전히 로드되었습니다.');