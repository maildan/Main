const fs = require('fs');
const { settingsPath, appState } = require('./constants');
const { debugLog } = require('./utils');

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
function saveSettings() {
  try {
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
      appState.mainWindow.setFullScreen(true);
      appState.autoHideToolbar = false;
      break;
      
    case 'fullscreen-auto-hide':
      // 자동 숨김 모드 (창 모드에서 동작)
      appState.mainWindow.setFullScreen(false);
      if (appState.mainWindow.isMaximized()) {
        // 이미 최대화되어 있으면 그대로 유지
      } else {
        appState.mainWindow.maximize();
      }
      appState.autoHideToolbar = true;
      break;
      
    case 'windowed':
    default:
      // 일반 창 모드
      appState.mainWindow.setFullScreen(false);
      appState.autoHideToolbar = false;
  }
  
  // 상태 업데이트 - 렌더러에 통지
  if (appState.mainWindow && appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('window-mode-status', {
      mode: mode,
      autoHideToolbar: appState.autoHideToolbar
    });
  }
}

module.exports = {
  loadSettings,
  saveSettings,
  applyWindowMode
};
