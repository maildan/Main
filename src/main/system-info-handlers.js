/**
 * 시스템 정보 관련 IPC 핸들러
 * 
 * 브라우저 정보, 디버그 정보 등 시스템 관련 정보를 제공하는 핸들러를 처리합니다.
 */
const { ipcMain, app, dialog } = require('electron');
const activeWin = require('active-win');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, exec } = require('child_process');

// 권한 오류 알림을 한 번만 표시하기 위한 상태 변수
let permissionErrorShown = false;
let isInFallbackMode = false;

// 마지막 권한 확인 시간
let lastPermissionCheckTime = 0;
const PERMISSION_CHECK_COOLDOWN = 5000; // 5초 간격으로만 재확인

// 권한 관련 앱 정보를 저장하는 객체
const permissionApps = {
  terminal: {
    name: 'Terminal',
    path: '/Applications/Utilities/Terminal.app',
    required: process.env.TERM_PROGRAM === 'Apple_Terminal',
    granted: false
  },
  iterm: {
    name: 'iTerm',
    path: '/Applications/iTerm.app',
    required: process.env.TERM_PROGRAM === 'iTerm.app',
    granted: false
  },
  vscode: {
    name: 'Visual Studio Code',
    path: '/Applications/Visual Studio Code.app',
    required: process.env.TERM_PROGRAM === 'vscode',
    granted: false
  },
  cursor: {
    name: 'Cursor',
    path: '/Applications/Cursor.app',
    required: process.env.TERM_PROGRAM?.includes('Cursor'),
    granted: false
  }
};

/**
 * TCC 데이터베이스에서 화면 기록 권한 정보를 읽습니다.
 * macOS에서만 동작합니다.
 * 
 * @returns {Promise<Array<string>>} TCC 권한 정보 목록
 */
async function getTccDatabaseInfo() {
  if (process.platform !== 'darwin') {
    return ['TCC 데이터베이스는 macOS에서만 지원됩니다.'];
  }
  
  const tccInfoLines = [];
  
  try {
    // TCC 데이터베이스 파일 경로
    const tccDbPath = path.join(os.homedir(), 'Library/Application Support/com.apple.TCC/TCC.db');
    
    // 파일 존재 여부 확인
    const dbExists = fs.existsSync(tccDbPath);
    tccInfoLines.push(`TCC 데이터베이스 존재: ${dbExists ? '예' : '아니오'} (${tccDbPath})`);
    
    if (dbExists) {
      try {
        // sqlite3 명령이 있는지 확인 (권한은 필요 없음)
        const sqliteCheck = execSync('which sqlite3').toString().trim();
        tccInfoLines.push(`sqlite3 경로: ${sqliteCheck}`);
        
        // TCC 데이터베이스 조회 시도 (권한이 필요할 수 있음)
        try {
          // 화면 기록 관련 권한 항목만 조회
          const query = 'SELECT client, auth_value, last_modified FROM access WHERE service=\'kTCCServiceScreenCapture\'';
          const result = execSync(`sqlite3 "${tccDbPath}" "${query}"`).toString();
          
          if (result.trim()) {
            tccInfoLines.push('화면 기록 권한이 부여된 앱:');
            const lines = result.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                // 앱 경로|권한값|마지막 수정 시간
                const [app, auth, modified] = line.split('|');
                const appName = path.basename(app, '.app');
                const authStatus = auth === '1' ? '허용됨' : '거부됨';
                tccInfoLines.push(`- ${appName}: ${authStatus} (${app})`);
              }
            });
          } else {
            tccInfoLines.push('화면 기록 권한이 부여된 앱이 없습니다.');
          }
        } catch (sqlError) {
          tccInfoLines.push(`TCC 데이터베이스 쿼리 오류: ${sqlError.message}`);
        }
      } catch (err) {
        tccInfoLines.push(`sqlite3 명령을 찾을 수 없음: ${err.message}`);
      }
    }
  } catch (error) {
    tccInfoLines.push(`TCC 정보 조회 오류: ${error.message}`);
  }
  
  return tccInfoLines;
}

/**
 * 특정 확장 프로그램이 설치되어 있는지 확인합니다.
 * 
 * @returns {Object} 설치된 확장 프로그램 정보
 */
function checkInstalledExtensions() {
  const extensions = {
    betterTouchTool: false,
    bartender: false,
    alfred: false,
    cleanshot: false
  };
  
  try {
    if (process.platform === 'darwin') {
      // 일반적인 확장 프로그램 경로 확인
      const appPaths = {
        betterTouchTool: '/Applications/BetterTouchTool.app',
        bartender: '/Applications/Bartender 4.app',
        alfred: '/Applications/Alfred 4.app',
        cleanshot: '/Applications/CleanShot X.app'
      };
      
      // 확장 프로그램 설치 여부 확인
      for (const [key, path] of Object.entries(appPaths)) {
        extensions[key] = fs.existsSync(path);
      }
    }
  } catch (error) {
    debugLog(`확장 프로그램 확인 오류: ${error.message}`);
  }
  
  return extensions;
}

/**
 * macOS 버전을 가져옵니다.
 * 
 * @returns {string} macOS 버전 문자열 또는 오류 메시지
 */
function getMacOSVersion() {
  if (process.platform !== 'darwin') {
    return '해당 없음 (macOS 아님)';
  }
  
  try {
    return execSync('sw_vers -productVersion').toString().trim();
  } catch (error) {
    return `확인 실패: ${error.message}`;
  }
}

/**
 * 앱이 실행 중인 환경 정보를 수집합니다.
 * 
 * @returns {Object} 실행 환경 정보
 */
function getExecutionContext() {
  return {
    shell: process.env.SHELL || '알 수 없음',
    termProgram: process.env.TERM_PROGRAM || '알 수 없음',
    user: process.env.USER || os.userInfo().username || '알 수 없음',
    cwd: process.cwd() || '알 수 없음',
    appPath: app.getAppPath() || '알 수 없음'
  };
}

/**
 * 권한 상태를 확인하고 앱 목록을 업데이트합니다.
 * 
 * @returns {Object} 업데이트된 권한 상태 정보
 */
async function checkPermissionStatus() {
  // 현재 시간 기록 (너무 자주 호출되는 것 방지)
  const now = Date.now();
  if (now - lastPermissionCheckTime < PERMISSION_CHECK_COOLDOWN) {
    debugLog(`권한 확인 쿨다운 중: ${(PERMISSION_CHECK_COOLDOWN - (now - lastPermissionCheckTime)) / 1000}초 남음`);
    return { throttled: true, lastCheck: lastPermissionCheckTime };
  }
  
  lastPermissionCheckTime = now;
  
  try {
    // 권한이 필요한 앱 목록 초기화
    const requiredApps = [];
    for (const [key, app] of Object.entries(permissionApps)) {
      if (app.required) {
        requiredApps.push({
          name: app.name,
          path: app.path,
          granted: false
        });
      }
    }
    
    let screenCaptureSuccess = false;
    let screenCaptureError = null;
    
    try {
      // active-win으로 권한 확인
      const windowInfo = await activeWin();
      screenCaptureSuccess = !!windowInfo;
      
      debugLog(`active-win 결과: ${JSON.stringify(windowInfo ? { 
        title: windowInfo.title,
        owner: windowInfo.owner?.name
      } : { error: 'windowInfo null' })}`);
      
      // 모든 필수 앱에 권한이 있는 것으로 간주
      if (screenCaptureSuccess) {
        requiredApps.forEach(app => {
          app.granted = true;
        });
      }
    } catch (error) {
      screenCaptureError = error.message || '알 수 없는 오류';
      debugLog(`active-win 오류: ${screenCaptureError}`);
      
      // 권한 오류인지 확인
      const isPermissionError = 
        error.message?.includes('permission') || 
        error.message?.includes('recording') ||
        error.message?.includes('Privacy');
      
      if (isPermissionError && !permissionErrorShown && !isInFallbackMode) {
        permissionErrorShown = true;
        isInFallbackMode = true;
        
        // 메인 윈도우가 있으면 알림 전송
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('permission-error', {
            code: 'SCREEN_RECORDING',
            message: '화면 기록 권한이 필요합니다',
            detail: '현재 활성 창을 감지하기 위해 화면 기록 권한이 필요합니다.',
            requiredApps
          });
        }
      }
    }
    
    return {
      timestamp: now,
      screenCapturePermission: {
        granted: screenCaptureSuccess,
        reason: screenCaptureError,
      },
      requiredApps
    };
  } catch (error) {
    debugLog(`권한 상태 확인 오류: ${error.message}`);
    return {
      timestamp: now,
      error: error.message,
      screenCapturePermission: {
        granted: false,
        reason: `권한 상태 확인 중 오류: ${error.message}`,
      }
    };
  }
}

/**
 * IPC 핸들러 등록
 */
function setupSystemInfoHandlers() {
  // 핸들러 중복 등록 방지
  try {
    ipcMain.removeHandler('get-browser-info');
    ipcMain.removeHandler('get-system-info');
    ipcMain.removeHandler('get-debug-info');
    ipcMain.removeHandler('get-permission-details');
    ipcMain.removeHandler('retry-permission-check');
  } catch (error) {
    // 무시
  }
  
  // 브라우저 정보 요청 핸들러
  ipcMain.handle('get-browser-info', async () => {
    try {
      const { detectBrowserName } = require('../browser');
      const activeWin = require('active-win');
      
      let windowInfo;
      try {
        windowInfo = await activeWin();
        if (!windowInfo) return { error: 'No active window' };
      } catch (windowError) {
        return {
          error: windowError.message,
          fallback: true,
        };
      }
      
      const browserName = detectBrowserName(windowInfo);
      return {
        name: browserName,
        title: windowInfo.title,
        url: windowInfo.url
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  // 시스템 정보 요청 핸들러
  ipcMain.handle('get-system-info', async () => {
    try {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  // 디버그 정보 요청 핸들러
  ipcMain.handle('get-debug-info', async () => {
    try {
      return {
        appPath: app.getAppPath(),
        appData: app.getPath('userData'),
        isPackaged: app.isPackaged,
        locale: app.getLocale(),
        processType: process.type,
        sandboxed: process.sandboxed,
        resourceUsage: process.getProcessMemoryInfo ? await process.getProcessMemoryInfo() : null
      };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  // 권한 상세 정보 요청 핸들러
  ipcMain.handle('get-permission-details', async () => {
    try {
      // 권한 상태 확인
      const permissionStatus = await checkPermissionStatus();
      
      // TCC 데이터베이스 정보 조회
      const tccPermissionInfo = await getTccDatabaseInfo();
      
      // 추가 시스템 정보 수집
      const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        macOSVersion: getMacOSVersion(),
        tccDatabasePath: process.platform === 'darwin' ? 
          path.join(os.homedir(), 'Library/Application Support/com.apple.TCC/TCC.db') : null,
        tccDatabaseExists: process.platform === 'darwin' ? 
          fs.existsSync(path.join(os.homedir(), 'Library/Application Support/com.apple.TCC/TCC.db')) : false,
        extensionCheck: checkInstalledExtensions()
      };
      
      // 실행 환경 정보 수집
      const executionContext = getExecutionContext();
      
      return {
        success: true,
        timestamp: Date.now(),
        ...permissionStatus,
        executionContext,
        systemInfo,
        tccPermissionInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  });
  
  // 권한 재확인 핸들러
  ipcMain.handle('retry-permission-check', async () => {
    try {
      // 마지막 확인 시간 리셋 (강제 재확인)
      lastPermissionCheckTime = 0;
      permissionErrorShown = false;
      isInFallbackMode = false;
      
      // 권한 상태 다시 확인
      console.log('권한 상태 재확인 시도...');
      const permissionStatus = await checkPermissionStatus();
      
      // 권한 확인 결과에 따라 웹뷰에 상태 업데이트 알림
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        appState.mainWindow.webContents.send('permission-status-update', {
          code: 'SCREEN_RECORDING',
          granted: permissionStatus.screenCapturePermission?.granted || false,
          timestamp: Date.now()
        });
      }
      
      return {
        success: true,
        permissionStatus: permissionStatus.screenCapturePermission,
        requiredApps: permissionStatus.requiredApps || [],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('권한 재확인 핸들러 오류:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  });
  
  console.log('시스템 정보 관련 IPC 핸들러 등록 완료');
}

module.exports = {
  setupSystemInfoHandlers
}; 