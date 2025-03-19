const { app } = require('electron');
const path = require('path');
const { setupAppEventListeners } = require('./app-lifecycle');
const { debugLog } = require('./utils');

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
  } catch (error) {
    debugLog('GC 노출 플래그 설정 실패:', error);
  }
  
  // 앱 시작 전 설정
  function setupAppConfig() {
    try {
      // 메모리 관련 플래그 추가
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
      app.commandLine.appendSwitch('disable-site-isolation-trials');
      
      // 사용자 설정에 따라 GPU 가속 관련 플래그 처리
      if (appState.settings?.useHardwareAcceleration) {
        // GPU 가속 최적화 플래그 추가
        app.commandLine.appendSwitch('enable-gpu-rasterization');
        app.commandLine.appendSwitch('enable-zero-copy');
        app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
        app.commandLine.appendSwitch('enable-accelerated-video-decode');
        app.commandLine.appendSwitch('enable-gpu-compositing');
        
        // GPU 사용 가능 표시
        appState.gpuEnabled = true;
        debugLog('GPU 가속 활성화됨');
      } else {
        // 하드웨어 가속 비활성화
        app.disableHardwareAcceleration();
        appState.gpuEnabled = false;
        debugLog('하드웨어 가속 비활성화됨');
      }
    } catch (error) {
      debugLog('GPU 설정 적용 실패:', error);
    }
    
    // 앱 이벤트 리스너 설정
    setupAppEventListeners();
  }
  
  setupAppConfig();
}
