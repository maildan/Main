/**
 * 시스템 정보 관련 IPC 핸들러
 * 
 * 브라우저 정보, 디버그 정보 등 시스템 관련 정보를 제공하는 핸들러를 처리합니다.
 */
const { ipcMain } = require('electron');
const activeWin = require('active-win');
const { appState } = require('../constants');
const { debugLog } = require('../utils');

/**
 * 시스템 정보 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('시스템 정보 관련 IPC 핸들러 등록 중...');

  // 브라우저 정보 요청
  ipcMain.on('get-current-browser-info', async (event) => {
    try {
      let browserName = null;
      let title = null;
      let isGoogleDocs = false;
      
      try {
        const windowInfo = await activeWin();
        // 브라우저 모듈 기능 사용
        const { 
          detectBrowserName, 
          isGoogleDocsWindow,
          getLastKnownBrowserInfo,
          getFallbackBrowserName
        } = require('../browser');
        
        browserName = windowInfo ? detectBrowserName(windowInfo) : null;
        title = windowInfo ? windowInfo.title : null;
        isGoogleDocs = windowInfo ? isGoogleDocsWindow(windowInfo) : false;
      } catch (activeWinError) {
        // active-win에서 오류 발생 시 
        console.warn('active-win 오류, 대체 방법 사용:', activeWinError.message);
        
        // 화면 기록 권한 오류인지 확인
        const errorOutput = (activeWinError.stdout || '').toString() + (activeWinError.stderr || '').toString();
        
        // 권한 오류 메시지 감지
        if (errorOutput.includes('screen recording permission')) {
          // 렌더러에 권한 오류 알림
          event.sender.send('permission-error', {
            code: 'SCREEN_RECORDING',
            message: '화면 기록 권한이 없어 활성 윈도우 정보를 가져올 수 없습니다.',
            detail: '시스템 환경설정 → 보안 및 개인 정보 보호 → 화면 기록 에서 권한을 허용해주세요.'
          });
          
          debugLog('화면 기록 권한 오류 메시지 전송됨');
        }
        
        // browser.js 모듈의 대체 함수 사용
        const { getFallbackBrowserName, getLastKnownBrowserInfo } = require('../browser');
        
        // 대체 브라우저 이름 추정
        browserName = getFallbackBrowserName();
        
        // 마지막 알려진 정보 가져오기
        const lastKnown = getLastKnownBrowserInfo();
        title = lastKnown.title || appState.currentStats.currentWindow || 'Unknown Window';
        
        // 구글 독스 여부 추정 (제목에서)
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
        isGoogleDocs
      });
      
      // 디버그 로그
      debugLog(`브라우저 정보 응답: ${JSON.stringify({
        browserName,
        title,
        isGoogleDocs
      })}`);
    } catch (error) {
      console.error('브라우저 정보 요청 처리 오류:', error);
      event.sender.send('current-browser-info', {
        browserName: null,
        title: null,
        isGoogleDocs: false,
        error: error.message
      });
    }
  });

  // 디버그 정보 요청
  ipcMain.handle('get-debug-info', async () => {
    try {
      // 시스템 정보 수집
      const debugInfo = {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        v8: process.versions.v8,
        date: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        windowInfo: null,
        permissions: {
          // 여러 권한 상태 확인
          screenRecording: null, // macOS 화면 기록 권한
          mediaAccess: null,     // 미디어 접근 권한
        }
      };
      
      // active-win으로 현재 윈도우 정보 얻기
      try {
        debugInfo.windowInfo = await activeWin();
        
        // active-win이 성공했다면 화면 기록 권한 있음
        if (debugInfo.windowInfo && process.platform === 'darwin') {
          debugInfo.permissions.screenRecording = true;
          
          // 완전히 성공했을 때 렌더러에게 권한 획득 알림
          ipcMain.emit('permission-status-update', {
            code: 'SCREEN_RECORDING',
            granted: true
          });
        }
      } catch (activeWinError) {
        // active-win 오류 수집 및 권한 분석
        console.error('디버그 정보 수집 중 active-win 오류:', activeWinError);
        
        const errorOutput = (activeWinError.stdout || '').toString() + (activeWinError.stderr || '').toString();
        debugInfo.windowInfo = {
          error: activeWinError.message,
          errorOutput: errorOutput
        };
        
        // 권한 오류 식별
        if (process.platform === 'darwin') {
          if (errorOutput.includes('screen recording permission')) {
            debugInfo.permissions.screenRecording = false;
            
            // 명시적으로 권한 없음 표시
            debugLog('화면 기록 권한 없음 감지됨');
          }
        }
      }
      
      return debugInfo;
    } catch (error) {
      console.error('디버그 정보 수집 오류:', error);
      return {
        error: error.message,
        stack: error.stack
      };
    }
  });

  // 트레이에서 타겟 탭으로 이동하는 이벤트 핸들러
  ipcMain.on('switch-to-tab-handled', (event, tab) => {
    // 탭 전환 완료 알림을 받으면 트레이 메뉴 업데이트
    debugLog(`탭 전환 완료: ${tab}`);
    const { updateTrayMenu } = require('../tray');
    updateTrayMenu();
  });

  // 시스템 정보 요청 핸들러
  ipcMain.handle('get-system-info', async () => {
    try {
      // 시스템 정보 수집
      const os = require('os');
      return {
        success: true,
        info: {
          platform: process.platform,
          arch: process.arch,
          osType: os.type(),
          osRelease: os.release(),
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          cpus: os.cpus().length,
          hostname: os.hostname(),
          userInfo: os.userInfo().username,
          nodeVersion: process.versions.node,
          electronVersion: process.versions.electron,
          v8Version: process.versions.v8,
          chromeVersion: process.versions.chrome,
          appVersion: app?.getVersion() || 'unknown'
        }
      };
    } catch (error) {
      console.error('시스템 정보 요청 처리 오류:', error);
      return { success: false, error: error.message };
    }
  });

  debugLog('시스템 정보 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register
}; 