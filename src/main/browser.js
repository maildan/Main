const { 
  BROWSER_PROCESS_NAMES, 
  WEBSITE_URL_PATTERNS, 
  GOOGLE_DOCS_URL_PATTERNS,
  GOOGLE_DOCS_TITLE_PATTERNS
} = require('./constants');
const { debugLog } = require('./utils');

/**
 * 브라우저 이름 감지 함수
 * @param {Object} windowInfo - 활성 창 정보
 * @returns {string|null} - 감지된 브라우저 이름 또는 null
 */
function detectBrowserName(windowInfo) {
  // 프로세스 이름으로 브라우저 감지
  const processName = windowInfo.owner?.name?.toLowerCase() || '';
  
  // 제목으로 브라우저 종류 유추
  const title = windowInfo.title?.toLowerCase() || '';
  // URL 정보 확인 
  const url = windowInfo.url?.toLowerCase() || '';
  
  debugLog('활성 창 정보:', {
    title: windowInfo.title,
    process: processName,
    url: windowInfo.url || '(URL 없음)'
  });
  
  // 프로세스 이름을 기준으로 브라우저 감지 (가장 신뢰도 높음)
  for (const browser of BROWSER_PROCESS_NAMES) {
    if (processName.includes(browser)) {
      debugLog(`프로세스 이름으로 ${browser} 감지`);
      return browser;
    }
  }
  
  // 타이틀에서 브라우저 이름 찾기
  for (const browser of BROWSER_PROCESS_NAMES) {
    if (title.includes(browser)) {
      debugLog(`창 제목으로 ${browser} 감지`);
      return browser;
    }
  }
  
  // 특정 브라우저별 추가 확인 (OS별 특수 경우)
  if ((processName.includes('ApplicationFrameHost') || 
      (processName.toLowerCase().includes('application') && processName.toLowerCase().includes('host'))) && 
     title.toLowerCase().includes('edge')) {
    return 'edge';
  }
  
  if (process.platform === 'darwin' && processName.includes('safari')) {
    return 'safari';
  }
  
  // 일반적인 웹사이트 URL/제목 패턴 확인
  for (const pattern of WEBSITE_URL_PATTERNS) {
    if (url.includes(pattern) || title.includes(pattern)) {
      // 웹사이트 접속 중인 것으로 판단되어 기본 브라우저 추정
      return process.platform === 'darwin' ? 'safari' : 'chrome';
    }
  }
  
  // 일반적인 추론 - 제목에 웹사이트 주소가 있으면 브라우저일 가능성이 높음
  if (title.includes('http://') || title.includes('https://') || 
      title.includes('.com') || title.includes('.org') || title.includes('.net') ||
      title.includes('.co.kr') || title.includes('.kr') || title.includes('.io')) {
    
    // 기본 브라우저 추정
    return process.platform === 'darwin' ? 'safari' : 'chrome';
  }
  
  debugLog('브라우저를 감지할 수 없음');
  return null;
}

/**
 * Google Docs 관련 창인지 확인
 * @param {Object} windowInfo - 활성 창 정보
 * @returns {boolean} Google Docs 관련 창 여부
 */
function isGoogleDocsWindow(windowInfo) {
  // URL 기반 확인 (Chrome, Edge 등 일부 브라우저에서 제공)
  if (windowInfo.url) {
    const url = windowInfo.url.toLowerCase();
    for (const pattern of GOOGLE_DOCS_URL_PATTERNS) {
      if (url.includes(pattern)) {
        debugLog('URL 패턴으로 구글 문서 감지:', url);
        return true;
      }
    }
  }
  
  // 창 제목 기반 확인 (모든 브라우저 지원)
  const title = windowInfo.title?.toLowerCase() || '';
  for (const pattern of GOOGLE_DOCS_TITLE_PATTERNS) {
    if (title.includes(pattern)) {
      debugLog('제목 패턴으로 구글 문서 감지:', title);
        return true;
    }
  }
  
  // 확장된 감지 로직 - 구글 문서 작업 시 특정 패턴이 있는지 확인
  if ((title.includes('문서') || title.includes('document') || 
       title.includes('spreadsheet') || title.includes('presentation')) && 
      (title.includes('google') || title.includes('구글'))) {
    debugLog('추가 패턴으로 구글 문서 감지:', title);
    return true;
  }
  
  debugLog('구글 문서가 아님:', title);
  return false;
}

module.exports = {
  detectBrowserName,
  isGoogleDocsWindow
};
