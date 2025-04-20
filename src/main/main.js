const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const { setupAppLifecycle } = require('./app-lifecycle');
const { setupIpcHandlers } = require('./ipc-handlers');
const { setupKeyboardListener } = require('./keyboard');
const fs = require('fs');
const { setupMemoryManagement, optimizeForBackground } = require('./memory-manager');
const { setupTray } = require('./tray');
const { setupWorkers } = require('./workers');
const os = require('os');
const { setupErrorHandling } = require('../lib/error-handling');
const { setupProtocolHandlers } = require('./protocol-handlers');
const { setupDebugging } = require('./debugging');
const { initConfig } = require('./electron-config');
const { appState } = require('./constants');
const { createWindow, getMainWindow } = require('./window');
const { debugLog } = require('./utils');
const http = require('http');
const { Menu } = require('electron');
const isDev = require('electron-is-dev');
const axios = require('axios');

// electron-reload 설정 개선
if (isDev) {
  try {
    const electronReload = require('electron-reload');
    const appRoot = path.join(__dirname, '../..');

    // 재시작 시 모든 모듈이 제대로 로드되도록 설정 개선
    electronReload(
      [
        path.join(appRoot, 'src/**/*'),
        path.join(appRoot, 'main.js'),
        path.join(appRoot, 'preload.js'),
      ],
      {
        electron: path.join(appRoot, 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit',
        forceHardReset: true,
        // 일관된 모듈 로딩을 위해 캐시 무효화
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      }
    );

    debugLog('electron-reload 설정 완료 - 개발 모드 핫 리로드 활성화');
  } catch (err) {
    console.error('electron-reload 설정 실패:', err);
  }
}

let isQuitting = false;

// 메인 프로세스 시작 로그
console.log(`[${new Date().toISOString()}] Electron 메인 프로세스 시작`);

// 메뉴바 제거
function removeMenuBar() {
  // 앱의 기본 메뉴바를 null로 설정하여 제거
  Menu.setApplicationMenu(null);
  debugLog('메뉴바가 제거되었습니다.');
}

// Next.js 서버가 준비되었는지 확인하는 함수
function checkIfNextServerReady() {
  return new Promise((resolve, reject) => {
    const checkServer = () => {
      axios.get('http://localhost:3000') // Ensure correct port
        .then(() => {
          debugLog('Next.js 서버 준비 완료');
          resolve();
        })
        .catch(() => {
          debugLog('Next.js 서버 대기 중...');
          setTimeout(checkServer, 1000); // Check again after 1 second
        });
    };
    checkServer();
  });
}

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

    // Chrome 스타일의 GPU 가속을 위한 기본 플래그 추가 (app.ready 전)
    if (!app.commandLine.hasSwitch('disable-gpu')) {
      // 기본 GPU 설정 - setupGpuAcceleration에서 세부 설정함
      app.commandLine.appendSwitch('enable-hardware-acceleration');
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('enable-zero-copy');

      debugLog('기본 GPU 가속 플래그 설정 완료');
    }
  } catch (error) {
    debugLog('플래그 설정 실패:', error);
  }

  // 앱 시작 전 설정 함수 (파일 레벨 - 중복 제거)
  function setupAppConfig() {
    try {
      debugLog('앱 설정 초기화 시작');

      // 메모리 관련 플래그 추가
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
      app.commandLine.appendSwitch('disable-site-isolation-trials');

      // GPU 설정은 app-lifecycle 또는 setupGpuAcceleration에서 처리
      // 이 시점에서는 기본적인 플래그만 설정하거나 건너뛰기

      debugLog('기본 앱 설정 적용 완료');
    } catch (error) {
      console.error('앱 설정 초기화 중 오류:', error);
    }
  }

  // 앱 시작 전 설정 호출
  setupAppConfig();

  // app ready 이벤트에서 Next.js 서버 준비 상태 확인 추가
  app.on('ready', async () => {
    try {
      debugLog('앱 준비됨, Next.js 서버 확인 중...');

      // 메뉴바 제거 호출
      removeMenuBar();

      // 개발 모드에서는 Next.js 서버 준비 상태 확인
      if (process.env.NODE_ENV === 'development') {
        await checkIfNextServerReady();
      }

      // 창 생성 및 기타 초기화
      appState.mainWindow = createWindow(); // createWindow 호출을 여기서 수행
      appState.tray = setupTray();
      setupKeyboardListener();
      setupWorkers();
      setupMemoryManagement(); // 여기서 호출
      setupGpuAcceleration(); // 여기서 호출
      setupIpcHandlers();
      setupAppLifecycle();
      setupErrorHandling();
      setupDebugging();
      setupProtocolHandlers();
      setupAppEventListeners(); // 모든 설정이 완료된 후 이벤트 리스너 설정

      debugLog('App initialization complete'); // 로그 위치 변경
    } catch (error) {
      debugLog('시작 오류:', error);
      app.quit(); // 시작 오류 시 종료
    }
  });

  // 두 번째 인스턴스 실행 시 기존 창 활성화
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => { // 사용하지 않는 파라미터 밑줄 추가
    debugLog('다른 인스턴스가 실행됨, 기존 창 활성화');
    const mainWindow = getMainWindow();

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * 애플리케이션 시작 전 GPU 설정 및 성능 최적화 (파일 레벨 - 중복 제거)
 */
function setupGpuAcceleration() {
  const { settings } = appState;
  const useHardwareAcceleration = settings?.useHardwareAcceleration || false;

  // 네이티브 모듈 API 로드
  let nativeModuleApi = null;
  try {
    nativeModuleApi = require('@/server/native');
  } catch (err) {
    console.error('네이티브 모듈 API 로드 실패:', err);
  }

  // GPU 하드웨어 가속 설정에 따라 스위치 적용
  if (useHardwareAcceleration) {
    // --- 기존 Electron 명령줄 스위치 설정 --- 
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    app.commandLine.appendSwitch('enable-webgl');
    app.commandLine.appendSwitch('canvas-oop-rasterization');
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
    debugLog('Electron GPU 하드웨어 가속 관련 스위치 적용됨');

    // --- 네이티브 모듈 GPU 설정 추가 ---
    if (nativeModuleApi && typeof nativeModuleApi.isNativeModuleAvailable === 'function'
      && nativeModuleApi.isNativeModuleAvailable()) {
      try {
        console.log('네이티브 GPU 모듈 초기화 및 설정 중...');

        // 1. GPU 모듈 초기화
        if (typeof nativeModuleApi.initializeGpuModule === 'function') {
          const initialized = nativeModuleApi.initializeGpuModule();
          console.log(`네이티브 GPU 모듈 초기화 ${initialized ? '성공' : '실패'}`);
        }

        // 2. GPU 가속화 설정
        if (typeof nativeModuleApi.setGpuAcceleration === 'function') {
          const accelerationEnabled = nativeModuleApi.setGpuAcceleration(true);
          console.log(`네이티브 GPU 가속화 ${accelerationEnabled ? '활성화됨' : '실패 또는 이미 활성화됨'}`);
        }
      } catch (error) {
        console.error('네이티브 GPU 모듈 설정 중 오류:', error);
      }
    } else {
      console.log('네이티브 모듈을 사용할 수 없거나 폴백 모드이므로 네이티브 GPU 설정을 건너뛰었습니다.');
    }

  } else {
    // --- 기존 Electron GPU 비활성화 코드 --- 
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
    debugLog('Electron GPU 하드웨어 가속 비활성화됨');

    // --- 네이티브 모듈 GPU 비활성화 ---
    if (nativeModuleApi && typeof nativeModuleApi.isNativeModuleAvailable === 'function'
      && nativeModuleApi.isNativeModuleAvailable()) {
      try {
        // GPU 가속화 비활성화 설정
        if (typeof nativeModuleApi.setGpuAcceleration === 'function') {
          const accelerationDisabled = nativeModuleApi.setGpuAcceleration(false);
          console.log(`네이티브 GPU 가속화 ${accelerationDisabled ? '비활성화됨' : '실패 또는 이미 비활성화됨'}`);
        }
      } catch (error) {
        console.error('네이티브 GPU 모듈 비활성화 중 오류:', error);
      }
    } else {
      console.log('네이티브 모듈을 사용할 수 없거나 폴백 모드이므로 네이티브 GPU 비활성화를 건너뛰었습니다.');
    }
  }

  // --- 나머지 기존 공통 설정 코드 ---
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');

  // 메모리 압축 활성화
  app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC');
  app.commandLine.appendSwitch('force-fieldtrials', 'MemoryPressureBasedSourceBufferGC/Enabled');

  // CrashPad 비활성화 (선택적, 메모리 사용 감소)
  app.commandLine.appendSwitch('disable-crash-reporter');

  return useHardwareAcceleration;
}

/**
 * 앱 이벤트 리스너 설정 (파일 레벨)
 */
function setupAppEventListeners() {
  app.on('window-all-closed', () => {
    debugLog('모든 창이 닫혔습니다.');
    if (process.platform !== 'darwin') {
      debugLog('앱 종료 (darwin 제외)');
      app.quit();
    }
  });

  app.on('before-quit', () => {
    debugLog('앱 종료 시작...');
    isQuitting = true;
    // 필요한 종료 처리 로직 (예: 리소스 해제)
    if (appState && appState.workers) {
      appState.workers.terminateAll();
    }
    if (appState && appState.keyboardListener) {
      appState.keyboardListener.stop();
    }
  });

  // Handle backgrounding (e.g., minimize)
  app.on('browser-window-blur', () => {
    debugLog('Window blurred (backgrounded)'); // console.log -> debugLog
    optimizeForBackground(true);
  });

  // Handle foregrounding (e.g., restore)
  app.on('browser-window-focus', () => {
    debugLog('Window focused (foregrounded)'); // console.log -> debugLog
    optimizeForBackground(false);
  });

  app.on('activate', () => {
    debugLog('앱 활성화됨 (activate 이벤트)');
    if (BrowserWindow.getAllWindows().length === 0 && app.isReady()) { // app.isReady() 체크 추가
      debugLog('활성화 시 창 없음, 새 창 생성');
      if (!appState.mainWindow || appState.mainWindow.isDestroyed()) { // mainWindow 상태 확인
        appState.mainWindow = createWindow();
      } else {
        appState.mainWindow.focus(); // 이미 존재하면 포커스
      }
    } else if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      appState.mainWindow.focus(); // 창이 있으면 포커스
    }
  });

  app.on('will-quit', () => {
    debugLog('App will quit 이벤트 발생'); // console.log -> debugLog
    // 이곳에서 추가적인 정리 작업 수행 가능
  });
}

// 예기치 않은 오류 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error); // 에러 로깅은 유지
  // 필요한 경우 추가 로깅 또는 사용자 알림 (예: dialog.showErrorBox)
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason); // 에러 로깅은 유지
  // 필요한 경우 추가 로깅
});
