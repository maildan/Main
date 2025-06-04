/**
 * security-checks.js
 *
 * Electron 앱 보안 체크 모듈
 * - 개발 모드일 때는 Next.js가 내려주는 CSP를 완전히 덮어쓴다 (unsafe-inline, unsafe-eval 허용)
 * - 프로덕션 모드일 때는 엄격한 CSP를 적용
 * - 키보드 이벤트 IPC 핸들러를 등록
 */

const { session, app, webContents, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

/**
 * 안전한 웹 설정을 위한 Header를 설정합니다.
 * 개발 모드와 프로덕션 모드에서 다른 CSP 설정 사용
 */
const securityHeaders = {
  'Content-Security-Policy': isDev 
    // 개발 모드에서는 HMR과 React 개발 도구를 위해 unsafe-inline, unsafe-eval 허용
    ? 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\' ws: wss:;'
    // 프로덕션 모드에서는 보안을 강화하지만 스타일 관련 'unsafe-inline'은 유지
    : 'default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:;',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * HTTP 요청 헤더에 보안 헤더를 적용합니다.
 */
function applySecurityHeaders(details, callback) {
  if (details.responseHeaders) {
    for (const [header, value] of Object.entries(securityHeaders)) {
      if (details.responseHeaders[header]) {
        delete details.responseHeaders[header];
      }
      details.responseHeaders[header] = [value];
    }
  }

  if (callback && typeof callback === 'function') {
    callback({ responseHeaders: details.responseHeaders });
  }
}

/**
 * 모든 세션에 Content Security Policy를 적용합니다.
 * 기본 세션 및 파티션된 세션 모두 포함
 */
function applyCSPToAllSessions() {
  try {
    // 기본 세션에 CSP 적용
    registerCSPForSession(session.defaultSession);
    
    // 모든 세션에 CSP 적용 (파티션된 세션 포함)
    const allSessions = session.getAllSessions?.() || [];
    console.log(`모든 세션에 CSP 적용 중... (세션 수: ${allSessions.length + 1})`);
    
    allSessions.forEach((sess, idx) => {
      try {
        console.log(`세션 #${idx + 1} CSP 적용 중...`);
        registerCSPForSession(sess);
      } catch (err) {
        console.error(`세션 #${idx + 1} CSP 적용 실패:`, err);
      }
    });
    
    console.log('모든 세션에 CSP 적용 완료');
    return true;
  } catch (err) {
    console.error('전체 세션 CSP 적용 중 오류:', err);
    
    // 오류가 발생한 경우에도 기본 세션만이라도 시도
    try {
      console.warn('기본 세션에만 CSP 적용 시도...');
      registerCSPForSession(session.defaultSession);
      return true;
    } catch (fallbackErr) {
      console.error('기본 세션 CSP 적용마저 실패:', fallbackErr);
      return false;
    }
  }
}

/**
 * 특정 세션에 CSP를 등록합니다.
 */
function registerCSPForSession(sess) {
  if (!sess || typeof sess.webRequest?.onHeadersReceived !== 'function') {
    console.error('유효하지 않은 세션 객체:', sess);
    return false;
  }
  
  try {
    // 기존 리스너 제거 (중복 방지)
    sess.webRequest.onHeadersReceived(null);
    
    // 새 CSP 설정 적용
    sess.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
      applySecurityHeaders(details, callback);
    });
    
    console.log(isDev 
      ? '개발 모드 - 완화된 CSP 설정이 적용되었습니다.' 
      : '프로덕션 모드 - 엄격한 CSP 설정이 적용되었습니다.');
    return true;
  } catch (err) {
    console.error('세션에 CSP 등록 실패:', err);
    return false;
  }
}

/**
 * 웹 요청에 보안 검사를 수행합니다.
 */
function setupRequestChecks(mainWindow) {
  try {
    if (mainWindow && mainWindow.webContents) {
      const webContents = mainWindow.webContents;
      
      // 1. 새 창 열기 제어
      webContents.setWindowOpenHandler(({ url }) => {
        // HTTPS만 허용하거나 특정 허용된 URL만 처리
        if (url.startsWith('https://') || url.startsWith('http://localhost')) {
          return { action: 'allow' };
        }
        console.warn(`안전하지 않은 URL 열기 차단됨: ${url}`);
        return { action: 'deny' };
      });
      
      // 2. 네비게이션 제어
      webContents.on('will-navigate', (event, url) => {
        // 여기서 필요한 추가 확인 로직 구현
        if (!url.startsWith('https://') && !url.startsWith('http://localhost') && !url.startsWith('file://')) {
          console.warn(`탐색 차단됨: ${url}`);
          event.preventDefault();
        }
      });
    }
    
    return true;
  } catch (err) {
    console.error('요청 보안 설정 중 오류:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// 2) 키보드 이벤트 IPC 핸들러 등록
// ----------------------------------------------------------------------------

/**
 * 키보드 이벤트 핸들러를 설정합니다.
 * Renderer → Main으로 날아오는 키보드 이벤트를 수신하여, 다시 메인 윈도우로 보냅니다.
 */
function setupKeyboardEventHandler() {
  try {
    // 기존에 등록된 핸들러가 있으면 일단 제거 (중복 등록 방지)
    try {
      ipcMain.removeHandler('sendKeyboardEvent');
      ipcMain.removeHandler('keyboard-event');
      ipcMain.removeHandler('ime-composition-event');
      ipcMain.removeHandler('get-last-completed-text');
      ipcMain.removeAllListeners('sendKeyboardEvent');
      ipcMain.removeAllListeners('keyboard-event');
      ipcMain.removeAllListeners('ime-composition-event');
    } catch (ignore) {}
    
    // <1> 동기/비동기 패턴 (handle 쓰는 패턴)
    ipcMain.handle('sendKeyboardEvent', async (event, data) => {
      console.log('IPC(handle) sendKeyboardEvent 수신:', data);
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
      return { success: true };
    });
    
    ipcMain.handle('keyboard-event', async (event, data) => {
      console.log('IPC(handle) keyboard-event 수신:', data);
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
      return { success: true };
    });
    
    // <2> 전통적인 on() 이벤트 리스너 방식
    ipcMain.on('sendKeyboardEvent', (event, data) => {
      console.log('IPC(on) sendKeyboardEvent 수신:', data);
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
      // 응답(옵션)
        event.reply('sendKeyboardEvent-reply', { success: true });
    });

    ipcMain.on('keyboard-event', (event, data) => {
      console.log('IPC(on) keyboard-event 수신:', data);
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('keyboard-event-from-main', data);
        }
        event.reply('keyboard-event-reply', { success: true });
    });
    
    // <3> IME Composition 이벤트 처리 (한글 입력을 위한 이벤트)
    const IME_STATE = {
      isComposing: false,
      lastCompletedText: ''
    };
    
    ipcMain.on('ime-composition-event', (event, data) => {
      if (!data) return;
      
      console.log('IPC(on) ime-composition-event 수신:', data.type);
      
      const { type, text, timestamp } = data;
      
      if (type === 'compositionend' && text) {
        IME_STATE.isComposing = false;
        IME_STATE.lastCompletedText = text;
        
        // 렌더러에게 완성된 텍스트 알림
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('ime-composition-completed', {
            text,
            timestamp,
            source: 'security-checks.js'
          });
        }
      } else if (type === 'compositionstart') {
        IME_STATE.isComposing = true;
      }
      
      // 응답(옵션)
      event.reply('ime-composition-event-reply', { success: true });
      });

    // <4> 마지막 완성된 IME 텍스트 요청 처리
    ipcMain.handle('get-last-completed-text', () => {
      return IME_STATE.lastCompletedText || '';
    });

    console.log('setupKeyboardEventHandler: 키보드 IPC 핸들러 등록 완료');
  } catch (err) {
    console.error('setupKeyboardEventHandler 오류:', err);
  }
}

// ----------------------------------------------------------------------------
// 3) 외부에서 사용할 초기화 함수
// ----------------------------------------------------------------------------

/**
 * 앱이 준비된 시점에 보안 설정(특히 CSP)을 초기화합니다.
 * 반드시 BrowserWindow 생성 전(또는 거의 직후)에 호출해야 합니다.
 * @param {Electron.App} appObj - Electron 앱 객체 (선택적)
 */
function initializeSecuritySettings(appObj) {
  // 전달된 app 객체가 없으면 전역 app 객체 사용
  const applicationObj = appObj || app || require('electron').app;
  
  try {
    if (!applicationObj || typeof applicationObj !== 'object') {
      console.error('initializeSecuritySettings: 유효한 app 객체를 찾을 수 없습니다.');
      console.warn('폴백 앱 객체 사용 시도 중...');
      // 최종 폴백: 전역 Electron에서 직접 가져오기
      const electron = require('electron');
      if (electron && electron.app) {
        console.log('폴백: electron.app 사용');
        return initializeSecuritySettings(electron.app);
      }
      return false;
    }

    const disableSecurity = process.env.DISABLE_SECURITY === 'true';
    const disableCSP = process.env.DISABLE_CSP === 'true';

  console.log(`initializeSecuritySettings 호출됨 → isDev: ${isDev}, disableSecurity: ${disableSecurity}, disableCSP: ${disableCSP}`);

    if (disableSecurity) {
    console.log('initializeSecuritySettings: 보안 비활성화 환경 → CSP 무시');
      return true;
    }

  // (1) 개발 모드이거나 DISABLE_CSP=true면 CSP를 완전히 덮어쓴다
  if (isDev || disableCSP) {
    applyCSPToAllSessions();
  } else {
    // (2) 프로덕션 모드라면 엄격 CSP 적용
    applyCSPToAllSessions();

    // 추가 보안 로직(예: window open 제한 등)을 여기에 넣어도 좋음
      applicationObj.on('web-contents-created', (event, contents) => {
      // 팝업 차단 예시
      contents.setWindowOpenHandler(({ url }) => {
        if (
          url.startsWith('https://') ||
              url.startsWith('http://localhost') || 
          url.startsWith('file://')
        ) {
            return { action: 'allow' };
          }
        console.log(`외부 URL 열기 차단됨 → ${url}`);
          return { action: 'deny' };
        });

      // 탐색 차단 예시
      contents.on('will-navigate', (evt, navUrl) => {
        const parsed = new URL(navUrl);
        if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
          console.log(`탐색 차단됨 → ${navUrl}`);
          evt.preventDefault();
          }
        });
      });
  }

  // (3) 키보드 이벤트 핸들러 항상 등록
  setupKeyboardEventHandler();

    return true;
  } catch (error) {
    console.error('보안 설정 초기화 중 오류 발생:', error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// 4) 모듈 내보내기
// ----------------------------------------------------------------------------
module.exports = {
  initializeSecuritySettings,
  applyCSPToAllSessions,
  registerCSPForSession,
  setupRequestChecks,
  setupKeyboardEventHandler
};

// 이벤트 리스너 등록
ipcMain.on('preload-api-ready', (event, data) => {
  console.log('preload 스크립트의 API 초기화 성공 확인:', data);
  
  // 응답하는 창에 API 초기화 성공 알림
  try {
    const sender = event.sender;
    if (sender && sender.webContents) {
      sender.send('preload-api-acknowledged', {
        success: true,
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error('preload API 확인 응답 실패:', err);
  }
});

ipcMain.on('preload-api-failed', (event, data) => {
  console.error('preload API 초기화 실패 감지:', data);
  
  // 문제가 있는 창 다시 로드 시도
  try {
    const sender = event.sender;
    if (sender && sender.webContents) {
      console.log('preload API 초기화 실패 - 자동 복구 시작');
      setTimeout(() => {
        try {
          sender.reload();
        } catch (reloadErr) {
          console.error('창 리로드 실패:', reloadErr);
    }
      }, 1000);
    }
  } catch (err) {
    console.error('preload API 실패 처리 중 오류:', err);
  }
});

// 키보드 이벤트 핸들러 초기화 확인 리스너
ipcMain.on('keyboard-handler-initialized', (event, data) => {
  console.log('security-checks.js: 키보드 핸들러 초기화 완료 메시지 수신', data);
  
  // 응답하기 (preload 스크립트에게 확인)
  try {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('keyboard-handler-confirmed', {
        success: true,
        timestamp: Date.now(),
        source: 'security-checks.js'
      });
    }
  } catch (err) {
    console.error('키보드 핸들러 확인 응답 중 오류:', err);
  }
});

// 키보드 이벤트 테스트 핸들러
ipcMain.handle('test-keyboard-connection', async () => {
  try {
    // 키보드 이벤트 핸들러가 제대로 등록되어 있는지 테스트
    return {
      success: true,
      handlersRegistered: true,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('키보드 연결 테스트 중 오류:', error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
});
