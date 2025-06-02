/**
 * security-checks.js
 *
 * Electron 앱 보안 체크 모듈
 * - 개발 모드일 때는 Next.js가 내려주는 CSP를 완전히 덮어쓴다 (unsafe-inline, unsafe-eval 허용)
 * - 프로덕션 모드일 때는 엄격한 CSP를 적용
 * - 키보드 이벤트 IPC 핸들러를 등록
 */

const { session, app: _app, webContents, ipcMain, BrowserWindow } = require('electron');
const path = require('path');

// ----------------------------------------------------------------------------
// 1) CSP 헤더 삭제 + 덮어쓰기
// ----------------------------------------------------------------------------

/**
 * 단일 세션에 대해 CSP 헤더를 제거/덮어쓰는 함수
 * @param {Electron.Session} ses - Electron 세션 객체 (ex: session.defaultSession)
 * @param {boolean} isDev - 개발 모드 여부
 */
function applyCSPToSession(ses, isDev) {
  if (!ses || !ses.webRequest) {
    console.error('applyCSPToSession: 유효하지 않은 세션 객체입니다.');
    return;
  }

  // onHeadersReceived 훅을 등록해서 Next.js가 내려주는 CSP 헤더를 삭제하고, 개발 모드라면 완전 개방 CSP 삽입
  ses.webRequest.onHeadersReceived((details, callback) => {
    // (1) 우선 내려온 responseHeaders 복제
    const responseHeaders = { ...(details.responseHeaders || {}) };

    // (2) 기존 CSP 헤더를 모두 삭제
    Object.keys(responseHeaders).forEach((headerKey) => {
      const lower = headerKey.toLowerCase();
      if (
        lower === 'content-security-policy' ||
        lower === 'content-security-policy-report-only' ||
        lower.includes('content-security')
      ) {
        delete responseHeaders[headerKey];
      }
    });

    // (3) 개발 모드라면 완전 개방 CSP 추가
    if (isDev) {
      responseHeaders['Content-Security-Policy'] = [
        // **개발 전용: 모든 도메인 + unsafe-inline + unsafe-eval 허용**
        'default-src * \'unsafe-inline\' \'unsafe-eval\'; ' +
        'script-src * \'unsafe-inline\' \'unsafe-eval\'; ' +
        'style-src * \'unsafe-inline\'; ' +
        'img-src * data: blob:; ' +
        'font-src * data:; ' +
        'connect-src * ws: wss:; ' +
        'media-src * data: blob:;'
      ];
    } else {
      // 프로덕션 모드: 엄격한 CSP 예시 (필요시 더 조정)
      responseHeaders['Content-Security-Policy'] = [
        'default-src \'self\'; ' +
        'script-src \'self\'; ' +
        'style-src \'self\' \'unsafe-inline\'; ' +
        'img-src \'self\' data: blob:; ' +
        'connect-src \'self\'; ' +
        'font-src \'self\'; ' +
        'object-src \'none\'; ' +
        'media-src \'self\'; ' +
        'child-src \'self\';'
      ];
    }

    // (4) 콜백으로 덮어쓴 헤더를 넘긴다
    callback({
      responseHeaders,
      cancel: false
    });
  });
}

/**
 * 모든 세션(defaultSession) 에 CSP 헤더 적용
 * @param {boolean} isDev - 개발 모드인지 여부
 */
function applyCSPToAllSessions(isDev) {
  try {
    const defaultSes = session.defaultSession;
    applyCSPToSession(defaultSes, isDev);

    console.log(`applyCSPToAllSessions: ${isDev ? '개발 모드 → 모든 세션 CSP 제거/덮어쓰기 완료' : '프로덕션 모드 → 엄격 CSP 적용 완료'}`);
  } catch (err) {
    console.error('applyCSPToAllSessions 오류:', err);
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
      ipcMain.removeAllListeners('sendKeyboardEvent');
      ipcMain.removeAllListeners('keyboard-event');
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
 * @param {Electron.App} appObj - Electron 앱 객체
 */
function initializeSecuritySettings(appObj) {
  if (!appObj) {
    console.error('initializeSecuritySettings: 유효한 app 객체가 필요합니다.');
    return false;
  }

  const isDev = process.env.NODE_ENV === 'development';
  const disableSecurity = process.env.DISABLE_SECURITY === 'true';
  const disableCSP = process.env.DISABLE_CSP === 'true';

  console.log(`initializeSecuritySettings 호출됨 → isDev: ${isDev}, disableSecurity: ${disableSecurity}, disableCSP: ${disableCSP}`);

  if (disableSecurity) {
    console.log('initializeSecuritySettings: 보안 비활성화 환경 → CSP 무시');
    return true;
  }

  // (1) 개발 모드이거나 DISABLE_CSP=true면 CSP를 완전히 덮어쓴다
  if (isDev || disableCSP) {
    applyCSPToAllSessions(true);
  } else {
    // (2) 프로덕션 모드라면 엄격 CSP 적용
    applyCSPToAllSessions(false);

    // 추가 보안 로직(예: window open 제한 등)을 여기에 넣어도 좋음
    appObj.on('web-contents-created', (event, contents) => {
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
}

// ----------------------------------------------------------------------------
// 4) 모듈 내보내기
// ----------------------------------------------------------------------------
module.exports = {
  initializeSecuritySettings,
  setupKeyboardEventHandler,
  applyCSPToAllSessions,
  applyCSPToSession
};
