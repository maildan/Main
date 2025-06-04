const { 
  BROWSER_PROCESS_NAMES, 
  BROWSER_DISPLAY_NAMES,
  WEBSITE_URL_PATTERNS, 
  GOOGLE_DOCS_URL_PATTERNS,
  GOOGLE_DOCS_TITLE_PATTERNS,
  SUPPORTED_WEBSITES,
  appState,
  SPECIAL_KEYS
} = require('./constants');
const { debugLog } = require('./utils');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const url = require('url');
const activeWin = require('active-win');
const { execSync } = require('child_process');
const fs = require('fs');

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
const URL_CACHE_TTL = 60 * 60 * 1000; // 1시간

// 브라우저별 AppleScript 명령어
const BROWSER_APPLESCRIPTS = {
  'Safari': 'tell application "Safari" to return URL of front document',
  'Google Chrome': 'tell application "Google Chrome" to return URL of active tab of front window',
  'Microsoft Edge': 'tell application "Microsoft Edge" to return URL of active tab of front window',
  'Firefox': 'tell application "Firefox" to return URL of front window',
  'Opera': 'tell application "Opera" to return URL of active tab of front window',
  'Brave Browser': 'tell application "Brave Browser" to return URL of active tab of front window',
  'ZenBrowser': 'tell application "Zen Browser" to return URL of active tab of front window'
};

// 앱 이름 매핑 테이블 (프로세스 이름 -> 표준화된 앱 이름)
const APP_NAME_MAPPING = {
  'googlechrome': 'Google Chrome',
  'chrome': 'Google Chrome',
  'msedge': 'Microsoft Edge',
  'firefox': 'Firefox',
  'safari': 'Safari',
  'opera': 'Opera',
  'brave browser': 'Brave Browser',
  'brave': 'Brave Browser',
  'zenbrowser': 'Zen Browser',
  'zen browser': 'Zen Browser',
  'zen': 'Zen Browser',
  'notion': 'Notion',
  'discord': 'Discord',
  'slack': 'Slack',
  'microsoft teams': 'Microsoft Teams',
  'teams': 'Microsoft Teams',
  'zoom': 'Zoom',
  'vscode': 'VS Code',
  'visual studio code': 'VS Code'
};

// 비브라우저 앱의 특수 처리 목록
const NON_BROWSER_APPS = [
  'Notion',
  'Discord',
  'Slack',
  'Microsoft Teams',
  'Zoom',
  'VS Code'
];

/**
 * URL 캐시 관리
 * @param {string} url - 캐시할 URL
 * @param {string} category - URL의 카테고리
 */
function cacheUrl(url, category) {
  if (!url || !category || urlCache.size >= URL_CACHE_MAX_SIZE) return;
  
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
  if (!url || !urlCache.has(url)) return null;
  
  const cached = urlCache.get(url);
  
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
  if (!windowInfo) return null;
  
  try {
    // 1. 앱 이름 또는 프로세스 이름에서 브라우저 감지
    const appName = windowInfo.owner?.name?.toLowerCase() || '';
    const processName = windowInfo.owner?.processName?.toLowerCase() || '';
    const executablePath = windowInfo.owner?.path || '';
    
    // 표준화된 앱 이름 가져오기
    let browserName = getBrowserNameFromProcess(processName, executablePath) || 
                      getBrowserNameFromProcess(appName, executablePath);
    
    // 2. 비브라우저 앱인 경우 해당 앱 이름 반환
    if (browserName && NON_BROWSER_APPS.includes(browserName)) {
      return browserName;
    }
    
    // 3. URL이 있으면 URL 기반의 웹사이트 카테고리 감지
      if (windowInfo.url) {
      const urlCategory = detectWebsiteCategory(windowInfo.url);
      
      // URL이 특정 웹사이트로 감지되면, 브라우저 이름과 함께 반환
      if (urlCategory) {
        debugLog(`URL 기반 웹사이트 감지: ${urlCategory} (브라우저: ${browserName || '알 수 없음'})`);
        return browserName || urlCategory;
      }
    }
    
    // 4. 창 제목에서 패턴 감지 (브라우저 탭 제목에 포함된 웹사이트 이름)
    if (windowInfo.title) {
      // 브라우저 탭 제목에서 웹사이트 이름 감지
      const titleParts = windowInfo.title.split(' - ');
      const lastPart = titleParts[titleParts.length - 1]; // 보통 브라우저 이름은 마지막 부분에 있음
      
      // 브라우저 이름이 타이틀의 마지막에 있는지 확인
      if (lastPart && Object.values(APP_NAME_MAPPING).some(name => lastPart.includes(name))) {
        const siteName = titleParts[0]; // 사이트 이름은 첫 부분에 있을 수 있음
        
        // 웹사이트 카테고리 감지
        for (const [key, patterns] of Object.entries(SUPPORTED_WEBSITES)) {
          // patterns가 배열인지 확인하고 각 pattern이 문자열인지 검사
          if (Array.isArray(patterns) && 
              patterns.some(pattern => typeof pattern === 'string' && siteName.toLowerCase().includes(pattern.toLowerCase()))) {
            debugLog(`타이틀 기반 웹사이트 감지: ${key} (브라우저: ${browserName || '알 수 없음'})`);
            return browserName || key;
          } else if (patterns && typeof patterns === 'object') {
            // patterns가 객체 배열인 경우 (pattern 속성이 있는 객체)
            const matches = patterns.some(item => {
              if (item && typeof item.pattern === 'string') {
                return siteName.toLowerCase().includes(item.pattern.toLowerCase());
              }
              return false;
            });
            
            if (matches) {
              debugLog(`타이틀 기반 웹사이트 감지(객체): ${key} (브라우저: ${browserName || '알 수 없음'})`);
              return browserName || key;
            }
    }
        }
      }
    }
    
    // 브라우저 이름 반환
    return browserName;
  } catch (error) {
    console.error('브라우저 이름 감지 오류:', error);
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
  if (!processName) return null;
    
  // 프로세스 이름을 소문자로 변환
  const lowerProcessName = processName.toLowerCase();
  
  // APP_NAME_MAPPING에서 직접 매칭되는 이름 찾기
  if (APP_NAME_MAPPING[lowerProcessName]) {
    return APP_NAME_MAPPING[lowerProcessName];
  }
  
  // 부분 일치 확인
  for (const [key, value] of Object.entries(APP_NAME_MAPPING)) {
    if (lowerProcessName.includes(key)) {
      return value;
      }
    }
    
  // 실행 파일 경로에서 확인
    if (processPath) {
    const fileName = path.basename(processPath).toLowerCase();
      
    if (fileName.includes('chrome')) return 'Google Chrome';
    if (fileName.includes('msedge')) return 'Microsoft Edge';
    if (fileName.includes('firefox')) return 'Firefox';
    if (fileName.includes('safari')) return 'Safari';
    if (fileName.includes('opera')) return 'Opera';
    if (fileName.includes('brave')) return 'Brave Browser';
    if (fileName.includes('zen')) return 'Zen Browser';
    if (fileName.includes('notion')) return 'Notion';
    if (fileName.includes('discord')) return 'Discord';
    if (fileName.includes('slack')) return 'Slack';
    if (fileName.includes('teams')) return 'Microsoft Teams';
      }
  
  // 프로세스 이름에서 특정 패턴 확인
  if (lowerProcessName.includes('chrome')) return 'Google Chrome';
  if (lowerProcessName.includes('edge')) return 'Microsoft Edge';
  if (lowerProcessName.includes('firefox')) return 'Firefox';
  if (lowerProcessName.includes('safari')) return 'Safari';
  if (lowerProcessName.includes('opera')) return 'Opera';
  if (lowerProcessName.includes('brave')) return 'Brave Browser';
  if (lowerProcessName.includes('zen')) return 'Zen Browser';
  if (lowerProcessName.includes('notion')) return 'Notion';
  if (lowerProcessName.includes('discord')) return 'Discord';
  if (lowerProcessName.includes('slack')) return 'Slack';
  if (lowerProcessName.includes('teams')) return 'Microsoft Teams';
  
    return null;
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
    if (!windowInfo) return false;
    
  // URL이 있으면 직접 확인
    if (windowInfo.url) {
    try {
      const url = new URL.URL(windowInfo.url);
      return url.hostname === 'docs.google.com';
    } catch (error) {
      // URL 파싱 오류, 타이틀 확인으로 진행
      }
    }
    
  // 타이틀로 확인
    if (windowInfo.title) {
      const title = windowInfo.title.toLowerCase();
    return title.includes('google docs') || title.includes('문서 - google');
    }
    
    return false;
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
  try {
    // 1. 먼저 가장 최근 캐시된 브라우저 정보 사용 시도
    const lastKnownInfo = getLastKnownBrowserInfo();
    if (lastKnownInfo && lastKnownInfo.browserName) {
      debugLog('getFallbackBrowserName: 캐시된 브라우저 정보 사용');
      return lastKnownInfo.browserName;
    }

    // 2. macOS에서는 lsappinfo 명령어로 활성 앱 확인 시도
  if (process.platform === 'darwin') {
    try {
        // 'lsappinfo info -only name `lsappinfo front`' 명령어로 현재 활성 앱 이름 가져오기
        const frontAppCmd = execSync('lsappinfo front').toString().trim();
        const frontAppInfoCmd = execSync(`lsappinfo info -only name ${frontAppCmd}`).toString().trim();
        
        // 출력에서 앱 이름 추출 (예: "name="Safari"")
        const nameMatch = frontAppInfoCmd.match(/name="([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
          const appName = nameMatch[1];
          debugLog(`getFallbackBrowserName: lsappinfo로 앱 감지: ${appName}`);
          
          // 알려진 브라우저 앱 목록에서 확인
          for (const [key, displayName] of Object.entries(BROWSER_DISPLAY_NAMES)) {
            if (appName.toLowerCase().includes(key.toLowerCase()) || 
                displayName.toLowerCase().includes(appName.toLowerCase())) {
              return displayName;
            }
          }
          
          // 일반 앱 이름 반환 (브라우저가 아닐 수도 있음)
          return appName;
        }
      } catch (cmdError) {
        debugLog(`lsappinfo 명령어 실행 오류: ${cmdError.message}`);
        
        // lsappinfo 실패 시 ps 명령어로 대체 시도
        try {
          // 'ps -xc -o command | grep -E "Chrome|Safari|Firefox|Edge|Opera|Brave" | head -1' 명령어로 
          // 실행 중인 브라우저 프로세스 찾기
          const psCommand = 'ps -xc -o command | grep -E "chrome|safari|firefox|edge|opera|brave" | head -1';
          const psResult = execSync(psCommand).toString().trim();
          
          if (psResult) {
            const browserProcess = psResult.toLowerCase();
            debugLog(`getFallbackBrowserName: ps 명령어로 브라우저 감지: ${browserProcess}`);
            
            if (browserProcess.includes('chrome')) return 'Google Chrome';
            if (browserProcess.includes('safari')) return 'Safari';
            if (browserProcess.includes('firefox')) return 'Firefox';
            if (browserProcess.includes('edge')) return 'Microsoft Edge';
            if (browserProcess.includes('opera')) return 'Opera';
            if (browserProcess.includes('brave')) return 'Brave Browser';
          }
        } catch (psError) {
          debugLog(`ps 명령어 실행 오류: ${psError.message}`);
          // ps 명령어도 실패하면 다음 방법으로 진행
        }
      }
      
      // 3. macOS 기본 앱 사용 빈도에 따른 우선순위로 추정
      debugLog('getFallbackBrowserName: 기본 브라우저 추정');
      
      // macOS에서 일반적으로 많이 사용되는 브라우저 순서로 추정
      const commonBrowsers = ['Safari', 'Google Chrome', 'Firefox', 'Microsoft Edge', 'Brave Browser'];
      
      for (const browser of commonBrowsers) {
        // 브라우저 앱 존재 여부 확인
        try {
          const appPath = browser === 'Safari' 
            ? '/Applications/Safari.app' 
            : `/Applications/${browser.replace(' ', '')}.app`;
          
          const exists = fs.existsSync(appPath);
          if (exists) {
            debugLog(`getFallbackBrowserName: 설치된 브라우저 감지됨: ${browser}`);
            return browser;
          }
    } catch (error) {
          // 확인 중 오류 무시하고 계속 진행
        }
      }
      
      // 기본값으로 Safari 반환 (macOS의 기본 브라우저)
      debugLog('getFallbackBrowserName: macOS에서 Safari로 가정');
      return 'Safari';
    } else if (process.platform === 'win32') {
      // Windows에서는 'Chrome'으로 가정
      debugLog('getFallbackBrowserName: Windows에서 Chrome으로 가정');
      return 'Chrome';
    } else {
      // Linux 및 기타 OS
      debugLog('getFallbackBrowserName: 기타 플랫폼에서 Chrome으로 가정');
      return 'Chrome';
    }
  } catch (error) {
    console.error('getFallbackBrowserName 오류:', error);
    return 'Unknown Browser';
  }
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
  let fallbackModeEnabled = false;
  let lastErrorMessage = '';
  let errorCount = 0;
  const MAX_ERRORS_BEFORE_FALLBACK = 3;
  const ERROR_RESET_INTERVAL = 30 * 60 * 1000; // 30분
  let lastErrorTime = 0;
  let permissionAlertShown = false; // 권한 알림 표시 여부
  
  // 브라우저 정보 업데이트 간격 (ms)
  const BROWSER_INFO_UPDATE_INTERVAL = 2000; // 2초
  
  // 주기적으로 브라우저 정보 업데이트
  const updateInterval = setInterval(async () => {
    try {
      if (fallbackModeEnabled) {
        // 폴백 모드에서는 간격을 늘려 시도
        const now = Date.now();
        if (now - lastErrorTime < ERROR_RESET_INTERVAL) {
          // 폴백 모드 유지 중인 경우에도 lsappinfo 명령어로 앱 정보 가져오기 시도
          try {
            const fallbackBrowserName = getFallbackBrowserName();
            if (fallbackBrowserName) {
              currentBrowserInfo = {
                browserName: fallbackBrowserName,
                title: '(폴백 모드)',
                url: '',
                timestamp: Date.now(),
                fallbackMode: true,
                error: lastErrorMessage,
                fromFallback: true
              };
              
              // 메인 윈도우가 있을 때만 이벤트 전송
              if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
                appState.mainWindow.webContents.send('browser-info-update', currentBrowserInfo);
              }
            }
          } catch (fallbackError) {
            debugLog(`폴백 모드에서 브라우저 정보 가져오기 실패: ${fallbackError.message}`);
  }
          return; // 오류 발생 후 일정 시간 동안은 재시도하지 않음
        }
        
        // 폴백 모드에서도 가끔 다시 시도
        debugLog('브라우저 감지: 폴백 모드 해제, 정상 감지 재시도');
        errorCount = 0;
        fallbackModeEnabled = false;
      }
      
      // active-win 모듈로 현재 활성 창 가져오기
      const windowInfo = await activeWin();
      
      if (!windowInfo) {
        debugLog('브라우저 감지: 활성 창 정보를 가져올 수 없음');
        return;
      }
      
      // 브라우저 이름과 URL 감지
      const browserName = detectBrowserName(windowInfo);
      let url = '';
      
      // macOS에서 URL 가져오기 추가 시도
      if (process.platform === 'darwin' && browserName) {
        url = getBrowserUrlWithAppleScript(browserName) || '';
      }
      
      if (browserName) {
        // 현재 브라우저 정보 저장
        currentBrowserInfo = {
          browserName,
          title: windowInfo.title || '',
          url: url || '',
          timestamp: Date.now(),
          owner: windowInfo.owner?.name || '',
          bundleId: windowInfo.owner?.bundleId || '',
          processId: windowInfo.owner?.processId || 0
      };
      
        // 성공적으로 정보를 가져왔으므로 오류 카운트 리셋
        errorCount = 0;
        lastErrorTime = 0;
        fallbackModeEnabled = false;
        permissionAlertShown = false;
        
        // 메인 윈도우가 있을 때만 이벤트 전송
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('browser-info-update', currentBrowserInfo);
        }
      }
    } catch (error) {
      const now = Date.now();
      errorCount++;
      lastErrorMessage = error.message;
      lastErrorTime = now;
      
      debugLog(`브라우저 감지 오류 (${errorCount}번째): ${error.message}`);
      
      // 권한 관련 오류인지 확인
      const isPermissionError = 
        error.message.includes('permission') || 
        error.message.includes('screen recording') || 
        error.message.includes('Privacy');
      
      if (isPermissionError) {
        debugLog('화면 기록 권한 문제 감지됨');
        
        // 모든 권한 오류는 즉시 폴백 모드로 전환
        fallbackModeEnabled = true;

        // 권한 문제 대화 상자 표시 (한 번만)
        if (appState.mainWindow && !appState.mainWindow.isDestroyed() && !permissionAlertShown) {
          permissionAlertShown = true;
          
          appState.mainWindow.webContents.send('permission-error', {
            code: 'SCREEN_RECORDING',
            message: '화면 기록 권한이 필요합니다',
            detail: `화면 기록 권한 오류: ${error.message}\n\n키보드 입력과 활성 창을 연결하기 위해 화면 기록 권한이 필요합니다. 시스템 설정에서 권한을 허용해주세요.\n\n권한을 허용한 뒤에는 로그아웃 후 다시 로그인하거나 시스템을 재부팅해야 합니다.`,
            fallbackEnabled: true,
            errorCount: errorCount
          });
          
          // 앱에서 볼 수 있는 권한 설정 대화 상자 표시
          if (errorCount > 1) {
            const dialogOptions = {
              type: 'info',
              title: '화면 기록 권한 필요',
              message: '키보드 모니터링을 위해 화면 기록 권한이 필요합니다',
              detail: '설정 > 개인 정보 보호 및 보안 > 화면 기록에서 Terminal 앱과 Electron 앱에 권한을 부여하세요. 권한 부여 후 로그아웃/로그인이 필요합니다.\n\n권한이 없는 경우 폴백 모드로 계속 실행됩니다.',
              buttons: ['설정 열기', '폴백 모드로 계속'],
              defaultId: 0,
              cancelId: 1
            };
      
      try {
              const response = dialog.showMessageBoxSync(appState.mainWindow, dialogOptions);
              if (response === 0) {
                // 시스템 설정 열기
                require('electron').shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
              }
            } catch (dialogError) {
              debugLog(`권한 대화 상자 표시 오류: ${dialogError.message}`);
            }
          }
        }
      }
      
      // 폴백 모드에서는 기본 브라우저 정보 제공
      if (fallbackModeEnabled) {
        // 폴백 브라우저 이름 가져오기
        const fallbackBrowserName = getFallbackBrowserName();
        
        // 폴백 정보 구성
        currentBrowserInfo = {
          browserName: fallbackBrowserName,
          title: '(폴백 모드 활성)',
          url: '',
          timestamp: Date.now(),
          fallbackMode: true,
          error: lastErrorMessage
        };
        
        // 메인 윈도우가 있을 때만 이벤트 전송
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('browser-info-update', currentBrowserInfo);
        }
      }
    }
  }, BROWSER_INFO_UPDATE_INTERVAL);
  
  // 애플리케이션 종료 시 인터벌 정리
  app.on('will-quit', () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
  
  // 브라우저 정보 요청 핸들러 등록
  ipcMain.handle('get-current-browser-info', async () => {
    try {
      // 이미 브라우저 정보가 있으면 바로 반환
      if (currentBrowserInfo && currentBrowserInfo.browserName) {
        return {
          ...currentBrowserInfo,
          fromCache: true
        };
      }
      
      // 아직 정보가 없으면 즉시 가져오기 시도
      let windowInfo;
      try {
        windowInfo = await activeWin();
      } catch (error) {
        // 권한 문제 또는 기타 오류 발생
        const fallbackBrowserName = getFallbackBrowserName();
        return {
          browserName: fallbackBrowserName,
          title: '(폴백 모드)',
          url: '',
          timestamp: Date.now(),
          fallbackMode: true,
          error: error.message
        };
      }
      
      // 정보를 가져왔으면 처리
      if (windowInfo) {
        const browserName = detectBrowserName(windowInfo);
        
        // 브라우저가 감지되면 정보 구성
        if (browserName) {
          // macOS에서 URL 가져오기 추가 시도
          let url = '';
          if (process.platform === 'darwin') {
            url = getBrowserUrlWithAppleScript(browserName) || '';
          }
          
          currentBrowserInfo = {
            browserName,
            title: windowInfo.title || '',
            url: url || '',
            timestamp: Date.now(),
            owner: windowInfo.owner?.name || '',
            bundleId: windowInfo.owner?.bundleId || '',
            processId: windowInfo.owner?.processId || 0
          };
          
          return currentBrowserInfo;
        }
      }
      
      // 모든 시도 실패, 폴백 반환
      return {
        browserName: getFallbackBrowserName(),
        title: '(폴백 모드)',
        url: '',
        timestamp: Date.now(),
        fallbackMode: true
      };
    } catch (error) {
      debugLog(`현재 브라우저 정보 요청 처리 중 오류: ${error.message}`);
      
      // 오류 발생 시 기본 정보 반환
      return {
        browserName: getFallbackBrowserName(),
        title: '(폴백 모드)',
        url: '',
        timestamp: Date.now(),
        fallbackMode: true,
        error: error.message
      };
    }
  });

  // 설정된 업데이트 인터벌 반환
  return updateInterval;
}

/**
 * macOS에서 AppleScript를 사용하여 특정 브라우저의 현재 URL을 가져옵니다.
 * @param {string} browserName - 브라우저 이름
 * @returns {string|null} 현재 URL 또는 null (오류 시)
 */
function getBrowserUrlWithAppleScript(browserName) {
  if (process.platform !== 'darwin') return null;
  if (!browserName || !BROWSER_APPLESCRIPTS[browserName]) return null;
  
  try {
    const script = BROWSER_APPLESCRIPTS[browserName];
    const result = execSync(`osascript -e '${script}'`, { timeout: 1000, encoding: 'utf8' });
    
    return result.trim();
  } catch (error) {
    debugLog(`AppleScript URL 가져오기 오류 (${browserName}): ${error.message}`);
    return null;
  }
}

// 주기적인 캐시 정리 (1시간마다)
setInterval(cleanupUrlCache, URL_CACHE_TTL);

/**
 * 브라우저 정보 가져오기 함수
 * IPC 핸들러에서 호출되어 현재 활성 브라우저 정보 반환
 */
async function getBrowserInfo(event) {
  try {
    // activeWin으로 현재 창 정보 확인
    let windowInfo;
    
    try {
      windowInfo = await activeWin();
    } catch (activeWinError) {
      // active-win 오류 발생 시 (권한 없음 등) 폴백 방식 사용
      debugLog(`active-win 오류 발생: ${activeWinError.message}`);
      
      const fallbackBrowserName = getFallbackBrowserName();
      
      // 마지막으로 알려진 정보와 폴백 정보 결합
      const lastKnown = getLastKnownBrowserInfo();
      
      return {
        name: fallbackBrowserName,
        isGoogleDocs: lastKnown.isGoogleDocs || false,
        title: '(폴백: 권한 필요)',
        url: null,
        fallback: true,
        error: activeWinError.message,
        timestamp: Date.now()
      };
    }
    
    if (!windowInfo) return { 
      name: getFallbackBrowserName(), 
      isGoogleDocs: false, 
      title: '브라우저 정보를 가져올 수 없습니다', 
      fallback: true,
      error: 'No active window'
    };
    
    const browserName = detectBrowserName(windowInfo);
    const isGoogleDocs = isGoogleDocsWindow(windowInfo);
    
    // URL 가져오기
    let url = windowInfo.url || null;
    if (!url && process.platform === 'darwin' && browserName) {
      url = getBrowserUrlWithAppleScript(browserName);
    }
    
    // 결과 저장
    const result = { 
      name: browserName, 
      isGoogleDocs, 
      title: windowInfo.title || null,
      url: url,
      timestamp: Date.now()
    };
    
    // 마지막으로 알려진 브라우저 정보 업데이트
    lastKnownBrowserInfo = result;
    
    return result;
  } catch (error) {
    console.error('브라우저 정보 가져오기 오류:', error);
    
    // 폴백: 마지막 알려진 정보 또는 기본값 반환
    const lastKnown = getLastKnownBrowserInfo();
    const fallbackName = getFallbackBrowserName();
    
    return {
      name: lastKnown.name || fallbackName,
      isGoogleDocs: lastKnown.isGoogleDocs || false,
      title: lastKnown.title || `${fallbackName} (폴백 모드)`,
      url: lastKnown.url || null,
      fallback: true,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// 브라우저 감지 함수들 내보내기
module.exports = {
  detectBrowserName,
  detectWebsiteCategory,
  detectUrlPatterns,
  isGoogleDocsWindow,
  getLastKnownBrowserInfo,
  getFallbackBrowserName,
  cleanupUrlCache,
  setupCurrentBrowserInfoHandler,
  getBrowserUrlWithAppleScript,
  getBrowserInfo
};
