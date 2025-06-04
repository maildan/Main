// preload.js
console.log('Electron preload 스크립트가 로드되었습니다.');

const { contextBridge, ipcRenderer } = require('electron');

// 개발 환경인지 확인
const isDev = process.env.NODE_ENV === 'development';
console.log(`현재 환경: ${isDev ? '개발' : '프로덕션'}`);

// 키보드 이벤트를 위한 전역 변수
let _loopKeydownHandler = null;

// IME Composition 이벤트를 위한 전역 변수
let isComposing = false;
let compositionBuffer = '';

// DOM 로드 후 실행될 코드
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 콘텐츠가 로드되었습니다. 키보드 이벤트 핸들러 설정 중...');
  
  // 키보드 이벤트 핸들러 설정 (즉시 실행)
  setupKeyboardHandlers();
});

// 키보드 및 IME 이벤트 핸들러 설정 함수
function setupKeyboardHandlers() {
  try {
    // 한글 IME 이벤트 핸들러
    document.addEventListener('compositionstart', (event) => {
      isComposing = true;
      compositionBuffer = '';
      console.log('[IME] compositionstart');
      
      // 메인 프로세스에 이벤트 전송
      ipcRenderer.send('ime-composition-event', {
        type: 'compositionstart',
        text: '',
        timestamp: Date.now()
      });
    });
    
    document.addEventListener('compositionupdate', (event) => {
      compositionBuffer = event.data;
      console.log('[IME] compositionupdate:', compositionBuffer);
      
      // 메인 프로세스에 이벤트 전송
      ipcRenderer.send('ime-composition-event', {
        type: 'compositionupdate',
        text: compositionBuffer,
        timestamp: Date.now()
      });
    });
    
    document.addEventListener('compositionend', (event) => {
      isComposing = false;
      const finalText = event.data;
      console.log('[IME] compositionend 최종:', finalText);
      
      // 메인 프로세스에 최종 완성된 텍스트 전송
      ipcRenderer.send('ime-composition-event', {
        type: 'compositionend',
        text: finalText,
        timestamp: Date.now()
      });

      // Google Docs와 같은 특정 응용 프로그램에서도 입력이 감지되도록
      // 조합 종료 후 키보드 이벤트 추가 전송
      if (finalText && finalText.length > 0) {
        setTimeout(() => {
          for (let i = 0; i < finalText.length; i++) {
            // 개별 문자에 대한 가상 키보드 이벤트 전송
            ipcRenderer.send('keyboard-event', {
              key: finalText[i],
              code: 'Key' + finalText[i].toUpperCase(),
              ctrlKey: false,
              altKey: false,
              shiftKey: false,
              metaKey: false,
              timestamp: Date.now(),
              type: 'keyDown',
              isCompositionResult: true,
              isComposing: false
            });
          }
        }, 10);
      }
    });

    // 기존 키보드 이벤트 핸들러 - IME 조합 중일 때는 무시
    _loopKeydownHandler = function(event) {
      try {
        // IME 조합 중일 때는 keydown 이벤트 전송하지 않음
        if (isComposing) {
          return true;
        }

        // 특수 키 처리 - 문자가 아닌 키 이벤트에 대한 추가 정보
        let isTextGeneratingKey = (
          event.key.length === 1 || 
          event.key === 'Enter' || 
          event.key === 'Tab' || 
          event.key === 'Backspace' || 
          event.key === 'Delete' ||
          event.key === ' '
        );

        // 브라우저 및 문서 타입을 식별하기 위한 메타데이터 추가
        let documentInfo = {};
        try {
          // Google Docs 감지
          if (window.location.href.includes('docs.google.com')) {
            documentInfo.isGoogleDocs = true;
            documentInfo.documentType = 'googleDocs';
            
            // 에디터 영역인지 확인
            const isInEditor = 
              document.activeElement && 
              (document.activeElement.className.includes('kix-') ||
              document.activeElement.contentEditable === 'true');
            
            documentInfo.isInEditor = isInEditor;
          } 
          // 일반 contentEditable 영역 감지
          else if (document.activeElement && document.activeElement.contentEditable === 'true') {
            documentInfo.isContentEditable = true;
          }
          // 입력 필드 감지
          else if (document.activeElement && 
            (document.activeElement.tagName === 'INPUT' || 
             document.activeElement.tagName === 'TEXTAREA')) {
            documentInfo.isInputField = true;
          }
        } catch (metaError) {
          console.warn('문서 메타데이터 수집 오류:', metaError);
        }

        // ipcRenderer를 직접 사용하여 키보드 이벤트 전송
        ipcRenderer.send('keyboard-event', {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          timestamp: Date.now(),
          type: 'keyDown',
          isComposing: false,
          isTextGeneratingKey: isTextGeneratingKey,
          documentInfo: documentInfo
        });
        return true;
      } catch (err) {
        console.error('키보드 이벤트 처리 오류:', err);
        return false;
      }
    };
    
    // 이벤트 리스너 등록
    document.removeEventListener('keydown', _loopKeydownHandler);
    document.addEventListener('keydown', _loopKeydownHandler);
    
    // keypress 이벤트 처리
    const _loopKeyPressHandler = function(event) {
      try {
        // IME 조합 중일 때는 무시
        if (isComposing) return true;

        // keypress는 실제 문자가 생성될 때만 발생함
        ipcRenderer.send('keyboard-event', {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          timestamp: Date.now(),
          type: 'keyPress',
          char: event.key,
          isComposing: false
        });
        return true;
      } catch (err) {
        console.error('keypress 이벤트 처리 오류:', err);
        return false;
      }
    };
    
    // input 이벤트 핸들러 (텍스트 변경 감지용)
    const _loopInputHandler = function(event) {
      // contentEditable 및 일반 입력 요소에서의 입력 감지
      if (event.target && 
         (event.target.contentEditable === 'true' || 
          event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA')) {
        
        // IME 조합 중이 아닐 때만 처리
        if (!isComposing) {
          let inputData = event.data || '';
          
          // 입력 데이터가 있을 때만 이벤트 전송
          if (inputData) {
            ipcRenderer.send('keyboard-event', {
              key: inputData,
              timestamp: Date.now(),
              type: 'input',
              data: inputData,
              isComposing: false,
              isInputEvent: true,
              targetType: event.target.tagName.toLowerCase(),
              isContentEditable: event.target.contentEditable === 'true'
            });
          }
        }
      }
    };
    
    document.removeEventListener('keypress', _loopKeyPressHandler);
    document.addEventListener('keypress', _loopKeyPressHandler);
    
    document.removeEventListener('input', _loopInputHandler);
    document.addEventListener('input', _loopInputHandler);
    
    console.log('DOM 키보드 이벤트 핸들러 설정 완료');
  } catch (error) {
    console.error('키보드 이벤트 핸들러 설정 오류:', error);
  }
}

// contextBridge API 설정
try {
  // IPC 통신 채널 설정 - contextBridge를 통해 안전하게 노출
  contextBridge.exposeInMainWorld('electron', {
    // 키보드 이벤트 핸들러
    sendKeyboardEvent: (data) => {
      console.log('키보드 이벤트 전송:', data);
      return ipcRenderer.invoke('keyboard-event', data)
        .catch(err => {
          console.warn('keyboard-event 채널 호출 실패, 대체 채널 시도:', err);
          return ipcRenderer.invoke('sendKeyboardEvent', data);
        });
    },
    
    // 표준 키보드 이벤트 핸들러
    sendKeyEvent: (data) => {
      return ipcRenderer.send('keyboard-event', data);
    },
    
    // 한글 IME 이벤트 핸들러
    sendImeCompositionEvent: (data) => {
      return ipcRenderer.send('ime-composition-event', data);
    },
    
    // 윈도우 컨트롤
    windowControl: (command, params) => {
      return ipcRenderer.send('window-control', command, params);
    },
    
    // 일반 IPC 통신
    send: (channel, data) => {
      if (typeof channel !== 'string' || !channel.startsWith('loop:')) {
        console.error('보안상의 이유로 "loop:" 접두사가 없는 채널은 허용되지 않습니다');
        return;
      }
      ipcRenderer.send(channel, data);
    },
    
    // 응답을 기다리는 IPC 통신
    invoke: (channel, data) => {
      if (typeof channel !== 'string' || !channel.startsWith('loop:')) {
        console.error('보안상의 이유로 "loop:" 접두사가 없는 채널은 허용되지 않습니다');
        return Promise.reject(new Error('유효하지 않은 채널'));
      }
      return ipcRenderer.invoke(channel, data);
    },
    
    // IPC 이벤트 리스너
    on: (channel, callback) => {
      if (typeof channel !== 'string' || !channel.startsWith('loop:')) {
        console.error('보안상의 이유로 "loop:" 접두사가 없는 채널은 허용되지 않습니다');
        return;
      }
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    },
    
    // 테스트용 메서드
    testConnection: () => {
      return Promise.resolve({ success: true, message: 'API 연결 성공!' });
    }
  });

  // 추가 키보드 이벤트 핸들링을 위한 전역 API 설정
  contextBridge.exposeInMainWorld('electronAPI', {
    sendKeyboardEvent: (data) => {
      console.log('electronAPI.sendKeyboardEvent 호출:', data);
      return ipcRenderer.invoke('keyboard-event', data)
        .catch(err => {
          console.warn('electronAPI.sendKeyboardEvent 오류:', err);
          return ipcRenderer.send('keyboard-event', data);
        });
    },
    
    // 한글 IME 이벤트 전송 함수
    sendImeCompositionEvent: (data) => {
      console.log('electronAPI.sendImeCompositionEvent 호출:', data);
      return ipcRenderer.send('ime-composition-event', data);
    },
    
    // 한글 IME 이벤트 처리를 위한 API
    onImeCompositionEnd: (callback) => {
      ipcRenderer.on('ime-composition-end', (_, text) => {
        callback(text);
      });
    },
    
    // 마지막으로 완성된 IME 텍스트 가져오기
    getLastCompletedImeText: () => {
      return ipcRenderer.invoke('get-last-completed-text');
    },
    
    // 현재 브라우저 정보 가져오기
    getCurrentBrowserInfo: () => {
      return ipcRenderer.invoke('get-current-browser-info');
    },
    
    // 실시간 브라우저 정보 구독하기
    onBrowserInfoUpdate: (callback) => {
      ipcRenderer.on('current-browser-info', (_, info) => {
        callback(info);
      });
    },

    // 브라우저 정보 수동으로 요청하기
    requestBrowserInfo: () => {
      ipcRenderer.send('get-current-browser-info');
    },

    // 자모 처리 함수
    processJamo: (char) => {
      return ipcRenderer.invoke('process-jamo', char);
    },
    
    // 한글 합성 완료 처리
    finishHangulComposition: () => {
      return ipcRenderer.invoke('finish-hangul-composition');
    },
    
    // 한글 분해
    decomposeHangul: (syllable) => {
      return ipcRenderer.invoke('decompose-hangul', syllable);
    },
    
    // 권한 관련 API
    checkPermissions: () => ipcRenderer.invoke('check-permissions'),
    openPermissionsSettings: () => ipcRenderer.invoke('open-permissions-settings'),
    
    // 권한 상태 및 오류 이벤트
    onPermissionError: (callback) => {
      ipcRenderer.on('permission-error', (_, data) => callback(data));
      return () => ipcRenderer.removeListener('permission-error', callback);
    },
    
    onPermissionStatus: (callback) => {
      ipcRenderer.on('permission-status', (_, data) => callback(data));
      return () => ipcRenderer.removeListener('permission-status', callback);
    },
    
    // 테스트용 메서드
    isAPIAvailable: () => true
  });

  console.log('contextBridge API가 성공적으로 설정되었습니다.');
} catch (error) {
  console.error('contextBridge API 설정 중 오류 발생:', error);
  console.warn('contextIsolation이 비활성화되어 있을 수 있습니다. 보안을 위해 활성화하는 것이 좋습니다.');
  
  // contextBridge 실패 시 전역 객체로 직접 노출 (안전하지 않음, 마지막 수단)
  if (window) {
    window.electronAPI = {
      sendKeyboardEvent: (data) => ipcRenderer.send('keyboard-event', data),
      sendImeCompositionEvent: (data) => ipcRenderer.send('ime-composition-event', data),
      onImeCompositionEnd: (callback) => {
        ipcRenderer.on('ime-composition-end', (_, text) => callback(text));
      },
      getLastCompletedImeText: () => ipcRenderer.invoke('get-last-completed-text'),
      getCurrentBrowserInfo: () => ipcRenderer.invoke('get-current-browser-info'),
      onBrowserInfoUpdate: (callback) => {
        ipcRenderer.on('current-browser-info', (_, info) => callback(info));
      },
      requestBrowserInfo: () => ipcRenderer.send('get-current-browser-info'),
      processJamo: (char) => ipcRenderer.invoke('process-jamo', char),
      finishHangulComposition: () => ipcRenderer.invoke('finish-hangul-composition'),
      decomposeHangul: (syllable) => ipcRenderer.invoke('decompose-hangul', syllable),
      checkPermissions: () => ipcRenderer.invoke('check-permissions'),
      openPermissionsSettings: () => ipcRenderer.invoke('open-permissions-settings'),
      onPermissionError: (callback) => {
        ipcRenderer.on('permission-error', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('permission-error', callback);
      },
      onPermissionStatus: (callback) => {
        ipcRenderer.on('permission-status', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('permission-status', callback);
      },
      isAPIAvailable: () => true
    };
    console.warn('contextBridge 실패로 인해 전역 객체에 직접 API 노출 (비권장)');
  }
}

console.log('Electron preload 스크립트가 완전히 로드되었습니다.');
