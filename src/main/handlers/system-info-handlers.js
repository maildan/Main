/**
 * 시스템 정보 관련 IPC 핸들러
 * 
 * 브라우저 정보, 디버그 정보, 권한 정보 등 시스템 관련 정보를 제공하는 핸들러를 처리합니다.
 */
const { ipcMain, app, dialog, shell } = require('electron');
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
    required: process.env.TERM_PROGRAM && process.env.TERM_PROGRAM.includes('Cursor'),
    granted: false
  },
  electron: {
    name: 'Electron',
    path: app.getPath('exe'),
    required: true,
    granted: false
  }
};

/**
 * TCC 데이터베이스에서 권한 정보 가져오기
 */
function getTCCPermissionInfo() {
  if (process.platform !== 'darwin') {
    return {
      tccDbPath: null,
      tccDbExists: false,
      tccInfo: []
    };
  }

  try {
    // TCC 데이터베이스 경로 (macOS 버전에 따라 다름)
    const homeDir = os.homedir();
    let tccDbPath = '';
    
    // macOS 버전 확인
    const osVersion = execSync('sw_vers -productVersion').toString().trim();
    const majorVersion = parseInt(osVersion.split('.')[0], 10);
    
    // macOS 11 이상은 다른 경로를 사용
    if (majorVersion >= 11) {
      tccDbPath = path.join(homeDir, 'Library/Application Support/com.apple.TCC/TCC.db');
    } else {
      tccDbPath = path.join(homeDir, 'Library/Application Support/com.apple.TCC/TCC.db');
    }

    const tccInfoLines = [];
    const tccDbExists = fs.existsSync(tccDbPath);
    
    if (tccDbExists) {
      tccInfoLines.push(`TCC 데이터베이스 경로: ${tccDbPath}`);
      
      // TCC 데이터베이스 권한 확인
      try {
        // TCC 데이터베이스 권한 확인 테스트
        execSync(`ls -la "${tccDbPath}"`, { stdio: 'pipe' });
        tccInfoLines.push('TCC 데이터베이스 접근 권한: 읽기 가능');
        
        // TCC 데이터베이스 조회 시도 (권한이 필요할 수 있음)
        try {
          // 화면 기록 관련 권한 항목만 조회
          const screenCaptureQuery = 'SELECT client, auth_value, last_modified FROM access WHERE service=\'kTCCServiceScreenCapture\'';
          const screenResult = execSync(`sqlite3 "${tccDbPath}" "${screenCaptureQuery}"`).toString();
          
          if (screenResult.trim()) {
            tccInfoLines.push('📷 화면 기록 권한이 부여된 앱:');
            const lines = screenResult.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                const [client, authValue, lastModified] = line.split('|').map(item => item.trim());
                const granted = authValue === '2' || authValue === '1';
                const date = new Date(lastModified * 1000).toLocaleString();
                tccInfoLines.push(`- ${client} (${granted ? '✅ 허용' : '❌ 거부'}, 마지막 변경: ${date})`);
              }
            });
          } else {
            tccInfoLines.push('❗ 화면 기록 권한이 부여된 앱이 없습니다.');
          }

          // 키보드 모니터링 권한 조회
          const keyboardQuery = 'SELECT client, auth_value, last_modified FROM access WHERE service=\'kTCCServiceListenEvent\'';
          const keyboardResult = execSync(`sqlite3 "${tccDbPath}" "${keyboardQuery}"`).toString();
          
          if (keyboardResult.trim()) {
            tccInfoLines.push('\n⌨️ 키보드 모니터링 권한이 부여된 앱:');
            const lines = keyboardResult.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                const [client, authValue, lastModified] = line.split('|').map(item => item.trim());
                const granted = authValue === '2' || authValue === '1';
                const date = new Date(lastModified * 1000).toLocaleString();
                tccInfoLines.push(`- ${client} (${granted ? '✅ 허용' : '❌ 거부'}, 마지막 변경: ${date})`);
              }
            });
          } else {
            tccInfoLines.push('❗ 키보드 모니터링 권한이 부여된 앱이 없습니다.');
          }

          // 앱 실행 상태 확인
          tccInfoLines.push('\n📊 Loop 관련 프로세스 실행 상태:');
          try {
            const psResult = execSync('ps -ef | grep -i "electron\\|loop" | grep -v grep').toString();
            const psLines = psResult.split('\n').filter(line => line.trim());
            if (psLines.length > 0) {
              psLines.forEach(line => {
                if (line.trim()) {
                  tccInfoLines.push(`- ${line.trim()}`);
                }
              });
            } else {
              tccInfoLines.push('- Loop 관련 프로세스를 찾을 수 없습니다.');
            }
          } catch (psError) {
            tccInfoLines.push(`- 프로세스 확인 중 오류: ${psError.message}`);
          }

          // TCC 데이터베이스 테이블 구조 조회
          const tableQuery = 'SELECT name FROM sqlite_master WHERE type=\'table\'';
          const tableResult = execSync(`sqlite3 "${tccDbPath}" "${tableQuery}"`).toString();
          tccInfoLines.push('\n🗃️ TCC 데이터베이스 테이블 목록:');
          tableResult.split('\n').forEach(table => {
            if (table.trim()) {
              tccInfoLines.push(`- ${table}`);
            }
          });

          // electron 앱에 대한 상세 권한 정보 조회
          tccInfoLines.push('\n🔍 Loop 앱 상세 권한 정보:');
          const ourAppPath = app.getPath('exe');
          const appQuery = 'SELECT service, client, auth_value, last_modified FROM access WHERE client LIKE \'%Electron%\' OR client LIKE \'%Loop%\'';
          
          try {
            const appResult = execSync(`sqlite3 "${tccDbPath}" "${appQuery}"`).toString();
            if (appResult.trim()) {
              const appLines = appResult.split('\n');
              appLines.forEach(line => {
                if (line.trim()) {
                  const [service, client, authValue, lastModified] = line.split('|').map(item => item.trim());
                  const granted = authValue === '2' || authValue === '1';
                  const date = new Date(lastModified * 1000).toLocaleString();
                  tccInfoLines.push(`- 서비스: ${service}, 앱: ${client}, 상태: ${granted ? '✅ 허용' : '❌ 거부'}, 마지막 변경: ${date}`);
                }
              });
            } else {
              tccInfoLines.push(`- Loop/Electron 관련 권한 정보를 찾을 수 없습니다. 앱 경로: ${ourAppPath}`);
            }
          } catch (appQueryError) {
            tccInfoLines.push(`- 앱 권한 조회 중 오류: ${appQueryError.message}`);
          }

          // 필요한 권한 목록 조회
          const requiredServices = ['kTCCServiceScreenCapture', 'kTCCServiceListenEvent', 'kTCCServiceAccessibility'];
          tccInfoLines.push('\n📋 Loop 앱에 필요한 권한 목록:');
          requiredServices.forEach(service => {
            tccInfoLines.push(`- ${service}`);
          });
        } catch (sqliteError) {
          tccInfoLines.push(`❌ TCC 데이터베이스 쿼리 실패: ${sqliteError.message || '알 수 없는 오류'}`);
        }
      } catch (permissionError) {
        tccInfoLines.push(`❌ TCC 데이터베이스 접근 권한 없음: ${permissionError.message || '권한 부족'}`);
      }
    } else {
      tccInfoLines.push(`❓ TCC 데이터베이스를 찾을 수 없음: ${tccDbPath}`);
    }
    
    return {
      tccDbPath,
      tccDbExists,
      tccInfo: tccInfoLines
    };
  } catch (error) {
    debugLog(`TCC 권한 정보 가져오기 실패: ${error.message}`);
    return {
      tccDbPath: null,
      tccDbExists: false,
      tccInfo: [`❌ TCC 정보 가져오기 오류: ${error.message || '알 수 없는 오류'}`]
    };
  }
}

/**
 * 맥에서 시스템 확장 프로그램 설치 여부 확인
 */
function checkMacExtensions() {
  if (process.platform !== 'darwin') {
    return {};
  }
  
  try {
    const extensionCheck = {
      betterTouchTool: false,
      bartender: false,
      alfred: false,
      cleanshot: false
    };
    
    // Applications 폴더에서 특정 앱 확인
    const applicationsDir = '/Applications';
    const files = fs.readdirSync(applicationsDir);
    
    extensionCheck.betterTouchTool = files.some(file => file.includes('BetterTouchTool'));
    extensionCheck.bartender = files.some(file => file.includes('Bartender'));
    extensionCheck.alfred = files.some(file => file.includes('Alfred'));
    extensionCheck.cleanshot = files.some(file => file.includes('CleanShot'));
    
    return extensionCheck;
  } catch (error) {
    debugLog(`확장 프로그램 확인 중 오류: ${error.message}`);
    return {};
  }
}

/**
 * 실행 컨텍스트 정보 가져오기
 */
function getExecutionContext() {
  return {
    shell: process.env.SHELL,
    termProgram: process.env.TERM_PROGRAM,
    user: process.env.USER || os.userInfo().username,
    cwd: process.cwd(),
    appPath: app.getAppPath()
  };
}

/**
 * 시스템 정보 가져오기
 */
function getSystemInfo() {
  let macOSVersion = null;
  
  if (process.platform === 'darwin') {
    try {
      macOSVersion = execSync('sw_vers -productVersion').toString().trim();
    } catch (error) {
      debugLog(`macOS 버전 확인 오류: ${error.message}`);
    }
  }
  
  const tccInfo = getTCCPermissionInfo();
  const extensionCheck = checkMacExtensions();
  
  return {
    platform: process.platform,
    arch: process.arch,
    macOSVersion,
    tccDatabasePath: tccInfo.tccDbPath,
    tccDatabaseExists: tccInfo.tccDbExists,
    extensionCheck
  };
}

/**
 * 모든 권한 앱 초기화
 */
function resetPermissionApps() {
  Object.keys(permissionApps).forEach(key => {
    if (permissionApps[key]) {
      permissionApps[key].granted = false;
    }
  });
}

/**
 * 권한 세부 정보 가져오기
 */
async function handleGetPermissionDetails() {
  if (process.platform !== 'darwin') {
    return {
      success: true,
      screenCapturePermission: { granted: true },
      requiredApps: [],
      executionContext: getExecutionContext(),
      systemInfo: getSystemInfo()
    };
  }
  
  try {
    // 시스템 정보 가져오기
    const systemInfo = getSystemInfo();
    const executionContext = getExecutionContext();
    const tccInfo = getTCCPermissionInfo();
    
    // 권한 상태 확인
    let screenCapturePermissionInfo = { granted: false, reason: null };
    
    try {
      // activeWin으로 현재 창 정보 확인
      const windowInfo = await activeWin();
      
      if (windowInfo) {
        screenCapturePermissionInfo.granted = true;
        
        // 필요한 앱들의 권한 확인
        Object.keys(permissionApps).forEach(key => {
          if (permissionApps[key] && permissionApps[key].required) {
            permissionApps[key].granted = true;
          }
        });
        
        // 앱 자신의 권한도 추가
        const myApp = {
          name: app.getName() || path.basename(app.getAppPath()),
          path: app.getAppPath(),
          required: true,
          granted: true
        };
        
        // 필요한 앱 목록 구성
        const requiredApps = Object.values(permissionApps)
          .filter(app => app.required)
          .map(app => ({
            name: app.name,
            path: app.path,
            granted: app.granted
          }));
        
        // 앱 자신 추가
        requiredApps.push({
          name: myApp.name,
          path: myApp.path,
          granted: myApp.granted
        });
        
        return {
          success: true,
          screenCapturePermission: screenCapturePermissionInfo,
          requiredApps,
          executionContext,
          systemInfo,
          tccPermissionInfo: tccInfo.tccInfo
        };
      } else {
        screenCapturePermissionInfo.reason = '활성 창 정보를 가져올 수 없습니다.';
      }
    } catch (error) {
      const errorMessage = error.message || '알 수 없는 오류';
      screenCapturePermissionInfo.reason = `화면 기록 권한 오류: ${errorMessage}`;

      // 필요한 앱 권한 초기화
      resetPermissionApps();
      
      // 필요한 앱 목록 구성
      const requiredApps = [];
      
      // 필요한 터미널 앱 추가
      if (process.env.TERM_PROGRAM) {
        // 사용 중인 터미널에 따라 다른 앱 추가
        if (process.env.TERM_PROGRAM === 'Apple_Terminal') {
          requiredApps.push({
            name: 'Terminal',
            path: '/Applications/Utilities/Terminal.app',
            granted: false
          });
        } else if (process.env.TERM_PROGRAM === 'iTerm.app') {
          requiredApps.push({
            name: 'iTerm',
            path: '/Applications/iTerm.app',
            granted: false
          });
        } else if (process.env.TERM_PROGRAM === 'vscode') {
          requiredApps.push({
            name: 'Visual Studio Code',
            path: '/Applications/Visual Studio Code.app',
            granted: false
          });
        } else if (process.env.TERM_PROGRAM?.includes('Cursor')) {
          requiredApps.push({
            name: 'Cursor',
            path: '/Applications/Cursor.app',
            granted: false
          });
        } else {
          requiredApps.push({
            name: process.env.TERM_PROGRAM,
            path: `/Applications/${process.env.TERM_PROGRAM}.app`,
            granted: false
          });
          }
        }
      
      // 앱 자신도 추가
      requiredApps.push({
        name: app.getName() || path.basename(app.getAppPath()),
        path: app.getAppPath(),
        granted: false
      });
      
      return {
        success: true,
        screenCapturePermission: screenCapturePermissionInfo,
        requiredApps,
        executionContext,
        systemInfo,
        tccPermissionInfo: tccInfo.tccInfo,
        error: errorMessage
      };
    }
  } catch (error) {
    debugLog(`권한 세부 정보 가져오기 오류: ${error.message}`);
    
    return {
      success: false,
      error: error.message || '알 수 없는 오류',
      executionContext: getExecutionContext(),
      systemInfo: getSystemInfo()
    };
  }
}

/**
 * 권한 재확인 핸들러
 */
async function handleRetryPermissionCheck() {
  const now = Date.now();
  
  // 너무 자주 요청하는 것을 방지
  if (now - lastPermissionCheckTime < PERMISSION_CHECK_COOLDOWN) {
    return {
      success: false,
      error: `너무 빠른 요청 (마지막 요청 이후 ${Math.round((now - lastPermissionCheckTime) / 1000)}초 경과). 최소 ${Math.round(PERMISSION_CHECK_COOLDOWN / 1000)}초를 기다려주세요.`
    };
  }
  
  lastPermissionCheckTime = now;
  
  if (process.platform !== 'darwin') {
    return {
      success: true,
      permissionStatus: { granted: true }
    };
  }
  
  try {
    // activeWin으로 현재 창 정보 확인
    const windowInfo = await activeWin();
    const granted = Boolean(windowInfo);
    
    return {
      success: true,
      permissionStatus: {
        granted,
        timestamp: now,
        reason: granted ? null : '화면 기록 권한이 필요합니다.'
      }
    };
  } catch (error) {
    const errorOutput = (error.stderr || error.stdout || '').toString();
    const errorMessage = error.message || '알 수 없는 오류';
    
    let reason = '권한을 확인할 수 없습니다.';
    
    if (
      errorOutput.includes('screen recording permission') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('recording') ||
      errorMessage.includes('Privacy')
    ) {
      reason = '화면 기록 권한이 필요합니다. 시스템 설정에서 권한을 허용해주세요.';
    }
    
    return {
      success: true,
      permissionStatus: {
        granted: false,
        timestamp: now,
        reason
      },
      error: errorMessage,
      errorOutput
    };
  }
}

/**
 * 시스템 정보 관련 핸들러 등록
 */
function setupSystemInfoHandlers() {
  // 브라우저 정보 요청 핸들러
  ipcMain.handle('get-browser-info', require('../browser').getBrowserInfo);
  
  // 권한 세부 정보 요청 핸들러
  ipcMain.handle('get-permission-details', handleGetPermissionDetails);
  
  // 권한 재확인 요청 핸들러
  ipcMain.handle('retry-permission-check', handleRetryPermissionCheck);
  
  // 시스템 설정 열기 핸들러
  ipcMain.handle('open-system-preferences', (event, permissionType) => {
    try {
      if (process.platform !== 'darwin') {
        return { success: false, message: '지원되지 않는 플랫폼' };
      }
      
      let urlScheme = 'x-apple.systempreferences:';
      
      switch (permissionType) {
        case 'SCREEN_RECORDING':
          // 화면 기록 설정으로 이동
          urlScheme = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
          break;
        default:
          urlScheme = 'x-apple.systempreferences:com.apple.preference.security?Privacy';
          break;
      }
      
      // URL 스킴으로 설정 앱 열기
      shell.openExternal(urlScheme)
        .then(() => {
          debugLog('시스템 설정 앱 실행 성공');
        })
        .catch(err => {
          debugLog(`시스템 설정 앱 실행 실패: ${err.message}`);
        });
      
      return { success: true };
    } catch (error) {
      debugLog(`시스템 설정 열기 오류: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 앱 시작 시 자동 권한 확인
  setTimeout(async () => {
    try {
      if (process.platform === 'darwin' && appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        // 권한 세부 정보 가져오기
        const permissionDetails = await handleGetPermissionDetails();
        
        // 권한이 없으면 알림 표시
        if (!permissionDetails.screenCapturePermission.granted) {
          appState.mainWindow.webContents.send('permission-error', {
            code: 'SCREEN_RECORDING',
            message: '화면 기록 권한이 필요합니다',
            detail: permissionDetails.screenCapturePermission.reason || '키보드 입력 모니터링을 위해 화면 기록 권한이 필요합니다.',
            requiredApps: permissionDetails.requiredApps
          });
        }
      }
    } catch (error) {
      debugLog(`자동 권한 확인 중 오류: ${error.message}`);
    }
  }, 3000); // 앱 시작 3초 후 실행
  
  return true;
}

/**
 * 모든 시스템 정보 관련 핸들러 등록
 * handlers/index.js에서 호출하는 register 함수
 */
function register() {
  try {
    console.log('시스템 정보 핸들러 등록 시작...');
    
    // 기본 핸들러 설정
    setupSystemInfoHandlers();
    
    // 현재 브라우저 정보 핸들러 등록
    const browser = require('../browser');
    if (browser && typeof browser.setupCurrentBrowserInfoHandler === 'function') {
      console.log('브라우저 정보 핸들러 등록 중...');
      browser.setupCurrentBrowserInfoHandler();
      console.log('브라우저 정보 핸들러 등록 완료');
    } else {
      console.error('browser.js 모듈에서 setupCurrentBrowserInfoHandler 함수를 찾을 수 없습니다');
    }
    
    console.log('시스템 정보 핸들러 등록 완료');
    return true;
  } catch (error) {
    console.error('시스템 정보 핸들러 등록 중 오류:', error);
    return false;
  }
}

module.exports = {
  setupSystemInfoHandlers,
  handleGetPermissionDetails,
  register
}; 