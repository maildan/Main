// preload.js
console.log('Electron preload 스크립트가 로드되었습니다.');

const { contextBridge, ipcRenderer } = require('electron');

// 개발 환경인지 확인
const isDev = process.env.NODE_ENV === 'development';
console.log(`현재 환경: ${isDev ? '개발' : '프로덕션'}`);

// 키보드 이벤트를 위한 전역 변수
let _loopKeydownHandler = null;

// DOM 로드 후 실행될 코드
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 콘텐츠가 로드되었습니다. 키보드 이벤트 핸들러 설정 중...');
  
  // 키보드 이벤트 핸들러 설정 (contextBridge가 완료된 후 실행되도록 지연)
  setTimeout(() => {
    _loopKeydownHandler = function(event) {
      try {
        // ipcRenderer를 직접 사용하여 키보드 이벤트 전송 (contextBridge에 의존하지 않음)
        ipcRenderer.send('keyboard-event', {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          timestamp: Date.now(),
          type: 'keyDown'
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
    
    console.log('DOM 키보드 이벤트 핸들러 설정 완료');
  }, 100); // contextBridge 설정이 완료된 후 실행될 수 있도록 약간의 지연 추가
});

// contextBridge API 설정
try {
  // IPC 통신 채널 설정 - contextBridge를 통해 안전하게 노출
  contextBridge.exposeInMainWorld('electron', {
    // 키보드 이벤트 핸들러
    sendKeyboardEvent: (data) => {
      console.log('키보드 이벤트 전송:', data);
      
      // 안전한 방식으로 전송
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

  // 추가 키보드 이벤트 핸들링을 위한 전역 API 설정 (호환성 유지)
  contextBridge.exposeInMainWorld('electronAPI', {
    sendKeyboardEvent: (data) => {
      return ipcRenderer.invoke('sendKeyboardEvent', data)
        .catch(err => {
          console.warn('electronAPI.sendKeyboardEvent 오류:', err);
          return ipcRenderer.invoke('keyboard-event', data);
        });
    },
    
    // 테스트용 메서드
    isAPIAvailable: () => true
  });

  console.log('contextBridge API가 성공적으로 설정되었습니다.');
} catch (error) {
  console.error('contextBridge API 설정 중 오류 발생:', error);
  console.warn('contextIsolation이 비활성화되어 있을 수 있습니다. 보안을 위해 활성화하는 것이 좋습니다.');
}

console.log('Electron preload 스크립트가 완전히 로드되었습니다.');
