/**
 * Electron 커스텀 프로토콜 핸들러 모듈
 *
 * 앱 전용 프로토콜 등록 및 보안 관리 기능을 제공합니다.
 */

const { app, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

/**
 * 앱 전용 프로토콜 이름 (loop:// 형식으로 사용)
 */
const APP_PROTOCOL = 'loop';

/**
 * 파일 시스템 경로를 앱 프로토콜 경로로 변환
 * @param {string} filePath 파일 경로
 * @returns {string} 프로토콜 URL
 */
function filePathToProtocolUrl(filePath) {
  const relativePath = path.relative(app.getAppPath(), filePath);
  return `${APP_PROTOCOL}://${relativePath.replace(/\\/g, '/')}`;
}

/**
 * 프로토콜 URL을 파일 시스템 경로로 변환
 * @param {string} protocolUrl 프로토콜 URL
 * @returns {string} 파일 경로
 */
function protocolUrlToFilePath(protocolUrl) {
  const url = new URL(protocolUrl);
  if (url.protocol !== `${APP_PROTOCOL}:`) {
    throw new Error(`유효하지 않은 프로토콜: ${url.protocol}`);
  }

  // 경로 부분 추출
  const relativePath = url.hostname + url.pathname;
  return path.join(app.getAppPath(), relativePath);
}

/**
 * MIME 타입 추론
 * @param {string} filePath 파일 경로
 * @returns {string} MIME 타입
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 커스텀 프로토콜 핸들러 등록
 */
function registerProtocolHandlers() {
  // 프로토콜 등록 (가능한 경우 표준 스킴으로 등록)
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_PROTOCOL,
      privileges: {
        secure: true,
        standard: true,
        supportFetchAPI: true,
        corsEnabled: true,
        bypassCSP: false,
      },
    },
  ]);

  // 앱이 준비되면 파일 프로토콜 핸들러 등록
  app.whenReady().then(() => {
    // 파일 프로토콜 핸들러
    protocol.registerFileProtocol(APP_PROTOCOL, (request, callback) => {
      try {
        // URL 디코딩
        const url = new URL(request.url);
        const filePath = protocolUrlToFilePath(request.url);

        // 경로 검증 (앱 디렉토리 밖으로 나가지 않도록)
        const appDir = app.getAppPath();
        const normalizedPath = path.normalize(filePath);

        if (!normalizedPath.startsWith(appDir)) {
          throw new Error('잘못된 경로 접근: ' + filePath);
        }

        // 파일 존재 확인
        if (!fs.existsSync(filePath)) {
          throw new Error('파일을 찾을 수 없음: ' + filePath);
        }

        // 미디어 요청 처리
        callback({ path: filePath });
      } catch (error) {
        console.error('프로토콜 핸들러 오류:', error);
        callback({ error: -2 }); // 파일 찾을 수 없음
      }
    });

    // HTTP 프로토콜 핸들러 (앱 내 API 통신용)
    protocol.registerHttpProtocol(`${APP_PROTOCOL}-api`, (request, callback) => {
      try {
        const url = new URL(request.url);
        const apiPath = url.hostname + url.pathname;

        // API 경로에 따라 다른 처리
        if (apiPath.startsWith('memory')) {
          // 메모리 관련 API 처리
          callback({
            url: `http://localhost:3000/api/native/memory${url.search}`,
            method: request.method,
            headers: request.headers,
          });
        } else if (apiPath.startsWith('gpu')) {
          // GPU 관련 API 처리
          callback({
            url: `http://localhost:3000/api/native/gpu${url.search}`,
            method: request.method,
            headers: request.headers,
          });
        } else {
          throw new Error('지원하지 않는 API 경로: ' + apiPath);
        }
      } catch (error) {
        console.error('API 프로토콜 핸들러 오류:', error);
        callback({ error: -2 });
      }
    });

    console.log(`프로토콜 등록 완료: ${APP_PROTOCOL}://`);
    console.log(`API 프로토콜 등록 완료: ${APP_PROTOCOL}-api://`);
  });
}

/**
 * 프로토콜 관련 보안 검사 및 허용 리스트 적용
 * @param {Electron.WebContents} webContents 웹 컨텐츠 객체
 */
function setupProtocolSecurity(webContents) {
  webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);

    // 앱의 커스텀 프로토콜만 허용
    if (url.protocol === `${APP_PROTOCOL}:` || url.protocol === `${APP_PROTOCOL}-api:`) {
      callback({});
    } else if (url.protocol === 'file:') {
      // 필요한 경우 파일 프로토콜 요청도 허용 (개발 모드 등)
      callback({});
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      // 외부 HTTP/HTTPS 요청은 개발 중에만 허용하고 검사 수행
      const allowedHosts = ['localhost', '127.0.0.1', 'api.loop.com'];

      const isDev = process.env.NODE_ENV === 'development';
      const isLocalhost = ['localhost', '127.0.0.1'].includes(url.hostname);

      if (isDev && isLocalhost) {
        callback({});
      } else if (allowedHosts.includes(url.hostname)) {
        callback({});
      } else {
        console.warn(`차단된 요청: ${details.url}`);
        callback({ cancel: true });
      }
    } else {
      console.warn(`지원하지 않는 프로토콜 요청: ${details.url}`);
      callback({ cancel: true });
    }
  });
}

module.exports = {
  registerProtocolHandlers,
  setupProtocolSecurity,
  filePathToProtocolUrl,
  protocolUrlToFilePath,
  APP_PROTOCOL,
};
