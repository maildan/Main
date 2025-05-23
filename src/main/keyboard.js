const { globalShortcut, app, BrowserWindow, ipcMain } = require('electron');
const activeWin = require('active-win');
const { appState, SPECIAL_KEYS, SUPPORTED_WEBSITES } = require('./constants');
const { detectBrowserName, isGoogleDocsWindow } = require('./browser');
// 순환 참조 방지: processKeyInput을 직접 불러오지 않고 필요할 때 동적으로 로드
// const { processKeyInput } = require('./stats');
const { debugLog } = require('./utils');
const { getSettings } = require('./settings');
const fs = require('fs');
const path = require('path');

// 키 입력 처리 함수 - 동적 로드
let processKeyInput = null;
function getProcessKeyInput() {
  if (!processKeyInput) {
    try {
      const stats = require('./stats');
      processKeyInput = stats.processKeyInput;
    } catch (error) {
      console.error('stats 모듈 로드 오류:', error);
      // 임시 대체 함수 사용
      processKeyInput = () => false;
    }
  }
  return processKeyInput;
}

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
  composeStartTime: 0,
  intermediateChars: '', // 중간 자모음 저장
  completeChar: '',      // 완성된 글자
  useNativeIME: true,    // 네이티브 IME 사용 여부
  isHangul: false        // 현재 한글 입력 모드인지 여부
};

// 전역 변수 및 상수
let keyboardInitialized = false;
let keyPressCount = 0;
let lastKeyPressed = '';
let lastKeyEventTime = Date.now();
let keyEventQueue = [];
let keyEventProcessTimer = null;
let lastActiveApp = '';
let lastWindowTitle = '';
let isAppSwitching = false;
let activeCheckTimer = null;

// 디바운스 시간 최적화 (100ms에서 30ms로 감소)
const DEBOUNCE_TIME = 30;

// 프레임 드롭을 최소화하기 위한 최대 큐 크기
const MAX_QUEUE_SIZE = 20;

// 기본 설정 가져오기 (현재 OS에 맞게)
const currentOSConfig = PLATFORM_KEY_CONFIGS[process.platform] || PLATFORM_KEY_CONFIGS.win32;

// 키 이벤트 처리 함수 (전역 스코프로 이동)
function processKeyEventQueue() {
  if (keyEventQueue.length === 0) {
    return;
  }
  
  try {
    // 키 이벤트 처리 로직
    while (keyEventQueue.length > 0) {
      const event = keyEventQueue.shift();
      // 여기서 실제 키 이벤트 처리 로직 구현
      // 이벤트 타입, 키 코드 등을 기준으로 처리
    }
  } catch (error) {
    console.error('키 이벤트 큐 처리 중 오류:', error);
  }
}

/**
 * settings.json에서 앱 설정 가져오기
 * @returns {Object} 설정 객체
 */
function loadSettingsFromFile() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    }
  } catch (error) {
    console.error('설정 파일 로드 오류:', error);
  }
  return {};
}

/**
 * 앱/웹사이트 타이핑 통계 업데이트
 * @param {string} appName - 앱 이름
 * @param {string} windowTitle - 창 제목
 * @param {string} url - 웹사이트 URL (있는 경우)
 * @param {number} typingCount - 타이핑 수
 * @param {number} typingTime - 타이핑 시간 (ms)
 */
function updateAppTypingStats(appName, windowTitle, url, typingCount = 1, typingTime = 100) {
  if (!appState.isTracking) return;
  
  try {
    // 설정에서 모니터링할 앱/웹사이트 목록 가져오기
    const settings = loadSettingsFromFile();
    const monitoredApps = settings.monitoredApps || [];
    const monitoredWebsites = settings.monitoredWebsites || [];
    
    // 앱 이름 또는 URL이 모니터링 목록에 있는지 확인
    let isMonitored = monitoredApps.some(app => 
      appName.toLowerCase().includes(app.toLowerCase())
    );
    
    // URL이 있으면 웹사이트 모니터링 확인
    if (url && !isMonitored) {
      isMonitored = monitoredWebsites.some(site => 
        url.toLowerCase().includes(site.toLowerCase())
      );
    }
    
    // 모니터링 대상이면 타이핑 통계 업데이트
    if (isMonitored) {
      debugLog(`모니터링 대상 앱/웹사이트 타이핑 감지: ${appName}, ${url || windowTitle}`);
      
      // stats 모듈의 processKeyInput 함수 호출
      const processKeyInputFn = getProcessKeyInput();
      if (processKeyInputFn) {
        // 타이핑 수와 시간을 증가시키기 위해 여러 번 호출
        for (let i = 0; i < typingCount; i++) {
          processKeyInputFn({
            key: 'VirtualTyping',
            isComposing: false,
            windowTitle: windowTitle,
            appName: appName,
            url: url || '',
            timestamp: Date.now()
          });
        }
        
        // 메인 윈도우가 있으면 현재 감지된 앱 정보 전송
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('active-app-changed', {
            appName,
            windowTitle,
            url: url || '',
            timestamp: Date.now(),
            isMonitored: true
          });
        }
      }
    } else {
      debugLog(`모니터링 제외 앱/웹사이트: ${appName}, ${url || windowTitle}`);
    }
  } catch (error) {
    console.error('앱 타이핑 통계 업데이트 오류:', error);
  }
}

// IPC를 통한 키보드 이벤트 처리
function setupKeyboardIpcHandlers() {
  try {
    // 기존 IPC 핸들러 제거 시도
    try {
      ipcMain.removeHandler('keyboard-event');
      ipcMain.removeHandler('sendKeyboardEvent');
      ipcMain.removeAllListeners('keyboard-event');
      ipcMain.removeAllListeners('sendKeyboardEvent');
      console.log('기존 키보드 IPC 핸들러가 제거되었습니다.');
    } catch (error) {
      console.log('키보드 IPC 핸들러 제거 시도 중:', error.message);
    }

    // 새 핸들러 등록
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

    // 일반 IPC 이벤트 핸들러 등록 (비동기 방식)
    ipcMain.on('keyboard-event', (event, data) => {
      try {
        debugLog(`IPC 키보드 이벤트(on) 수신: ${JSON.stringify(data)}`);
        
        // 키 이벤트 큐에 추가
        keyEventQueue.push({
          key: data.key,
          code: data.code || '',
          timestamp: Date.now(),
          type: data.type || 'keyDown',
          ...(data.text && { text: data.text }),
          fromIpcOn: true
        });
        
        // 디바운스 타이머 설정
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
      } catch (error) {
        console.error('IPC 키보드 이벤트(on) 처리 오류:', error);
      }
    });
    
    // 추가 키보드 이벤트 핸들러 (대체 API)
    ipcMain.on('sendKeyboardEvent', (event, data) => {
      try {
        debugLog(`대체 키보드 이벤트 API 사용: ${JSON.stringify(data)}`);
        
        // 키 이벤트 큐에 추가
        keyEventQueue.push({
          ...data,
          timestamp: Date.now(),
          fromRendererOn: true
        });
        
        // 디바운스 타이머 설정
        clearTimeout(keyEventProcessTimer);
        keyEventProcessTimer = setTimeout(processKeyEventQueue, DEBOUNCE_TIME);
      } catch (error) {
        console.error('대체 키보드 API 이벤트 처리 오류:', error);
      }
    });

    console.log('키보드 IPC 핸들러가 성공적으로 설정되었습니다.');
    return true;
  } catch (error) {
    console.error('키보드 IPC 핸들러 설정 오류:', error);
    return false;
  }
}

/**
 * 키보드 이벤트 감지 로직 개선
 * - 중복 키 입력 처리 로직 추가
 * - 특수 문자 구분 처리 (ex: /와 ? 구분)
 * - Command+Tab / Alt+Tab 감지 개선
 */
function setupKeyboardListener() {
  try {
    debugLog('키보드 리스너 설정 중...');
    debugLog(`현재 플랫폼: ${process.platform}`);

    // 이미 등록된 단축키가 있으면 해제
    globalShortcut.unregisterAll();

    // IPC 핸들러 등록
    setupKeyboardIpcHandlers();

    // 현재 눌린 특수 키 추적 (개선된 버전)
    const pressedModifiers = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false, // Command (macOS) 또는 Windows 키
      lastPressTime: {} // 각 키별 마지막 입력 시간 추적
    };

    // 키 입력 이벤트 큐 (빠른 연속 입력 처리 최적화)
    keyEventQueue = [];
    keyEventProcessTimer = null;
    
    // 디바운스 시간 최적화 (중복 키 입력 방지)
    const DEBOUNCE_TIME = 50; // ms
    const KEY_PRESS_COOLDOWN = 50; // 같은 키 재입력 대기 시간 (ms)

    // 마지막 키 이벤트 타임스탬프
    let lastKeyEventTime = Date.now();
    
    // 활성 상태 체크 타이머
    activeCheckTimer = null;
    
    // 앱 전환 감지 변수
    lastActiveApp = '';
    lastWindowTitle = '';
    isAppSwitching = false;
    let appSwitchTimer = null;
    
    // 이미 처리된 키 추적 (중복 처리 방지)
    let processedKeys = new Map();
    
    // 마지막으로 처리된 키와 카운트
    let lastKeyPressed = '';
    let keyPressCount = 0;

    // 한글 자모음 조합 상태 추적 개선
    const hangulState = {
      isComposing: false,
      buffer: '',
      startTime: 0,
      lastChar: '',
      composingKeys: new Set()
    };
    
    // 특수 키 목록 (처리하지 않을 키)
    const SPECIAL_KEYS = [
      'Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'FnLock', 
      'Hyper', 'Meta', 'NumLock', 'ScrollLock', 'Shift', 'Super', 
      'Tab', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 
      'End', 'Home', 'PageDown', 'PageUp', 'Escape', 'F1', 'F2', 
      'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];

    // 플랫폼별 키 매핑 구성
    const getModifierKeyByPlatform = (key) => {
      if (!key) return null;
      if (key === 'Alt' || key.toLowerCase() === 'alt') return 'alt';
      if (key === 'Control' || key.toLowerCase() === 'control' || key === 'ctrl') return 'ctrl';
      if (key === 'Shift' || key.toLowerCase() === 'shift') return 'shift';
      if (key === 'Meta' || key === 'Command' || key === 'Super' || key === 'Win') return 'meta';
      return null;
    };

    
    /**
     * 앱 전환 감지 함수 (개선된 버전)
     * @param {string} key - 입력된 키
     * @param {Object} modifiers - 수정자 키 상태
     * @returns {boolean} - 앱 전환 여부
     */
    const detectAppSwitching = (key, modifiers) => {
      try {
        // Command+Tab (macOS) 또는 Alt+Tab (Windows/Linux) 감지
        const isMac = process.platform === 'darwin';
        const isAppSwitchingCombo = (
          (isMac && key === 'Tab' && modifiers.meta) || 
          (!isMac && key === 'Tab' && modifiers.alt)
        );
        
        if (isAppSwitchingCombo) {
          // 앱 전환 상태 설정 및 로깅
          isAppSwitching = true;
          
          // 디버깅 메시지 추가 (화면 전환 감지)
          debugLog(`화면 전환 감지: ${isMac ? 'Command+Tab' : 'Alt+Tab'} 조합이 눌렸습니다.`);
          
          // 앱 전환 타이머 설정 (이전 타이머가 있으면 제거)
          if (appSwitchTimer) {
            clearTimeout(appSwitchTimer);
          }
          
          // 앱 전환 후 일정 시간 후에 새 앱의 정보를 가져옴
          appSwitchTimer = setTimeout(async () => {
            try {
              // 활성 창 정보 가져오기
              const activeWindowInfo = await activeWin();
              
              if (activeWindowInfo) {
                const newAppName = activeWindowInfo.owner?.name || 'Unknown App';
                const newWindowTitle = activeWindowInfo.title || 'Unknown Window';
                
                // 앱이 실제로 변경되었는지 확인
                if (newAppName !== lastActiveApp || newWindowTitle !== lastWindowTitle) {
                  debugLog(`화면 전환 완료: ${lastActiveApp || 'Unknown'} -> ${newAppName}`);
                  debugLog(`새 창 제목: ${newWindowTitle}`);
                  
                  // 브라우저 감지 시도
                  const browserName = detectBrowserName(activeWindowInfo);
                  const url = activeWindowInfo.url || '';
                  
                  // URL 정보 출력 (디버깅)
                  if (browserName) {
                    debugLog(`감지된 브라우저: ${browserName}, URL: ${url || 'N/A'}`);
                  }
                  
                  // 앱/웹사이트 통계 업데이트
                  updateAppTypingStats(
                    newAppName,
                    newWindowTitle,
                    url,
                    5, // 가상 타이핑 수 증가
                    200 // 타이핑 시간 (ms)
                  );
                  
                  // 마지막 감지된 앱 정보 업데이트
                  lastActiveApp = newAppName;
                  lastWindowTitle = newWindowTitle;
                } else {
                  debugLog('화면 전환 감지되었으나 동일한 앱/창으로 전환됨');
                }
              } else {
                debugLog('활성 창 정보를 가져올 수 없음');
              }
              
              // 앱 전환 상태 초기화
              isAppSwitching = false;
            } catch (error) {
              console.error('앱 전환 처리 오류:', error);
              isAppSwitching = false;
            }
          }, 300); // 앱 전환이 완료될 때까지 300ms 대기
          
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('앱 전환 감지 오류:', error);
        return false;
      }
    };

    /**
     * 키 이벤트 큐 처리 함수 (개선된 버전)
     */
    const processKeyEventQueue = () => {
      try {
        if (keyEventQueue.length === 0) return;
        
        // 현재 처리할 이벤트만 가져오고 큐에서 제거 (메모리 압력 감소)
        const keyEvents = [...keyEventQueue];
        keyEventQueue = [];
        
        // 중복 키 제거 로직 (같은 키가 연속으로 눌리는 경우 첫 번째만 유지)
        const uniqueEvents = [];
        const seenKeys = new Set();
        
        for (const keyEvent of keyEvents) {
          // undefined 키는 무시 (text가 있으면 처리)
          if (keyEvent.key === undefined && !keyEvent.text) {
            debugLog('정의되지 않은 키 입력 무시: undefined');
            continue;
          }
          
          // 한글 조합 관련 이벤트는 모두 처리
          if (keyEvent.isComposing || keyEvent.type === 'compositionstart' || 
              keyEvent.type === 'compositionupdate' || keyEvent.type === 'compositionend') {
            // 한글 조합 관련 이벤트에 특별 처리 추가
            // 스페이스바 관련 처리 추가
            if (keyEvent.key === ' ' || keyEvent.code === 'Space') {
              keyEvent.text = ' '; // 스페이스를 명시적으로 공백으로 처리
            }
            uniqueEvents.push(keyEvent);
            continue;
          }
        
          // 특수 키(수정자 키)는 항상 처리
          const isModifier = getModifierKeyByPlatform(keyEvent.key) !== null;
          
          // 특수 키이거나 아직 처리되지 않은 키면 추가
          if (isModifier || !seenKeys.has(keyEvent.key)) {
            uniqueEvents.push(keyEvent);
            seenKeys.add(keyEvent.key);
          } else {
            // 중복 키 감지 디버깅
            debugLog(`중복 키 입력 무시: ${keyEvent.key}`);
          }
        }
        
        // 필터링된 이벤트 처리
        for (const keyEvent of uniqueEvents) {
          const { key, shiftKey, ctrlKey, altKey, metaKey, timestamp, isComposing } = keyEvent;
          
          // key가 undefined인 경우 처리하지 않음
          if (key === undefined) {
            continue;
          }
          
          // 이미 처리된 키인지 확인 (타임스탬프로 구분)
          const keyId = `${key}-${timestamp}`;
          if (processedKeys.has(keyId)) {
            continue;
          }
          
          // 앱 전환 키 조합 감지
          const modifiers = { shift: shiftKey, ctrl: ctrlKey, alt: altKey, meta: metaKey };
          if (detectAppSwitching(key, modifiers)) {
            continue; // 앱 전환이면 더 이상 처리하지 않음
          }
          
          // 특수 문자 구분 처리 개선
          // 예: Shift+/ = ? 처리
          let processedKey = key;
          
          // Shift 키와 함께 눌린 특수 문자 매핑
          if (shiftKey && key.length === 1) {
            const shiftKeyMap = {
              '/': '?',
              '1': '!',
              '2': '@',
              '3': '#',
              '4': '$',
              '5': '%',
              '6': '^',
              '7': '&',
              '8': '*',
              '9': '(',
              '0': ')',
              '-': '_',
              '=': '+',
              '\\': '|',
              '[': '{',
              ']': '}',
              ';': ':',
              '': '"',
              ',': '<',
              '.': '>',
              '`': '~'
            };
            
            processedKey = shiftKeyMap[key] || key;
          }
          
          // 한글 입력 이벤트 처리 - compositionupdate, compositionend 이벤트도 처리
          if (isComposing) {
            debugLog(`한글 입력 중: ${processedKey}`);
            
            try {
              // 완성된 한글 문자인 경우만 카운트
              if ((keyEvent.type === 'compositionend' || keyEvent.type === 'compositionupdate') && (keyEvent.text || keyEvent.key === ' ')) {
                const processKeyInputFn = getProcessKeyInput();
                if (processKeyInputFn) {
                  // 스페이스바 처리 개선
                  const textToProcess = keyEvent.key === ' ' ? ' ' : (keyEvent.text || '');
                  
                  processKeyInputFn({
                    key: textToProcess,
                    code: keyEvent.code || '',
                    shiftKey,
                    ctrlKey,
                    altKey,
                    metaKey,
                    timestamp,
                    isComposing: true,
                    text: textToProcess
                  });
                  
                  // 처리된 키 기록 (중복 방지)
                  processedKeys.set(keyId, true);
                  
                  keyPressCount++;
                  lastKeyPressed = keyEvent.text;
                  debugLog(`한글 처리: ${keyEvent.text}, 총 키 입력 수: ${keyPressCount}`);
                }
              }
            } catch (error) {
              console.error('한글 키 처리 오류:', error);
            }
            
            continue; // 다음 키 처리
          }
          
          // 특수 키 처리 최적화
          if (!SPECIAL_KEYS.includes(processedKey)) {
            try {
              // 실제 키 입력 처리 (processKeyInput 함수 호출)
              const processKeyInputFn = getProcessKeyInput();
              if (processKeyInputFn) {
                processKeyInputFn({
                  key: processedKey,
                  code: keyEvent.code,
                  shiftKey,
                  ctrlKey,
                  altKey,
                  metaKey,
                  timestamp,
                  isComposing: keyEvent.isComposing
                });
                
                // 처리된 키 기록 (중복 방지)
                processedKeys.set(keyId, true);
                
                // 1분 후 맵에서 제거 (메모리 관리)
                setTimeout(() => {
                  processedKeys.delete(keyId);
                }, 60000);
                
                // 유효한 키 입력만 카운트
                if (processedKey && typeof processedKey === 'string' && processedKey.length > 0) {
                  keyPressCount++;
                  lastKeyPressed = processedKey;
                  debugLog(`총 키 입력 수: ${keyPressCount}, 마지막 키: ${lastKeyPressed}`);
                }
              }
            } catch (error) {
              console.error('키 처리 오류:', error);
            }
          }
        }
      } catch (error) {
        console.error('키 이벤트 큐 처리 오류:', error);
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
        if (SPECIAL_KEYS.includes(input.key)) {
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
        // 이미 설정된 이벤트 리스너 제거
        if (window._loopKeyHandlersSet) {
          document.removeEventListener('keydown', window._loopKeydownHandler);
          document.removeEventListener('compositionstart', window._loopCompositionStartHandler);
          document.removeEventListener('compositionupdate', window._loopCompositionUpdateHandler);
          document.removeEventListener('compositionend', window._loopCompositionEndHandler);
        }
        
        // 키 입력 이벤트 핸들러 정의
        window._loopKeydownHandler = (e) => {
          // 구글 문서에서 특별 처리
          const isGoogleDocs = window.location.href.includes('docs.google.com');
          
          // 이벤트 전송
          window.electronAPI.sendKeyboardEvent({
            key: e.key,
            code: e.code,
            type: 'keyDown',
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            isGoogleDocs
          });
          
          // 구글 문서에서는 콘솔에 추가 디버깅 메시지
          if (isGoogleDocs) {
            console.log('구글 문서 키 이벤트 감지:', e.key);
          }
        };
        
        // 한글 조합 이벤트 핸들러 정의
        window._loopCompositionStartHandler = (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionstart'
          });
        };
        
        window._loopCompositionUpdateHandler = (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionupdate',
            text: e.data
          });
        };
        
        window._loopCompositionEndHandler = (e) => {
          window.electronAPI.sendKeyboardEvent({
            type: 'compositionend',
            text: e.data
          });
        };
        
        // 이벤트 리스너 등록
        document.addEventListener('keydown', window._loopKeydownHandler);
        document.addEventListener('compositionstart', window._loopCompositionStartHandler);
        document.addEventListener('compositionupdate', window._loopCompositionUpdateHandler);
        document.addEventListener('compositionend', window._loopCompositionEndHandler);
        
        // 플래그 설정
        window._loopKeyHandlersSet = true;
        
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
        HANGUL_STATUS.intermediateChars = '';
        
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
        HANGUL_STATUS.intermediateChars = text;
        
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
        HANGUL_STATUS.intermediateChars = '';
        
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
        // mouseMove, mouseWheel, scroll 이벤트는 무시 (성능 향상을 위해)
        if (inputEvent.type === 'mouseMove' || 
            inputEvent.type === 'mouseWheel' || 
            inputEvent.type === 'scroll' || 
            inputEvent.type === 'wheel' || 
            inputEvent.type.toLowerCase().includes('mouse') || 
            inputEvent.type.toLowerCase().includes('scroll')) {
          return;
        }
        
        debugLog(`MacOS input-event: ${JSON.stringify(inputEvent)}`);
        if (inputEvent.type === 'keyDown' && !SPECIAL_KEYS.includes(inputEvent.key)) {
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

    // 초기화 및 이벤트 등록
    registerKeyboardEvents();
    
    // 활성 창 변경 감지를 위한 주기적 체크
    if (activeCheckTimer) {
      clearInterval(activeCheckTimer);
    }
    
    activeCheckTimer = setInterval(async () => {
      if (appState.isTracking) {
        try {
          const activeWindowInfo = await activeWin();
          if (activeWindowInfo) {
            const currentAppName = activeWindowInfo.owner?.name || 'Unknown App';
            const currentWindowTitle = activeWindowInfo.title || 'Unknown Window';
            const currentUrl = activeWindowInfo.url || '';
            
            // 앱이 변경되었는지 확인
            if (lastActiveApp && lastActiveApp !== currentAppName) {
              debugLog(`주기적 체크: 앱 전환 감지 ${lastActiveApp} -> ${currentAppName}`);
              
              // 앱 전환 후 타이핑 통계 업데이트
              updateAppTypingStats(
                currentAppName,
                currentWindowTitle,
                currentUrl,
                3, // 가상 타이핑 수
                150 // 타이핑 시간 (ms)
              );
            }
            
            // 앱 정보 업데이트
            lastActiveApp = currentAppName;
            lastWindowTitle = currentWindowTitle;
          }
        } catch (error) {
          console.error('active-win 호출 오류:', error);
          debugLog('기본 창 정보 사용');
        }
      }
    }, 2000); // 2초마다 체크 (부하 감소를 위해)

    // 리소스 정리 함수 반환
    return {
      dispose: () => {
        debugLog('키보드 리스너 정리 중...');
        if (activeCheckTimer) {
          clearInterval(activeCheckTimer);
          activeCheckTimer = null;
        }
        
        if (appSwitchTimer) {
          clearTimeout(appSwitchTimer);
          appSwitchTimer = null;
        }
        
        if (keyEventProcessTimer) {
          clearInterval(keyEventProcessTimer);
          keyEventProcessTimer = null;
        }
        
        // 글로벌 단축키 등록 해제
        globalShortcut.unregisterAll();
        
        // 상태 초기화
        keyEventQueue = [];
        processedKeys.clear();
        debugLog('키보드 리스너 정리 완료');
      }
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
    // 이미 등록된 단축키가 있으면 해제
    globalShortcut.unregisterAll();
    
    // 모니터링 시작/중지 단축키
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (appState.isTracking) {
        // 모니터링 중지
        ipcMain.emit('stop-tracking');
      } else {
        // 모니터링 시작
        ipcMain.emit('start-tracking');
      }
    });
    
    // 앱 전환 감지 단축키 (Command+Tab / Alt+Tab)
    const appSwitchShortcut = process.platform === 'darwin' ? 'Command+Tab' : 'Alt+Tab';
    globalShortcut.register(appSwitchShortcut, () => {
      debugLog('앱 전환 단축키 감지');
      
      // 앱 전환 상태 설정
      isAppSwitching = true;
      
      // 앱 전환 타이머 설정
      if (appSwitchTimer) clearTimeout(appSwitchTimer);
      appSwitchTimer = setTimeout(async () => {
        try {
          // 활성 창 정보 가져오기
          const activeWindowInfo = await activeWin();
          if (activeWindowInfo && appState.isTracking) {
            const appName = activeWindowInfo.owner?.name || 'Unknown App';
            const windowTitle = activeWindowInfo.title || 'Unknown Window';
            const url = activeWindowInfo.url || '';
            
            // 타이핑 통계 업데이트
            updateAppTypingStats(appName, windowTitle, url, 5, 500);
          }
        } catch (error) {
          console.error('앱 전환 감지 오류:', error);
        }
        
        isAppSwitching = false;
      }, 500);
    });
    
    debugLog('글로벌 단축키 등록 완료');
    return true;
  } catch (error) {
    console.error('글로벌 단축키 등록 오류:', error);
    return false;
  }
}

/**
 * 키보드 입력 시뮬레이션 (테스트용)
 * @param {string} key - 시뮬레이션할 키
 */
function simulateKeyPress(key) {
  if (!key) return false;
  
  try {
    const simulatedEvent = {
      type: 'keyDown',
      key: key,
      code: `Key${key.toUpperCase()}`,
      keyCode: key.charCodeAt(0)
    };
    
    // 통계 모듈에 시뮬레이션된 키 이벤트 전송
    getProcessKeyInput()('시뮬레이션 창', '시뮬레이션 앱', simulatedEvent);
    
    return true;
  } catch (error) {
    console.error('키 입력 시뮬레이션 오류:', error);
    return false;
  }
}

module.exports = {
  setupKeyboardListener,
  registerGlobalShortcuts,
  simulateKeyPress, // 테스트용 함수 추가
  setupKeyboardIpcHandlers, // 이 함수 내보내기 추가
};
