/**
 * 웹 컨텐츠 이벤트 핸들러 모듈
 *
 * Electron 웹 컨텐츠 관련 이벤트 처리 및 보안 설정을 관리합니다.
 */

const { app, dialog } = require('electron');
const { initializeSecuritySettings } = require('./security-checks');

/**
 * 웹 컨텐츠 생성 시 보안 및 기능 설정
 * @param {Electron.WebContents} contents 웹 컨텐츠 객체
 */
function setupWebContentsHandlers(contents) {
  // 새 윈도우 열기 제한
  contents.setWindowOpenHandler(({ url }) => {
    // 허용된 URL 패턴 확인
    const allowedURLs = [
      'https://api.loop.com',
      'https://docs.loop.com',
      'https://support.loop.com',
    ];

    // 로컬 개발 URL 허용
    const isDev = process.env.NODE_ENV === 'development';
    const isLocalhost = url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:');

    if (isDev && isLocalhost) {
      return { action: 'allow' };
    }

    // 허용된 URL이면 외부 브라우저에서 열기
    const isAllowed = allowedURLs.some(pattern => url.startsWith(pattern));
    if (isAllowed) {
      require('electron').shell.openExternal(url);
    } else {
      console.warn(`차단된 URL: ${url}`);
    }

    return { action: 'deny' };
  });

  // 컨텍스트 메뉴 설정
  contents.on('context-menu', (event, params) => {
    const { x, y, linkURL, isEditable, selectionText } = params;

    const menuItems = [];

    // 링크 있을 때
    if (linkURL) {
      menuItems.push(
        {
          label: '링크 복사',
          click: () => {
            require('electron').clipboard.writeText(linkURL);
          },
        },
        {
          label: '새 창에서 링크 열기',
          click: () => {
            require('electron').shell.openExternal(linkURL);
          },
        }
      );
    }

    // 텍스트 선택 시
    if (selectionText) {
      menuItems.push({
        label: '텍스트 복사',
        click: () => {
          require('electron').clipboard.writeText(selectionText);
        },
      });
    }

    // 편집 가능한 영역일 때
    if (isEditable) {
      menuItems.push(
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      );
    }

    // 메뉴 표시
    if (menuItems.length > 0) {
      const menu = require('electron').Menu.buildFromTemplate(menuItems);
      menu.popup({ window: contents, x, y });
    }
  });

  // 알림 권한 요청 처리
  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      // 알림 권한은 항상 허용
      return callback(true);
    }

    // 개발 환경에서는 모든 권한 허용
    if (process.env.NODE_ENV === 'development') {
      return callback(true);
    }

    // 기본적으로 다른 권한은 거부
    callback(false);
  });

  // 콘솔 메시지 로깅
  contents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['verbose', 'info', 'warning', 'error'];
    console.log(`[${levels[level] || 'info'}] ${message} (${sourceId}:${line})`);
  });

  // 페이지 오류 처리
  contents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`페이지 로드 실패: ${errorDescription} (${errorCode})`);

    // 오프라인일 경우 사용자에게 알림
    if (errorCode === -3 || errorCode === -106) {
      contents.loadFile('offline.html');
    }
  });

  // 렌더러 프로세스 충돌 처리
  contents.on('render-process-gone', (event, details) => {
    const { reason, exitCode } = details;
    console.error(`렌더러 프로세스 종료: ${reason} (${exitCode})`);

    dialog
      .showMessageBox({
        type: 'error',
        title: '애플리케이션 오류',
        message: '오류가 발생했습니다. 애플리케이션을 다시 시작해주세요.',
        buttons: ['다시 시작', '종료'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          app.relaunch();
        }
        app.exit(1);
      });
  });
}

/**
 * 앱 전체 웹 컨텐츠 이벤트 핸들러 설정
 */
function initializeWebContentsHandlers() {
  // 보안 설정 초기화
  initializeSecuritySettings();

  // 새로운 웹 컨텐츠 생성 감지
  app.on('web-contents-created', (event, contents) => {
    setupWebContentsHandlers(contents);

    // iframe, webview 보안 설정
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      // nodeIntegration 설정 제한
      delete webPreferences.nodeIntegration;

      // 보안 옵션 설정
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.webSecurity = true;
      webPreferences.allowRunningInsecureContent = false;

      // 유효한 URL 확인
      if (
        !params.src.startsWith('https://') &&
        !params.src.startsWith('http://localhost:') &&
        !params.src.startsWith('file://')
      ) {
        event.preventDefault();
      }
    });
  });
}

module.exports = {
  setupWebContentsHandlers,
  initializeWebContentsHandlers,
};
