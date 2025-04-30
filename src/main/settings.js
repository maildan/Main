const fs = require('fs');
const path = require('path');
const { settingsPath, appState } = require('./constants');
const { debugLog } = require('./utils');
const { app } = require('electron');

/**
 * 설정 파일에서 설정 로드
 * @returns {boolean} 설정 로드 성공 여부
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
      return true;
    }
  } catch (err) {
    console.error('설정 로드 중 오류:', err);
  }
  
  debugLog('설정 파일이 없거나 손상되었음. 기본값 사용');
  return false;
}

/**
 * 현재 설정을 파일에 저장
 * @returns {boolean} 저장 성공 여부
 */
function saveSettings(newSettings = null) {
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
    return true;
  } catch (err) {
    console.error('설정 저장 중 오류:', err);
    return false;
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
  } catch (error) {
    console.error('설정 초기화 중 오류:', error);
    currentSettings = { ...defaultSettings };
  }
  return currentSettings;
}

// 설정 초기화 실행
currentSettings = initSettings();

module.exports = {
  getSettings: () => currentSettings,
  getSetting: (key) => currentSettings[key],
  saveSettings,
  loadSettings,
  applyWindowMode
};
