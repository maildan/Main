/**
 * Electron 앱 보안 체크 모듈
 *
 * 앱의 보안을 강화하기 위한 다양한 검사 및 설정을 제공합니다.
 */

// Electron 객체 참조
let _electron = null;
let _session = null;
let _initialized = false;

// 필요한 모듈 로드
const { session: _sessionModule, app: _app, webContents, ipcMain, BrowserWindow } = require('electron');
const path = require('path');

// 내부에서 사용할 app/session 객체 가져오기
function getElectronApp() {
  return (_electron && _electron.app) || _app || null;
}

function getElectronSession() {
  return (_electron && _electron.session) || _sessionModule || null;
}

/**
 * 웹 컨텐츠에 CSP 설정 적용
 * @param {Electron.WebContents} webContents - 웹 컨텐츠 객체
 * @param {boolean} isDev - 개발 환경 여부
 */
function configureCspForWebContents(webContents, isDev = false) {
  // 개발 환경에서는 CSP 제한을 완화
  if (isDev) {
    console.log('개발 환경 감지: CSP 비활성화');
    
    // 모든 CSP 헤더를 제거하는 헤더 핸들러 설정
    webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      // CSP 관련 모든 헤더 제거 (대소문자 구분 없이)
      if (responseHeaders) {
        Object.keys(responseHeaders).forEach(key => {
          if (key.toLowerCase().includes('content-security-policy')) {
            delete responseHeaders[key];
          }
        });
      }
      
      callback({
        responseHeaders,
        cancel: false
      });
    });
    
    return true;
  }
  
  // 프로덕션 환경에서는 강력한 CSP 적용
  console.log('프로덕션 환경: 강력한 CSP 적용');
  
  try {
    // CSP 헤더 설정
    webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      
      // 기존 CSP 헤더 제거
      Object.keys(responseHeaders).forEach(key => {
        if (key.toLowerCase() === 'content-security-policy') {
          delete responseHeaders[key];
        }
        if (key.toLowerCase() === 'content-security-policy-report-only') {
          delete responseHeaders[key];
        }
      });
      
      // 엄격한 프로덕션 CSP 헤더 추가
      responseHeaders['content-security-policy'] = [
        'default-src \'self\'; ' +
        'script-src \'self\'; ' +
        'style-src \'self\' \'unsafe-inline\'; ' +
        'img-src \'self\' data:; ' +
        'connect-src \'self\'; ' +
        'font-src \'self\'; ' +
        'object-src \'none\'; ' +
        'media-src \'self\'; ' +
        'child-src \'self\';'
      ];
      
      callback({ responseHeaders });
    });
    
    return true;
  } catch (error) {
    console.error('프로덕션 CSP 설정 중 오류:', error);
    return false;
  }
}

// 새로운 함수: 모든 세션에 CSP 헤더 제거 적용
function removeAllCspHeaders(session) {
  if (!session) return false;
  
  try {
    // 모든 요청에 대해 CSP 헤더 제거
    session.webRequest.onHeadersReceived({urls: ['*://*/*']}, (details, callback) => {
      const responseHeaders = {...details.responseHeaders};
      
      // 모든 CSP 관련 헤더 제거
      for (const key in responseHeaders) {
        if (key.toLowerCase().includes('content-security-policy')) {
          delete responseHeaders[key];
        }
      }
      
      callback({
        responseHeaders,
        cancel: false
      });
    });
    
    return true;
  } catch (error) {
    console.error('CSP 헤더 제거 중 오류:', error);
    return false;
  }
}

/**
 * 모든 세션에 CSP를 적용하는 함수
 * @param {boolean} isDev - 개발 환경 여부
 */
function applyCSPToAllSessions(isDev = false) {
  try {
    const session = getElectronSession();
    if (!session) {
      console.error('세션 객체를 가져올 수 없습니다.');
      return false;
    }
    
    // 개발 환경에서는 CSP 헤더를 완전히 제거
    if (isDev) {
      console.log('개발 환경: 모든 세션의 CSP 헤더 제거');
      
      // 기본 세션의 CSP 헤더 제거
      removeAllCspHeaders(session.defaultSession);
      
      // 모든 파티션 세션의 CSP 헤더 제거
      session.getAllSessions().forEach(s => {
        removeAllCspHeaders(s);
      });
      
      return true;
    }
    
    // 프로덕션 환경에서는 모든 세션에 CSP 적용
    console.log('프로덕션 환경: 모든 세션에 CSP 적용');
    
    // 기본 세션에 CSP 설정 적용
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = {...details.responseHeaders};
      
      // 기존 CSP 헤더 제거
      Object.keys(responseHeaders).forEach(key => {
        if (key.toLowerCase().includes('content-security-policy')) {
          delete responseHeaders[key];
        }
      });
      
      // 프로덕션 CSP 헤더 추가
      responseHeaders['content-security-policy'] = [
        'default-src \'self\'; ' +
        'script-src \'self\'; ' +
        'style-src \'self\' \'unsafe-inline\'; ' +
        'img-src \'self\' data:; ' +
        'connect-src \'self\'; ' +
        'font-src \'self\'; ' +
        'object-src \'none\'; ' +
        'media-src \'self\'; ' +
        'child-src \'self\';'
      ];
      
      callback({responseHeaders});
    });
    
    return true;
  } catch (error) {
    console.error('CSP 적용 중 오류:', error);
    return false;
  }
}

/**
 * 키보드 이벤트 핸들러를 설정합니다
 */
function setupKeyboardEventHandler() {
  try {
    // 기존 핸들러 제거 (중복 방지)
    try {
      ipcMain.removeHandler('sendKeyboardEvent');
      ipcMain.removeHandler('keyboard-event');
      ipcMain.removeAllListeners('sendKeyboardEvent');
      ipcMain.removeAllListeners('keyboard-event');
    } catch (err) {
      // 핸들러가 없는 경우 무시
    }
    
    // 새 핸들러 등록 - sendKeyboardEvent
    ipcMain.handle('sendKeyboardEvent', async (event, data) => {
      try {
        console.log('키보드 이벤트 수신:', data);
        
        // 메인 윈도우로 이벤트 전달 (필요시)
        const mainWindow = BrowserWindow.getFocusedWindow();
        
        if (mainWindow && mainWindow.webContents) {
          // 이벤트를 처리하는 코드 (예: 키 입력을 처리하는 스크립트로 전달)
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
        
        return { success: true, processed: true };
      } catch (error) {
        console.error('키보드 이벤트 처리 오류:', error);
        return { success: false, error: error.message };
      }
    });
    
    // 새 핸들러 등록 - keyboard-event (대체 핸들러)
    ipcMain.handle('keyboard-event', async (event, data) => {
      try {
        console.log('keyboard-event 수신:', data);
        
        // 메인 윈도우로 이벤트 전달 (필요시)
        const mainWindow = BrowserWindow.getFocusedWindow();
        
        if (mainWindow && mainWindow.webContents) {
          // 이벤트를 처리하는 코드 (예: 키 입력을 처리하는 스크립트로 전달)
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
        
        return { success: true, processed: true };
      } catch (error) {
        console.error('keyboard-event 처리 오류:', error);
        return { success: false, error: error.message };
      }
    });
    
    // 비동기 핸들러 등록 (이벤트 리스너 방식)
    ipcMain.on('sendKeyboardEvent', (event, data) => {
      try {
        console.log('비동기 키보드 이벤트 수신:', data);
        
        // 메인 윈도우로 이벤트 전달
        const mainWindow = BrowserWindow.getFocusedWindow();
        
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
        
        // 응답 메시지 전송 (옵션)
        event.reply('sendKeyboardEvent-reply', { success: true });
      } catch (error) {
        console.error('비동기 키보드 이벤트 처리 오류:', error);
      }
    });

    // 비동기 핸들러 등록 (대체 핸들러)
    ipcMain.on('keyboard-event', (event, data) => {
      try {
        console.log('비동기 keyboard-event 수신:', data);
        
        // 메인 윈도우로 이벤트 전달
        const mainWindow = BrowserWindow.getFocusedWindow();
        
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
        
        // 응답 메시지 전송 (옵션)
        event.reply('keyboard-event-reply', { success: true });
      } catch (error) {
        console.error('비동기 keyboard-event 처리 오류:', error);
      }
    });
    
    console.log('키보드 이벤트 IPC 핸들러가 등록되었습니다.');
    return true;
  } catch (error) {
    console.error('키보드 이벤트 핸들러 설정 오류:', error);
    return false;
  }
}

/**
 * 브라우저 윈도우에 보안 설정을 적용합니다
 * @param {Electron.BrowserWindow} window - 보안 설정을 적용할 윈도우
 * @param {boolean} isDev - 개발 환경 여부
 */
function applySecuritySettings(window, isDev) {
  try {
    if (!window || !window.webContents) {
      console.error('유효하지 않은 윈도우 객체입니다.');
      return false;
    }

    const session = window.webContents.session;

    // 개발 환경 또는 보안 비활성화 환경 변수 확인
    const disableSecurity = process.env.DISABLE_SECURITY === 'true';

    if (disableSecurity) {
      console.log('개발 환경 또는 보안 비활성화 환경: 윈도우 보안 설정 적용 건너뜀');
      return true;
    }

    // 개발 환경에서는 필수적인 보안 설정만 적용
    if (isDev) {
      // 개발 중 필요한 설정
      session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            // 개발 환경에서 CSP 설정 - next.config.js와 일관되게 유지
            'Content-Security-Policy': ['default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' \'nonce-NEXT_DYNAMIC\' \'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=\' \'sha256-jJQwJJ7C8HTvUdHz5N89pigcJJueTAUAHzz1jZElhyc=\' \'sha256-v+dVc7B0Da7+65XkuIIH/hp/tC5if0AEMw5T3xVMUxA=\' \'sha256-BaxrUNhGnGToeUSxHZEUV0+kjIblNBHDrKaIme66Mlw=\' \'sha256-RerrjuJKla11LHUX4K4vzlUROGshBZzZv1wH6Ow3eL8=\' \'sha256-6rzK4Ay70vxbwNcVb0pqDyD24P4a5GJ+c7pbRqHNnIo=\' \'sha256-LcsuUMiDkprrt6ZKeiLP4iYNhWo8NqaSbAgtoZxVK3s=\' \'sha256-TWKJpBGCg6787YVT32Nt9d/fVvIV5WlSXgLIeubmK6s=\' \'sha256-p7GE78bbMHDrE4IWzpiMSttAsTpUu7wwi5/wvnH54Os=\' \'sha256-oq9XtvSLqo8iKYg8og/icEGRPy5rBNgrheJk5cFsNb0=\' \'sha256-iGBuXeAbFvTxvfhd2U31MabfFT4zsnBQ33xWfB+d13U=\' \'sha256-kB1RfpiiiXJ2n4e1hjQc4f05ZXh/J3SdtGF5R/btpGQ=\' \'sha256-sQiTcSoPVX/YmtXeOSe8bciETYTnlicHL1/1JJbYPkw=\' \'sha256-wm7y3Xv6CgmMG5ElDjA+R+UYnFePQMGyqo6FdkNx994=\' \'sha256-16O3Pi5ZrTZ5IqkytOkGuXw3wl0Wy4f7/LJJQV/kA0M=\' \'sha256-FVfzd2ssOX4XRInatRnWS0MU7IGcJSwxmop1V3zBGwM=\' \'sha256-ODNvmtlH8qFpq6o3afp/zoSYy6Z0nciakKnKBl9xaI8=\'; connect-src \'self\' localhost:* ws://localhost:* http://localhost:* wss://localhost:*; img-src \'self\' data: blob:; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; frame-src \'self\'; worker-src \'self\' blob:;']
          }
        });
      });

      // 개발에 필요한 최소한의 권한 설정
      session.setPermissionRequestHandler((webContents, permission, callback) => {
        // 개발 중 필요한 권한은 허용
        const developmentPermissions = ['media', 'notifications', 'geolocation', 'clipboard-read'];
        if (developmentPermissions.includes(permission)) {
          return callback(true);
        }
        
        // 그 외 권한은 기본적으로 제한
        callback(false);
      });

      return true;
    } 
    // 프로덕션 환경에서는 엄격한 보안 설정 적용
    else {
      // content-security-policy 설정
      session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': ['default-src \'self\'; script-src \'self\' \'nonce-NEXT_DYNAMIC\'; connect-src \'self\'; img-src \'self\' data:; style-src \'self\' \'unsafe-inline\'; font-src \'self\'; frame-src \'self\';']
          }
        });
      });

      // 권한 요청 제한
      session.setPermissionRequestHandler((webContents, permission, callback) => {
        // 필요한 경우 특정 권한만 허용
        const allowedPermissions = ['notifications'];
        if (allowedPermissions.includes(permission)) {
          return callback(true);
        }
        
        // 그 외 권한은 기본적으로 제한
        callback(false);
      });

      return true;
    }
  } catch (error) {
    console.error('보안 설정 적용 중 오류:', error);
    return false;
  }
}

/**
 * 전체 어플리케이션에 보안 설정을 초기화합니다
 * @param {Electron.App} app - Electron 앱 객체 (옵션)
 * @returns {boolean} 초기화 성공 여부
 */
function initializeSecuritySettings(app) {
  try {
    if (!app) {
      console.error('Electron 앱 객체가 null입니다.');
      return false;
    }

    console.log('보안 모듈 Electron 참조 설정됨');

    // 개발 환경 또는 보안 비활성화 환경 변수 확인
    const isDev = process.env.NODE_ENV === 'development';
    const disableSecurity = process.env.DISABLE_SECURITY === 'true';
    const disableCSP = process.env.DISABLE_CSP === 'true';

    console.log(`보안 설정 초기화 (개발 모드: ${isDev}, 보안 비활성화: ${disableSecurity}, CSP 비활성화: ${disableCSP})`);

    if (disableSecurity) {
      console.log('개발 환경 또는 보안 비활성화 환경: 보안 설정 적용 건너뜀');
      return true;
    }

    // 개발 환경에서는 필요한 최소한의 설정만 적용
    if (isDev) {
      // 개발에 필요한 최소한의 설정
      return true;
    }
    // 프로덕션 환경에서는 완전한 보안 설정 적용
    else {
      // 전역 보안 설정 초기화
      app.on('web-contents-created', (event, webContents) => {
        // 새 창 열기 제한
        webContents.setWindowOpenHandler(({ url }) => {
          // 허용된 URL 패턴 확인
          if (url.startsWith('https://') || 
              url.startsWith('http://localhost') || 
              url.startsWith('file://')) {
            return { action: 'allow' };
          }
          console.log(`외부 URL 열기 차단됨: ${url}`);
          return { action: 'deny' };
        });

        // 탐색 제한
        webContents.on('will-navigate', (event, navigationUrl) => {
          const parsedUrl = new URL(navigationUrl);
          // 허용된 도메인 확인
          if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
            console.log(`탐색 차단됨: ${navigationUrl}`);
            event.preventDefault();
          }
        });
      });

      return true;
    }
  } catch (error) {
    console.error('보안 설정 초기화 중 오류:', error);
    return false;
  }
}

/**
 * 권한 요청 핸들러 설정
 * @param {Electron.Session} session - Electron 세션 객체
 * @param {boolean} isDev - 개발 환경 여부
 */
function setupPermissionHandler(session, isDev) {
  if (!session) {
    console.error('유효하지 않은 세션 객체');
    return false;
  }

  try {
    // 권한 요청 핸들러 설정
    session.setPermissionRequestHandler((webContents, permission, callback) => {
      // 허용된 권한 목록
      const allowedPermissions = [
        'media',
        'notifications',
        'clipboard-read',
        'clipboard-write'
      ];

      // 개발 환경에서는 추가 권한 허용
      const devPermissions = [
        'geolocation',
        'display-capture',
        'mediaKeySystem',
        'camera',
        'microphone'
      ];

      // 개발 환경인 경우 추가 권한도 허용
      if (isDev && devPermissions.includes(permission)) {
        return callback(true);
      }

      // 기본 허용 권한 확인
      if (allowedPermissions.includes(permission)) {
        return callback(true);
      }

      // 그 외 권한은 기본적으로 거부
      callback(false);
    });

    return true;
  } catch (error) {
    console.error('권한 핸들러 설정 중 오류:', error);
    return false;
  }
}

// 모듈 내보내기
module.exports = {
  applySecuritySettings,
  initializeSecuritySettings,
  setupPermissionHandler,
  configureCspForWebContents,
  applyCSPToAllSessions,
  setupKeyboardEventHandler,
  
  // Electron 참조 설정
  set _electron(value) {
    if (value) {
      _electron = value;
      console.log('보안 모듈 Electron 참조 설정됨');
    }
  },

  get _initialized() {
    return _initialized;
  },
  
  set _initialized(value) {
    _initialized = !!value;
  }
};
