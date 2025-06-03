const { 
  BROWSER_PROCESS_NAMES, 
  BROWSER_DISPLAY_NAMES,
  WEBSITE_URL_PATTERNS, 
  GOOGLE_DOCS_URL_PATTERNS,
  GOOGLE_DOCS_TITLE_PATTERNS,
  SUPPORTED_WEBSITES,
  appState
} = require('./constants');
const { debugLog } = require('./utils');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const url = require('url');
const activeWin = require('active-win');

// 마지막으로 알려진 브라우저 정보를 캐싱
let lastKnownBrowserInfo = {
  name: null,
  title: '',
  url: '',
  timestamp: 0,
  urlPatterns: [] // URL 패턴 캐싱 추가
};

// URL 캐시 (중복 검사 방지)
const urlCache = new Map();
const URL_CACHE_MAX_SIZE = 100;
const URL_CACHE_TTL = 5 * 60 * 1000; // 5분

/**
 * URL 캐시 관리
 * @param {string} url - 캐시할 URL
 * @param {string} category - URL의 카테고리
 */
function cacheUrl(url, category) {
  if (!url) return;
  
  // URL 캐시 크기 제한
  if (urlCache.size > URL_CACHE_MAX_SIZE) {
    // 가장 오래된 항목 제거
    const oldestKey = urlCache.keys().next().value;
    if (oldestKey) urlCache.delete(oldestKey);
  }
  
  urlCache.set(url, {
    category,
    timestamp: Date.now()
  });
}

/**
 * 캐시된 URL 카테고리 가져오기
 * @param {string} url - 확인할 URL
 * @returns {string|null} - 카테고리 또는 null
 */
function getCachedUrlCategory(url) {
  if (!url) return null;
  
  const cached = urlCache.get(url);
  if (!cached) return null;
  
  // 캐시 만료 확인
  if (Date.now() - cached.timestamp > URL_CACHE_TTL) {
    urlCache.delete(url);
    return null;
  }
  
  return cached.category;
}

/**
 * 브라우저 이름 감지 함수 (고급 버전)
 * @param {Object} windowInfo - 활성 창 정보
 * @returns {string|null} - 감지된 브라우저 이름 또는 null
 */
function detectBrowserName(windowInfo) {
  try {
    // 오류 발생 시 마지막 알려진 정보 사용 (10초 이내인 경우)
    if (!windowInfo) {
      const now = Date.now();
      if (lastKnownBrowserInfo.timestamp > 0 && 
          now - lastKnownBrowserInfo.timestamp < 10000) {
        debugLog(`캐시된 브라우저 정보 사용: ${lastKnownBrowserInfo.name}`);
        return lastKnownBrowserInfo.name;
      }
      debugLog('유효한 창 정보 없음');
      return null;
    }
    
    // 프로세스 이름으로 브라우저 감지
    const processName = windowInfo.owner?.name || '';
    const processPath = windowInfo.owner?.path || '';
    const browserName = getBrowserNameFromProcess(processName, processPath);
    
    // 감지된 브라우저 정보 저장
    if (browserName) {
      debugLog(`브라우저 감지됨: ${browserName}`);
      
      // URL 정규화 및 정보 저장
      let normalizedUrl = '';
      if (windowInfo.url) {
        try {
          // URL 파싱 및 정규화
          const parsedUrl = new URL(windowInfo.url);
          normalizedUrl = parsedUrl.hostname + parsedUrl.pathname;
          debugLog(`정규화된 URL: ${normalizedUrl}`);
        } catch (error) {
          // URL 파싱 실패 시 원본 그대로 사용
          normalizedUrl = windowInfo.url;
          debugLog(`URL 파싱 실패, 원본 사용: ${normalizedUrl}`);
        }
      }
      
      lastKnownBrowserInfo = {
        name: browserName,
        title: windowInfo.title || '',
        url: normalizedUrl || windowInfo.url || '',
        urlPatterns: detectUrlPatterns(windowInfo.url),
        timestamp: Date.now()
      };
      
      // 웹사이트 카테고리 감지 및 로깅
      const category = detectWebsiteCategory(windowInfo.url);
      if (category) {
        debugLog(`웹사이트 카테고리 감지: ${category}, URL: ${windowInfo.url}`);
      }
    } else {
      debugLog(`알 수 없는 브라우저: processName=${processName}, path=${processPath}`);
    }
    
    return browserName;
  } catch (error) {
    console.error('브라우저 감지 오류:', error);
    return null;
  }
}

/**
 * URL에서 패턴 감지 (개선 버전)
 * @param {string} urlString - 확인할 URL
 * @returns {Array} - 감지된 패턴 목록
 */
function detectUrlPatterns(urlString) {
  if (!urlString) return [];
  
  const patterns = [];
  
  try {
    const normalizedUrl = urlString.toLowerCase();
    
    // 지원되는 웹사이트 카테고리별 패턴 확인
    for (const [category, sites] of Object.entries(SUPPORTED_WEBSITES)) {
      for (const site of sites) {
        if (normalizedUrl.includes(site.pattern)) {
          patterns.push({
            category,
            pattern: site.pattern,
            name: site.name
          });
          
          debugLog(`URL 패턴 감지: ${site.name} (${category})`);
        }
      }
    }
    
    // 패턴이 감지되지 않은 경우 로깅
    if (patterns.length === 0) {
      debugLog(`지원되는 패턴 없음: ${urlString}`);
    }
  } catch (error) {
    console.error('URL 패턴 감지 오류:', error);
  }
  
  return patterns;
}

/**
 * 프로세스 이름과 경로에서 브라우저 이름 추출 (고급 버전)
 * @param {string} processName - 프로세스 이름
 * @param {string} processPath - 프로세스 실행 경로
 * @returns {string|null} - 브라우저 이름 또는 null
 */
function getBrowserNameFromProcess(processName, processPath) {
  try {
    if (!processName && !processPath) {
      debugLog('프로세스 이름과 경로가 모두 없음');
      return null;
    }
    
    // 프로세스 이름 정규화 (소문자, 확장자 제거)
    const normalizedProcessName = processName.toLowerCase().replace(/\.[^/.]+$/, '');
    
    // 알려진 브라우저 목록과 매칭
    for (const [browserKey, patterns] of Object.entries(BROWSER_PROCESS_NAMES)) {
      for (const pattern of patterns) {
        if (normalizedProcessName.includes(pattern)) {
          // 표시 이름 매핑이 있으면 사용
          const displayName = BROWSER_DISPLAY_NAMES[pattern.toLowerCase()] || browserKey;
          debugLog(`프로세스 이름으로 브라우저 감지: ${normalizedProcessName} -> ${displayName}`);
          return displayName;
        }
      }
    }
    
    // 경로에서 추가 확인
    if (processPath) {
      const filename = path.basename(processPath).toLowerCase();
      
      // 파일 이름으로 브라우저 감지 (맥 특화)
      if (filename.includes('chrome')) {
        debugLog('경로에서 Chrome 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['chrome'] || 'Chrome';
      }
      if (filename.includes('firefox')) {
        debugLog('경로에서 Firefox 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['firefox'] || 'Firefox';
      }
      if (filename.includes('safari')) {
        debugLog('경로에서 Safari 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['safari'] || 'Safari';
      }
      if (filename.includes('edge')) {
        debugLog('경로에서 Edge 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['edge'] || 'Edge';
      }
      if (filename.includes('opera')) {
        debugLog('경로에서 Opera 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['opera'] || 'Opera';
      }
      if (filename.includes('brave')) {
        debugLog('경로에서 Brave 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['brave'] || 'Brave';
      }
      if (filename.includes('vivaldi')) {
        debugLog('경로에서 Vivaldi 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['vivaldi'] || 'Vivaldi';
      }
      // 네이버 웨일 브라우저 추가
      if (filename.includes('whale')) {
        debugLog('경로에서 네이버 웨일 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['whale'] || '네이버 웨일';
      }
      // Arc 브라우저 추가
      if (filename.includes('arc')) {
        debugLog('경로에서 Arc 브라우저 감지됨');
        return BROWSER_DISPLAY_NAMES['arc'] || 'Arc Browser';
      }
    }
    
    debugLog(`알 수 없는 브라우저 프로세스: ${normalizedProcessName}`);
    return null;
  } catch (error) {
    console.error('프로세스 이름에서 브라우저 감지 오류:', error);
    return null;
  }
}

/**
 * URL 패턴으로 웹사이트 카테고리 감지
 * @param {string} urlString - 확인할 URL
 * @returns {string|null} - 감지된 카테고리 또는 null
 */
function detectWebsiteCategory(urlString) {
  if (!urlString) return null;
  
  try {
    // 캐시 확인
    const cachedCategory = getCachedUrlCategory(urlString);
    if (cachedCategory) {
      debugLog(`캐시된 URL 카테고리 사용: ${cachedCategory}`);
      return cachedCategory;
    }
    
    const normalizedUrl = urlString.toLowerCase();
    
    // URL 패턴 매칭
    for (const [category, patterns] of Object.entries(WEBSITE_URL_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalizedUrl.includes(pattern)) {
          // 카테고리 캐싱
          cacheUrl(urlString, category);
          debugLog(`웹사이트 카테고리 감지: ${category} (${pattern})`);
          return category;
        }
      }
    }
    
    // 지원되는 웹사이트 확인
    for (const [category, sites] of Object.entries(SUPPORTED_WEBSITES)) {
      for (const site of sites) {
        if (normalizedUrl.includes(site.pattern)) {
          // 카테고리 캐싱
          cacheUrl(urlString, category);
          debugLog(`지원되는 웹사이트 감지: ${site.name} (${category})`);
          return category;
        }
      }
    }
    
    // 일반 웹사이트로 처리
    cacheUrl(urlString, 'web');
    debugLog(`일반 웹사이트로 분류: ${urlString}`);
    return 'web';
  } catch (error) {
    console.error('웹사이트 카테고리 감지 오류:', error);
    return null;
  }
}

/**
 * Google Docs 창인지 확인 (개선 버전)
 * @param {Object} windowInfo - 확인할 창 정보
 * @returns {boolean} - Google Docs 창 여부
 */
function isGoogleDocsWindow(windowInfo) {
  try {
    if (!windowInfo) return false;
    
    // URL 기반 확인
    if (windowInfo.url) {
      const url = windowInfo.url.toLowerCase();
      
      // Google Docs URL 패턴 매칭
      for (const pattern of GOOGLE_DOCS_URL_PATTERNS) {
        if (url.includes(pattern)) {
          debugLog(`Google Docs URL 감지: ${url}`);
          return true;
        }
      }
    }
    
    // 제목 기반 확인
    if (windowInfo.title) {
      const title = windowInfo.title.toLowerCase();
      
      // Google Docs 제목 패턴 매칭
      for (const pattern of GOOGLE_DOCS_TITLE_PATTERNS) {
        if (title.includes(pattern)) {
          debugLog(`Google Docs 제목 감지: ${title}`);
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Google Docs 창 확인 오류:', error);
    return false;
  }
}

/**
 * 마지막으로 알려진 브라우저 정보 가져오기
 * @returns {Object} - 캐시된 브라우저 정보
 */
function getLastKnownBrowserInfo() {
  return { ...lastKnownBrowserInfo };
}

/**
 * 대체 브라우저 이름 추정 (active-win 오류 시 사용)
 * @returns {string} - 추정된 브라우저 이름
 */
function getFallbackBrowserName() {
  // 마지막으로 저장된 브라우저 이름이 있으면 반환
  if (lastKnownBrowserInfo.name && 
      Date.now() - lastKnownBrowserInfo.timestamp < 30000) {
    return lastKnownBrowserInfo.name;
  }
  
  // 현재 통계에서 브라우저 이름 가져오기
  if (appState.currentStats && appState.currentStats.currentBrowser) {
    return appState.currentStats.currentBrowser;
  }
  
  // 어떤 정보도 없는 경우 기본값 반환
  return 'Unknown Browser';
}

/**
 * URL 및 브라우저 정보 정리 (캐시 만료 항목 제거)
 */
function cleanupUrlCache() {
  const now = Date.now();
  
  // 만료된 URL 캐시 항목 제거
  for (const [urlKey, data] of urlCache.entries()) {
    if (now - data.timestamp > URL_CACHE_TTL) {
      urlCache.delete(urlKey);
    }
  }
}

/**
 * 현재 브라우저 정보를 가져오는 IPC 핸들러 등록
 * 이 함수는 get-current-browser-info 핸들러를 등록합니다.
 * main.js에서 앱 초기화 후 호출되어야 합니다.
 */
function setupCurrentBrowserInfoHandler() {
  // 기존 핸들러 제거를 시도합니다 (중복 등록 방지)
  try {
    ipcMain.removeHandler('get-current-browser-info');
    ipcMain.removeAllListeners('get-current-browser-info');
  } catch (error) {
    console.log('브라우저 정보 핸들러 제거 오류 (무시 가능):', error.message);
  }

  // 핸들러 등록 (invoke - 응답이 필요한 경우)
  ipcMain.handle('get-current-browser-info', async () => {
    try {
      // 활성 창 정보 가져오기
      let windowInfo = null;
      let browserName = null;
      let title = null;
      let url = null;
      let isGoogleDocs = false;

      try {
        windowInfo = await activeWin();
        browserName = windowInfo ? detectBrowserName(windowInfo) : null;
        title = windowInfo ? windowInfo.title : null;
        url = windowInfo ? windowInfo.url : null;
        isGoogleDocs = windowInfo ? isGoogleDocsWindow(windowInfo) : false;
      } catch (activeWinError) {
        console.warn('active-win 오류, 대체 방법 사용:', activeWinError.message);
        
        // 권한 오류 메시지 감지
        const errorOutput = (activeWinError.stdout || '').toString() + (activeWinError.stderr || '').toString();
        if (errorOutput.includes('screen recording permission')) {
          // 권한 오류 이벤트 발생
          if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('permission-error', {
              code: 'SCREEN_RECORDING',
              message: '화면 기록 권한이 필요합니다',
              detail: '키보드 입력 모니터링을 위해 화면 기록 권한이 필요합니다. 시스템 설정을 열어 권한을 허용해주세요.'
            });
          }
        }
        
        // 마지막 알려진 정보 사용
        const lastKnown = getLastKnownBrowserInfo();
        browserName = lastKnown.name || appState.currentStats?.currentBrowser || 'Unknown Browser';
        title = lastKnown.title || appState.currentStats?.currentWindow || 'Unknown Window';
        url = lastKnown.url || '';
        
        // 구글 독스 여부 추정 (제목에서)
        isGoogleDocs = title && (
          title.toLowerCase().includes('google docs') || 
          title.toLowerCase().includes('문서') ||
          title.toLowerCase().includes('document')
        );
      }
      
      // 결과 반환
      return {
        browserName,
        title,
        url,
        isGoogleDocs,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('브라우저 정보 요청 처리 오류:', error);
      return {
        browserName: null,
        title: null,
        url: null,
        isGoogleDocs: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  });

  // 이벤트 리스너 등록 (on - 단방향 이벤트)
  ipcMain.on('get-current-browser-info', async (event) => {
    try {
      let browserName = null;
      let title = null;
      let url = null;
      let isGoogleDocs = false;
      
      try {
        const windowInfo = await activeWin();
        browserName = windowInfo ? detectBrowserName(windowInfo) : null;
        title = windowInfo ? windowInfo.title : null;
        url = windowInfo ? windowInfo.url : null;
        isGoogleDocs = windowInfo ? isGoogleDocsWindow(windowInfo) : false;
      } catch (activeWinError) {
        console.warn('active-win 오류, 대체 방법 사용:', activeWinError.message);
        
        // 마지막 알려진 정보 사용
        const lastKnown = getLastKnownBrowserInfo();
        browserName = lastKnown.name || appState.currentStats?.currentBrowser || 'Unknown Browser';
        title = lastKnown.title || appState.currentStats?.currentWindow || 'Unknown Window';
        url = lastKnown.url || '';
        isGoogleDocs = title && (
          title.toLowerCase().includes('google docs') || 
          title.toLowerCase().includes('문서') ||
          title.toLowerCase().includes('document')
        );
      }
      
      // 응답 전송
      event.sender.send('current-browser-info', {
        browserName,
        title,
        url,
        isGoogleDocs,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('브라우저 정보 요청 처리 오류:', error);
      event.sender.send('current-browser-info', {
        browserName: null,
        title: null,
        url: null,
        isGoogleDocs: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  });

  console.log('브라우저 정보 IPC 핸들러 등록 완료');
  return true;
}

// 주기적인 캐시 정리 (10분마다)
setInterval(cleanupUrlCache, 10 * 60 * 1000);

// 브라우저 감지 함수들 내보내기
module.exports = {
  detectBrowserName,
  detectWebsiteCategory,
  detectUrlPatterns,
  isGoogleDocsWindow,
  getLastKnownBrowserInfo,
  getFallbackBrowserName,
  cleanupUrlCache,
  setupCurrentBrowserInfoHandler
};
