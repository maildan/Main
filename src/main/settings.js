const fs = require('fs');
const path = require('path');
const { settingsPath, appState } = require('./constants');
const { debugLog } = require('./utils');
const { app, nativeTheme } = require('electron');
const { ensureDirectoryExists } = require('./utils/filesystem');

/**
 * 설정 파일에서 설정 로드
 * @returns {Object} 로드된 설정 객체
 */
async function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const savedSettings = JSON.parse(data);
      
      // 설정 병합 (기본값 유지)
      appState.settings = {
        ...appState.settings,
        ...savedSettings
      };
      
      debugLog('설정 파일 로드됨:', settingsPath);
      return appState.settings;
    }
  } catch (err) {
    console.error('설정 로드 중 오류:', err);
  }
  
  debugLog('설정 파일이 없거나 손상되었음. 기본값 사용');
  return appState.settings || defaultSettings;
}

/**
 * 현재 설정을 파일에 저장
 * @param {Object} newSettings - 저장할 새 설정 객체
 * @returns {Object} 저장된 설정 객체
 */
async function saveSettings(newSettings = null) {
  try {
    // 새 설정이 제공된 경우 현재 설정과 병합
    if (newSettings) {
      appState.settings = {
        ...appState.settings,
        ...newSettings
      };
    }
    
    // 저장하기 전에 디렉토리가 존재하는지 확인
    const settingsDir = path.dirname(settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(appState.settings, null, 2), 'utf8');
    debugLog('설정 저장됨:', settingsPath);
    return appState.settings;
  } catch (err) {
    console.error('설정 저장 중 오류:', err);
    return appState.settings || defaultSettings;
  }
}

/**
 * 다크 모드 설정 적용
 * @param {boolean} isDarkMode - 다크 모드 활성화 여부
 * @param {BrowserWindow} mainWindow - 적용할 메인 윈도우 인스턴스
 */
async function applyDarkMode(isDarkMode, mainWindow) {
  try {
    debugLog(`다크 모드 ${isDarkMode ? '활성화' : '비활성화'} 중...`);
    
    // 현재 설정 로드
    const settings = await loadSettings();
    
    // 설정 업데이트
    settings.darkMode = isDarkMode;
    
    // electron의 nativeTheme 설정
    nativeTheme.themeSource = isDarkMode ? 'dark' : 'light';
    
    // 설정 저장
    await saveSettings(settings);
    
    // 메인 윈도우가 있는 경우 렌더러에 테마 변경 이벤트 전송
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', isDarkMode ? 'dark' : 'light');
      
      // CSS 클래스 설정을 위한 스크립트 실행
      const script = `
        try {
          document.documentElement.classList.${isDarkMode ? 'add' : 'remove'}('dark');
          document.body.classList.${isDarkMode ? 'add' : 'remove'}('dark-mode');
        } catch(e) {
          console.error('테마 적용 중 오류:', e);
        }
      `;
      
      mainWindow.webContents.executeJavaScript(script)
        .then(() => debugLog('테마 CSS 클래스 적용 완료'))
        .catch(err => console.error('테마 CSS 클래스 적용 중 오류:', err));
    }
    
    return isDarkMode;
  } catch (error) {
    console.error('다크 모드 적용 중 오류:', error);
    return isDarkMode;
  }
}

/**
 * 창 모드 적용 함수
 * @param {string} mode - 'windowed', 'fullscreen', 'fullscreen-auto-hide' 중 하나
 */
function applyWindowMode(mode) {
  if (!appState.mainWindow) return;
  
  debugLog('창 모드 적용:', mode);
  
  switch (mode) {
    case 'fullscreen':
      // 전체화면 모드
      if (process.platform === 'darwin') {
        appState.mainWindow.setFullScreen(true);
      } else {
        appState.mainWindow.setFullScreen(true);
        if (!appState.mainWindow.isFullScreen()) {
          appState.mainWindow.maximize();
        }
      }
      appState.mainWindow.setAutoHideMenuBar(true); // 메뉴바는 항상 자동 숨김
      appState.autoHideToolbar = false;
      break;
      
    case 'fullscreen-auto-hide':
      // 자동 숨김 모드 - 전체화면으로 전환하지 않고 현재 창 크기 유지
      // 전체화면 설정 제거 (이미 전체화면인 경우 창 모드로 복귀)
      if (appState.mainWindow.isFullScreen()) {
        appState.mainWindow.setFullScreen(false);
      }
      appState.mainWindow.setAutoHideMenuBar(true);
      appState.autoHideToolbar = true;
      
      // 웹 컨텐츠에 CSS를 주입하여 도구모음을 완전히 숨기고 여백을 제거
      const autoHideCss = `
        body, html { 
          margin-top: 0 !important; 
          padding-top: 0 !important; 
        }
        
        /* 애플리케이션 전체에 다크 모드 적용 */
        body.dark-mode {
          --background-color: #121212 !important;
          --text-color: #e0e0e0 !important;
          --card-bg: #1e1e1e !important;
          background-color: #121212 !important;
          color: #e0e0e0 !important;
        }
        
        /* 앱 헤더 완전히 제거(오직 커스텀 헤더만 사용) */
        header.appHeader, 
        .appHeader, 
        [class*="appHeader"] { 
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 메인 컨텐츠의 상단 여백 제거 */
        .mainContent, 
        [class*="mainContent"],
        main, 
        .container, 
        [class*="container"] { 
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
      `;
      
      // 이전 CSS 키를 저장하고 나중에 제거할 수 있도록 함
      try {
        if (appState.autoHideCssKey) {
          appState.mainWindow.webContents.removeInsertedCSS(appState.autoHideCssKey);
          appState.autoHideCssKey = null;
        }
        
        appState.mainWindow.webContents.insertCSS(autoHideCss)
          .then(key => {
            appState.autoHideCssKey = key;
            debugLog('자동 숨김 CSS 주입 완료');
          })
          .catch(error => {
            debugLog('CSS 주입 오류:', error);
          });
      } catch (error) {
        debugLog('CSS 처리 오류:', error);
      }
      break;
      
    case 'windowed':
    default:
      // 일반 창 모드
      if (appState.mainWindow.isFullScreen()) {
        appState.mainWindow.setFullScreen(false);
      }
      appState.mainWindow.setAutoHideMenuBar(true); // 메뉴바는 항상 자동 숨김
      appState.autoHideToolbar = false;
      
      // 이전에 주입한 CSS 제거 시도
      try {
        if (appState.autoHideCssKey) {
          appState.mainWindow.webContents.removeInsertedCSS(appState.autoHideCssKey);
          appState.autoHideCssKey = null;
        }
      } catch (error) {
        // CSS 키를 저장하지 않았으므로 제거할 수 없는 경우 무시
      }
  }
  
  appState.windowMode = mode;
  
  // 상태 업데이트 - 렌더러에 통지
  if (appState.mainWindow && appState.mainWindow.webContents) {
    // 웹 컨텐츠에 창 모드 변경 이벤트 전송
    appState.mainWindow.webContents.send('window-mode-status', {
      mode: mode,
      autoHideToolbar: appState.autoHideToolbar
    });
  }
}

// 기본 설정값
const defaultSettings = {
  windowMode: 'windowed',
  darkMode: false, // 기본값은 라이트 모드
  minimizeToTray: true,
  startMinimized: false,
  autoLaunch: false,
  alwaysOnTop: false,
  notifications: true,
  updates: {
    checkAutomatically: true,
    installAutomatically: false
  },
  windowBounds: {
    width: 1200,
    height: 800
  },
  // 필요한 다른 설정들 추가
};

// 현재 설정
let currentSettings = null;

// 설정 초기화
function initSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      currentSettings = { ...defaultSettings, ...JSON.parse(data) };
    } else {
      currentSettings = { ...defaultSettings };
    }
    
    // 설정된 다크 모드 값을 시스템에 적용
    if (currentSettings.darkMode !== undefined) {
      nativeTheme.themeSource = currentSettings.darkMode ? 'dark' : 'light';
    }
  } catch (error) {
    console.error('설정 초기화 중 오류:', error);
    currentSettings = { ...defaultSettings };
  }
  return currentSettings;
}

// 설정 초기화 실행
currentSettings = initSettings();

/**
 * 다크 모드 상태 가져오기
 * @returns {boolean} 다크 모드 활성화 여부
 */
function getDarkMode() {
  // 설정에서 다크 모드 값을 가져오고, 없으면 OS 기본값 사용
  return currentSettings.darkMode !== undefined ? currentSettings.darkMode : nativeTheme.shouldUseDarkColors;
}

module.exports = {
  getSettings: () => currentSettings,
  getSetting: (key) => currentSettings[key],
  saveSettings,
  loadSettings,
  applyWindowMode,
  applyDarkMode,
  getDarkMode
};
