const { app } = require('electron');
const path = require('path');
const { setupAppEventListeners } = require('./src/main/app-lifecycle.cjs');
const { debugLog } = require('./src/main/utils.cjs');

// Electron 앱이 단일 인스턴스로 실행되도록 설정
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  // 앱 초기화 전 GC 플래그 설정 (app.commandLine.appendSwitch는 app.ready 전에 호출해야 함)
  try {
    // 중요: 이 플래그는 앱 초기화 전에 설정해야 합니다
    if (process.argv.indexOf('--expose-gc') === -1) {
      app.commandLine.appendSwitch('js-flags', '--expose-gc');
      debugLog('GC 노출 플래그 설정 완료');
    } else {
      debugLog('GC 노출 플래그가 이미 설정되어 있습니다');
    }
  } catch (e) {
    console.error('GC 플래그 설정 오류:', e);
  }

  // 앱 시작 전 설정
  function setupAppConfig() {
    try {
      debugLog('앱 설정 초기화 시작');
      
      // 메모리 관련 플래그 추가
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
      app.commandLine.appendSwitch('disable-site-isolation-trials');
      
      // GPU 설정을 app-lifecycle에서 처리하도록 변경
      // 이 시점에서는 기본 설정만 적용
      
      debugLog('기본 앱 설정 적용 완료');
      
      // 초기 실행 설정
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        debugLog('이미 다른 인스턴스가 실행 중입니다. 앱을 종료합니다.');
        app.quit();
        return;
      }
      
      // 메인 프로세스 초기화 시간 확보
      debugLog('메인 프로세스 초기화 대기 중...');
      setTimeout(() => {
        // 앱 이벤트 리스너 설정
        setupAppEventListeners();
        debugLog('앱 이벤트 리스너 설정 완료');
      }, 100);
    } catch (error) {
      console.error('앱 설정 초기화 중 오류:', error);
      // 오류 발생해도 앱은 계속 실행
      setupAppEventListeners();
    }
  }

  // 앱 설정 초기화
  setupAppConfig();
}
