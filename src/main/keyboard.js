const { globalShortcut, app, BrowserWindow, ipcMain } = require('electron');
const activeWin = require('active-win');
const { appState, SPECIAL_KEYS } = require('./constants');
const { detectBrowserName } = require('./browser');
const { processKeyInput } = require('./stats');
const { debugLog } = require('./utils');

// platform 모듈 로드 에러 방지
let isMacOS = () => process.platform === 'darwin';
let isWindows = () => process.platform === 'win32';
let isLinux = () => process.platform === 'linux' || process.platform === 'freebsd';

// 권한 체크 및 디버그 로그 추가
console.log('단축키 권한 확인:', globalShortcut.isRegistered('CommandOrControl+X'));
debugLog('키보드 모듈 초기화 시작');

// 플랫폼별 키보드 이벤트 관련 설정
const PLATFORM_KEY_CONFIGS = {
  darwin: {
    commandKey: 'Meta',
    ctrlKey: 'Control',
    altKey: 'Alt',
    shiftKey: 'Shift'
  },
  win32: {
    commandKey: 'Super', // Windows 키
    ctrlKey: 'Control',
    altKey: 'Alt',
    shiftKey: 'Shift'
  },
  linux: {
    commandKey: 'Super', // Linux의 Super 키
    ctrlKey: 'Control',
    altKey: 'Alt',
    shiftKey: 'Shift'
  }
};

// 한글 자모음 조합 관련 설정
const HANGUL_STATUS = {
  isComposing: false,
  lastComposedText: '',
  composeStartTime: 0
};

// 키 입력 상태 추적을 위한 변수
let lastKeyPressed = null;
let keyPressCount = 0;

// 기본 설정 가져오기 (현재 OS에 맞게)
const currentOSConfig = PLATFORM_KEY_CONFIGS[process.platform] || PLATFORM_KEY_CONFIGS.win32;

/**
 * 키보드 이벤트 감지 설정
 */
function setupKeyboardListener() {
  try {
    debugLog('키보드 리스너 설정 중...');
    debugLog(`현재 플랫폼: ${process.platform}`);

    // 이미 등록된 단축키가 있으면 해제
    globalShortcut.unregisterAll();

    // 현재 눌린 특수 키 추적
    const pressedModifiers = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false, // Command (macOS) 또는 Windows 키
    };

    // 키 입력 이벤트 큐 (빠른 연속 입력 처리 최적화)
    let keyEventQueue = [];
    let keyEventProcessTimer = null;
    const DEBOUNCE_TIME = 10; // 10ms 디바운스 (더 빠른 반응을 위해 조정)

    // 마지막 키 이벤트 타임스탬프
    let lastKeyEventTime = Date.now();
    
    // 활성 상태 체크 타이머
    let activeCheckTimer = null;

    // 플랫폼별 키 매핑 구성
    const getModifierKeyByPlatform = (key) => {
      if (key === 'Alt' || key.toLowerCase() === 'alt') return 'alt';
      if (key === 'Control' || key.toLowerCase() === 'control' || key === 'ctrl') return 'ctrl';
      if (key === 'Shift' || key.toLowerCase() === 'shift') return 'shift';
      if (key === 'Meta' || key === 'Command' || key === 'Super' || key === 'Win') return 'meta';
      return null;
    };

    // 정규 입력 처리 함수
    const handleRegularInput = async (keyData = null) => {
      if (!appState.isTracking) return;

      try {
        const activeWindowInfo = await activeWin();
        if (!activeWindowInfo) {
          debugLog('활성 창 정보를 가져올 수 없음');
          return;
        }

        // 브라우저 감지
        const browserName = detectBrowserName(activeWindowInfo);
        
        // 윈도우 제목 로그 (디버깅용)
        debugLog(`활성 창 정보: ${JSON.stringify({
          title: activeWindowInfo.title, 
          process: activeWindowInfo.owner?.name || '알 수 없음',
          url: browserName ? '브라우저' : '(URL 없음)'
        })}`);

        // 키 데이터 로깅 (디버깅용)
        if (keyData) {
          debugLog(`키 입력 데이터: ${JSON.stringify(keyData)}`);
        }

        // 브라우저가 감지되면 처리 (특정 브라우저로 한정하지 않음)
        if (browserName) {
          processKeyInput(activeWindowInfo.title, browserName, keyData);
        } else {
          // 브라우저가 아닌 경우에도 처리 (기본 앱 타이핑 처리)
          processKeyInput(activeWindowInfo.title || activeWindowInfo.owner?.name || '알 수 없음', '앱', keyData);
        }
        
        // 마지막 이벤트 시간 업데이트
        lastKeyEventTime = Date.now();
        
        // 키 입력 카운트 증가 (디버깅용)
        keyPressCount++;
        lastKeyPressed = keyData ? keyData.key : 'unknown';
        debugLog(`총 키 입력 수: ${keyPressCount}, 마지막 키: ${lastKeyPressed}`);
      } catch (error) {
        console.error('활성 창 확인 오류:', error);
      }
    };

    // 키 이벤트 큐 처리 함수
    const processKeyEventQueue = () => {
      if (keyEventQueue.length === 0) return;
      
      // 큐에 있는 모든 키 이벤트에 대해 로깅
      debugLog(`키 이벤트 처리: ${keyEventQueue.length}개 이벤트 처리 중...`);
      
      // 큐의 모든 이벤트를
      for (const event of keyEventQueue) {
        debugLog(`큐에서 이벤트 처리: ${JSON.stringify(event)}`);
      }
      
      // 마지막 키 이벤트 정보 추출
      const lastKeyEvent = keyEventQueue[keyEventQueue.length - 1];
      
      // 한글 자모음 조합 처리
      if (HANGUL_STATUS.isComposing) {
        // 조합 중인 상태에서 Enter 등이 입력되면 조합 완료로 처리
        if (lastKeyEvent.key === 'Enter' || lastKeyEvent.key === 'Tab' || 
            lastKeyEvent.key === 'Escape') {
          HANGUL_STATUS.isComposing = false;
          debugLog(`한글 조합 완료: ${HANGUL_STATUS.lastComposedText}`);
          
          // 조합 완료된 텍스트 처리
          if (HANGUL_STATUS.lastComposedText) {
            handleRegularInput({
              type: 'compositionend',
              text: HANGUL_STATUS.lastComposedText,
              timestamp: Date.now()
            });
            HANGUL_STATUS.lastComposedText = '';
          }
        }
      }
      
      // 키 이벤트 처리
      handleRegularInput(lastKeyEvent);
      
      // 큐 비우기
      keyEventQueue = [];
    };

    // 백그라운드 모니터링 함수
    const checkKeyboardStatus = () => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastKeyEventTime;
      
      // 30초 동안 이벤트가 없었으면 활성 상태 확인
      if (timeSinceLastEvent > 30000) {
        debugLog('키보드 활성 상태 확인 중...');
        
        // 특수키 상태 확인
        for (const key in pressedModifiers) {
          if (pressedModifiers[key]) {
            debugLog(`특수키 상태 리셋: ${key}`);
            pressedModifiers[key] = false;
          }
        }
        
        // 한글 조합 상태 리셋
        if (HANGUL_STATUS.isComposing && (now - HANGUL_STATUS.composeStartTime > 10000)) {
          debugLog('장시간 미사용으로 한글 조합 상태 초기화');
          HANGUL_STATUS.isComposing = false;
          HANGUL_STATUS.lastComposedText = '';
        }
      }
    };

    // 메인 윈도우에서 키보드 이벤트 리스너 설정
    const registerKeyboardEvents = () => {
      const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());

      if (!mainWindow) {
        debugLog('메인 윈도우를 찾을 수 없어 웹 컨텐츠 키보드 이벤트를 설정할 수 없습니다');
        return;
      }

      debugLog('메인 윈도우에 키보드 이벤트 리스너 설정 중...');

      // 전역 키보드 이벤트 처리
      mainWindow.webContents.on('before-input-event', (event, input) => {
        if (!appState.isTracking) return;

        // 키 입력 로깅 (디버깅용)
        debugLog(`키 입력 감지: ${input.key} (타입: ${input.type}, 코드: ${input.code})`);

        // 특수키 상태 추적
        const modifierKey = getModifierKeyByPlatform(input.key);
        if (modifierKey) {
          pressedModifiers[modifierKey] = input.type === 'keyDown';
          debugLog(`특수키 상태 변경: ${modifierKey} = ${pressedModifiers[modifierKey]}`);
          if (input.type === 'keyDown') return; // 모디파이어 키 누르기는 카운트하지 않음
        }

        // Tab 키는 keyDown에서 무시
        if (input.key === 'Tab' && input.type === 'keyDown') return;

        // 단축키 조합 감지 (예: ALT+TAB, CTRL+C 등)
        if (pressedModifiers.alt || pressedModifiers.ctrl || pressedModifiers.meta) {
          debugLog(`특수키 조합 감지: alt=${pressedModifiers.alt}, ctrl=${pressedModifiers.ctrl}, meta=${pressedModifiers.meta}`);
          // 단축키는 카운트하지 않음
          return;
        }

        // 기능 키, 방향키, 기타 특수키 필터링
        if (SPECIAL_KEYS.includes(input.key.toUpperCase())) {
          debugLog(`특수키 무시: ${input.key}`);
          return;
        }

        // 여기까지 왔다면 일반 입력 키로 간주하고 처리
        if (input.type === 'keyDown') {
          // 키 이벤트 큐에 추가
          keyEventQueue.push({
            key: input.key,
            code: input.code, // 추가: 키 코드 정보
            timestamp: Date.now(),
            type: 'keyDown'
          });
          
          // 디바운스 타이머 설정 (연속 입력 최적화)
          clearTimeout(keyEventProcessTimer);
          keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
        }
      });

      // 직접 DOM 이벤트를 통한 키 입력 캡처 (보조 방법)
      mainWindow.webContents.executeJavaScript(`
        document.addEventListener('keydown', (e) => {
          window.electronAPI.sendKeyboardEvent({
            key: e.key,
            code: e.code,
            type: 'keyDown',
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey
          });
        });
        
        // 한글 입력 이벤트 처리
        document.addEventListener('compositionstart', (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionstart'
          });
        });
        
        document.addEventListener('compositionupdate', (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionupdate',
            text: e.data
          });
        });
        
        document.addEventListener('compositionend', (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionend',
            text: e.data
          });
        });
        
        console.log('DOM 키보드 이벤트 핸들러 설정 완료');
        true;
      `).catch(err => {
        console.error('DOM 키보드 이벤트 스크립트 주입 오류:', err);
      });

      // 한글 입력 이벤트 처리를 위한 추가 이벤트 핸들러 (IME 이벤트)
      mainWindow.webContents.on('composition-start', () => {
        debugLog('한글 조합 시작');
        HANGUL_STATUS.isComposing = true;
        HANGUL_STATUS.composeStartTime = Date.now();
        HANGUL_STATUS.lastComposedText = '';
        
        // 한글 조합 시작 이벤트를 큐에 추가
        keyEventQueue.push({
          type: 'compositionstart',
          timestamp: Date.now()
        });
        
        // 디바운스 처리
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
      });
      
      mainWindow.webContents.on('composition-update', (event, text) => {
        debugLog(`한글 조합 업데이트: ${text}`);
        HANGUL_STATUS.lastComposedText = text;
        
        // 조합 업데이트 이벤트를 큐에 추가
        keyEventQueue.push({
          type: 'compositionupdate',
          text: text,
          timestamp: Date.now()
        });
        
        // 디바운스 처리
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
      });
      
      mainWindow.webContents.on('composition-end', (event, text) => {
        debugLog(`한글 조합 완료: ${text}`);
        HANGUL_STATUS.isComposing = false;
        HANGUL_STATUS.lastComposedText = text;
        
        // 조합 완료 이벤트를 큐에 추가
        keyEventQueue.push({
          type: 'compositionend',
          text: text,
          timestamp: Date.now()
        });
        
        // 디바운스 처리
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
      });

      // MacOS에서는 추가 이벤트 처리
      if (isMacOS()) {
        setupMacOSKeyboardSupport(mainWindow);
      }

      debugLog('웹 컨텐츠 키보드 이벤트가 설정되었습니다');
    };

    // MacOS 특화 키보드 지원 설정
    const setupMacOSKeyboardSupport = (window) => {
      debugLog('MacOS 특화 키보드 지원 설정 중...');
      
      // MacOS에서는 Command 키 이벤트를 추가로 처리
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'Meta' || input.key === 'Command') {
          pressedModifiers.meta = input.type === 'keyDown';
          debugLog(`macOS Command 키 상태: ${pressedModifiers.meta ? '누름' : '뗌'}`);
        }
      });
      
      // MacOS에서 한글/영문 전환 감지 ('ko', 'en')
      window.webContents.on('input-event', (event, inputEvent) => {
        if (inputEvent.type === 'keyDown' && 
            (inputEvent.code === 'Space' && pressedModifiers.shift)) {
          debugLog('한/영 전환 키 감지됨');
        }
      });
      
      // 추가: MacOS에서 input-event 이벤트도 사용
      window.webContents.on('input-event', (event, inputEvent) => {
        debugLog(`MacOS input-event: ${JSON.stringify(inputEvent)}`);
        if (inputEvent.type === 'keyDown' && !SPECIAL_KEYS.includes(inputEvent.key?.toUpperCase())) {
          keyEventQueue.push({
            key: inputEvent.key || 'Unknown',
            code: inputEvent.code || 'Unknown',
            timestamp: Date.now(),
            type: 'keyDown',
            isMacEvent: true
          });
          
          clearTimeout(keyEventProcessTimer);
          keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
        }
      });
      
      debugLog('MacOS 특화 키보드 이벤트 설정 완료');
    };

    // IPC를 통한 키보드 이벤트 처리
    ipcMain.handle('keyboard-event', async (event, data) => {
      if (!appState.isTracking) return { success: false, reason: 'tracking-disabled' };
      
      try {
        debugLog(`IPC 키보드 이벤트 수신: ${JSON.stringify(data)}`);
        
        // 키 이벤트 큐에 추가
        keyEventQueue.push({
          key: data.key,
          code: data.code || '',
          timestamp: Date.now(),
          type: data.type || 'keyDown',
          ...(data.text && { text: data.text })
        });
        
        // 디바운스 타이머 설정 (연속 입력 최적화)
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
        
        return { success: true };
      } catch (error) {
        console.error('키보드 이벤트 처리 오류:', error);
        return { success: false, error: error.message };
      }
    });
    
    // 클라이언트에서 전송된 키 이벤트 처리
    ipcMain.handle('sendKeyboardEvent', async (event, data) => {
      try {
        debugLog(`클라이언트에서 키 이벤트 수신: ${JSON.stringify(data)}`);
        
        // 키 이벤트 큐에 추가
        keyEventQueue.push({
          ...data,
          timestamp: Date.now(),
          fromRenderer: true
        });
        
        // 디바운스 타이머 설정
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
        
        return { success: true };
      } catch (error) {
        console.error('클라이언트 키 이벤트 처리 오류:', error);
        return { success: false, error: error.message };
      }
    });

    // 한글 조합 상태 확인 IPC
    ipcMain.handle('get-hangul-status', () => {
      return { 
        isComposing: HANGUL_STATUS.isComposing,
        lastComposedText: HANGUL_STATUS.lastComposedText
      };
    });

    // 애플리케이션 전체 단축키 등록
    registerGlobalShortcuts();

    // 메인 윈도우가 생성될 때 이벤트 리스너 등록
    app.on('browser-window-created', (_, window) => {
      debugLog('새 브라우저 윈도우 생성됨, 이벤트 리스너 등록 예정');
      window.webContents.on('did-finish-load', () => {
        debugLog('윈도우 로드 완료, 키보드 이벤트 등록');
        registerKeyboardEvents();
      });
    });

    // 이미 생성된 윈도우에 이벤트 리스너 등록
    registerKeyboardEvents();

    debugLog('키보드 리스너가 설정되었습니다.');

    // 정기적으로 키보드 상태 확인 (멈춤 방지)
    const keyboardStatusCheckInterval = setInterval(() => {
      // 특수키 상태 초기화 (멈춤 현상 방지)
      for (const key in pressedModifiers) {
        if (pressedModifiers[key]) {
          try {
            const keyToCheck = key.charAt(0).toUpperCase() + key.slice(1);
            const stillPressed = globalShortcut.isPressed(keyToCheck);
            if (!stillPressed) {
              debugLog(`특수키 ${key} 상태 리셋 (globalShortcut.isPressed 기반)`);
              pressedModifiers[key] = false;
            }
          } catch (e) {
            // isPressed가 지원되지 않는 환경에서 오류 방지
            pressedModifiers[key] = false;
          }
        }
      }
      
      // 백그라운드 활성 상태 체크
      checkKeyboardStatus();
    }, 3000); // 3초마다 확인
    
    // 활성 상태 체크 타이머 설정 (15초마다 - 더 빠른 응답을 위해 30초에서 조정)
    activeCheckTimer = setInterval(checkKeyboardStatus, 15000);

    // 디버깅용 카운터 리셋 타이머
    setInterval(() => {
      debugLog(`키 입력 통계: 총 ${keyPressCount}개, 마지막 키: ${lastKeyPressed}`);
    }, 10000);

    // 리소스 정리 함수 반환
    return {
      dispose: () => {
        globalShortcut.unregisterAll();
        clearInterval(keyboardStatusCheckInterval);
        clearInterval(activeCheckTimer);
        clearTimeout(keyEventProcessTimer);
        
        const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());
        if (mainWindow) {
          mainWindow.webContents.removeAllListeners('before-input-event');
          mainWindow.webContents.removeAllListeners('composition-start');
          mainWindow.webContents.removeAllListeners('composition-update');
          mainWindow.webContents.removeAllListeners('composition-end');
          mainWindow.webContents.removeAllListeners('input-event');
        }
        
        ipcMain.removeHandler('keyboard-event');
        ipcMain.removeHandler('get-hangul-status');
        ipcMain.removeHandler('sendKeyboardEvent');
        debugLog('키보드 리스너가 해제되었습니다.');
      },
    };
  } catch (error) {
    console.error('키보드 리스너 설정 오류:', error);
    return null;
  }
}

/**
 * 전역 단축키 등록
 */
function registerGlobalShortcuts() {
  try {
    // 권한 확인
    const canRegister = !globalShortcut.isRegistered('CommandOrControl+X');
    
    debugLog(`전역 단축키 등록 시작 (권한 상태: ${canRegister})`);
    
    // 플랫폼별 단축키 등록
    if (isWindows()) {
      // Windows 특화 단축키
      globalShortcut.register('Alt+F4', () => {
        debugLog('Alt+F4 감지됨');
        // 애플리케이션 종료 방지 (필요한 경우)
        return false;
      });
    } else if (isMacOS()) {
      // macOS 특화 단축키
      globalShortcut.register('Command+Q', () => {
        debugLog('Command+Q 감지됨');
        // 애플리케이션 종료 방지 (필요한 경우)
        return false;
      });
      
      // MacOS에서 한/영 전환 감지 시도
      try {
        globalShortcut.register('Command+Space', () => {
          debugLog('Command+Space 감지됨 (한/영 전환 가능성)');
          return false;
        });
      } catch (err) {
        debugLog('Command+Space 등록 실패 (시스템에서 사용중)');
      }
    }

    // 공통 단축키 등록
    globalShortcut.register('CommandOrControl+R', () => {
      debugLog('리로드 단축키 감지됨');
      return false; // 기본 동작 방지
    });
    
    // 디버깅용 단축키
    globalShortcut.register('CommandOrControl+Alt+K', () => {
      debugLog('디버그 단축키 감지됨, 현재 키보드 상태 출력');
      debugLog(`현재 키 입력 통계: 총 ${keyPressCount}개, 마지막 키: ${lastKeyPressed}`);
      return false;
    });
    
    debugLog(`전역 단축키 등록 ${canRegister ? '성공' : '실패 (권한 없음)'}`);
    return canRegister;
  } catch (error) {
    console.error('단축키 등록 오류:', error);
    return false;
  }
}

// 테스트 함수: 키보드 입력 시뮬레이션
function simulateKeyPress(key) {
  debugLog(`키 입력 시뮬레이션: ${key}`);
  
  // 큐에 시뮬레이션 이벤트 추가
  const simulatedEvent = {
    key: key,
    timestamp: Date.now(),
    type: 'keyDown',
    simulated: true
  };
  
  // 직접 stats 모듈 호출하여 처리
  const { processKeyInput } = require('./stats');
  processKeyInput('시뮬레이션 창', '시뮬레이션 앱', simulatedEvent);
  
  return true;
}

module.exports = {
  setupKeyboardListener,
  registerGlobalShortcuts,
  simulateKeyPress // 테스트용 함수 추가
};
