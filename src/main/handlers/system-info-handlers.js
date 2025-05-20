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
        // active-win에서 오류 발생 시 대체 방법 사용
        console.warn('active-win 오류, 대체 방법 사용:', activeWinError.message);
        
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
  ipcMain.on('get-debug-info', (event) => {
    try {
      const debugInfo = {
        isTracking: appState.isTracking,
        currentStats: { ...appState.currentStats },
        platform: process.platform,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      };
      
      event.reply('debug-info', debugInfo);
      
      debugLog('디버그 정보 요청 처리 완료');
    } catch (error) {
      console.error('디버그 정보 요청 처리 오류:', error);
      event.reply('debug-info', { error: error.message });
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