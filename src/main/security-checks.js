/**
 * Electron 앱 보안 체크 모듈
 *
 * 앱의 보안을 강화하기 위한 다양한 검사 및 설정을 제공합니다.
 */

const { session, app } = require('electron');
const path = require('path');

/**
 * CSP(Content Security Policy) 설정
 * @param {Electron.WebContents} webContents 웹 컨텐츠 객체
 */
function setContentSecurityPolicy(webContents) {
  webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; connect-src \'self\' https://*.api.com',
        ],
      },
    });
  });
}

/**
 * 보안 관련 웹 기본 설정
 * @param {Electron.BrowserWindow} window 브라우저 윈도우 객체
 */
function applySecuritySettings(window) {
  // 네비게이션 이벤트 제한
  window.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // localhost 또는 내부 프로토콜이 아닌 경우 네비게이션 방지
    if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname) && !url.startsWith('file://')) {
      event.preventDefault();
      console.warn(`보안 정책에 의해 외부 URL 접근이 차단되었습니다: ${url}`);
    }
  });

  // 외부 링크를 시스템 브라우저에서 열기
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 웹 보안 및 샌드박스 활성화
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Content-Type-Options': ['nosniff'],
        'X-XSS-Protection': ['1; mode=block'],
        'X-Frame-Options': ['SAMEORIGIN'],
      },
    });
  });
}

/**
 * 권한 요청 처리 설정
 * @param {Electron.WebContents} webContents 웹 컨텐츠 객체
 */
function setupPermissionHandler(webContents) {
  webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // 허용할 권한 목록 (최소한의 권한만 허용)
    const allowedPermissions = ['media', 'notifications', 'clipboard-read'];

    callback(allowedPermissions.includes(permission));
  });
}

/**
 * 앱의 보안 설정 초기화
 */
function initializeSecuritySettings() {
  // 모든 세션에 대한 기본 보안 설정
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'X-Content-Type-Options': ['nosniff'],
        'X-XSS-Protection': ['1; mode=block'],
        'X-Frame-Options': ['SAMEORIGIN'],
      },
    });
  });

  // 기본 세션에 대한 권한 설정
  setupPermissionHandler(session.defaultSession);

  // 앱 실행 경로 검증
  const execPath = app.getPath('exe');
  const appPath = app.getAppPath();

  console.log('앱 실행 경로:', execPath);
  console.log('앱 리소스 경로:', appPath);

  // 앱에서 사용하는 프로토콜 등록 및 검증
  if (process.env.NODE_ENV !== 'development') {
    app.on('web-contents-created', (event, contents) => {
      contents.on('will-attach-webview', (event, webPreferences, params) => {
        // webview의 기본 옵션 재정의
        delete webPreferences.preload;
        delete webPreferences.preloadURL;

        // 보안 옵션 적용
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.sandbox = true;

        // 허용된 URL이 아닌 경우 로드 방지
        if (!params.src.startsWith('https://')) {
          event.preventDefault();
        }
      });
    });
  }
}

module.exports = {
  setContentSecurityPolicy,
  applySecuritySettings,
  setupPermissionHandler,
  initializeSecuritySettings,
};
