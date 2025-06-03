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

// 키보드 핸들러 등록 여부 추적을 위한 전역 플래그
let keyboardHandlersRegistered = false;

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

// 권한 오류 추적을 위한 상태 변수
let hasReportedScreenRecordingPermissionError = false;

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

// IME Composition 이벤트 관리를 위한 객체
const IME_COMPOSITION = {
  isComposing: false,
  lastComposedText: '',
  compositionStart: 0,
  compositionBuffer: '',
  lastCompletedText: '',
  lastWindowInfo: null,
  totalTypingCount: 0
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

// 한글 자모 테이블 정의
const CHOSEONG_TABLE = {
  'ㄱ': 0, 'ㄲ': 1, 'ㄴ': 2, 'ㄷ': 3, 'ㄸ': 4, 'ㄹ': 5, 'ㅁ': 6, 'ㅂ': 7,
  'ㅃ': 8, 'ㅅ': 9, 'ㅆ': 10, 'ㅇ': 11, 'ㅈ': 12, 'ㅉ': 13, 'ㅊ': 14, 'ㅋ': 15,
  'ㅌ': 16, 'ㅍ': 17, 'ㅎ': 18
};

const JUNGSEONG_TABLE = {
  'ㅏ': 0, 'ㅐ': 1, 'ㅑ': 2, 'ㅒ': 3, 'ㅓ': 4, 'ㅔ': 5, 'ㅕ': 6, 'ㅖ': 7,
  'ㅗ': 8, 'ㅘ': 9, 'ㅙ': 10, 'ㅚ': 11, 'ㅛ': 12, 'ㅜ': 13, 'ㅝ': 14, 'ㅞ': 15,
  'ㅟ': 16, 'ㅠ': 17, 'ㅡ': 18, 'ㅢ': 19, 'ㅣ': 20
};

const JONGSEONG_TABLE = {
  '': 0,  // 종성 없음
  'ㄱ': 1, 'ㄲ': 2, 'ㄳ': 3, 'ㄴ': 4, 'ㄵ': 5, 'ㄶ': 6, 'ㄷ': 7,
  'ㄹ': 8, 'ㄺ': 9, 'ㄻ': 10, 'ㄼ': 11, 'ㄽ': 12, 'ㄾ': 13, 'ㄿ': 14, 'ㅀ': 15,
  'ㅁ': 16, 'ㅂ': 17, 'ㅄ': 18, 'ㅅ': 19, 'ㅆ': 20, 'ㅇ': 21, 'ㅈ': 22, 'ㅊ': 23,
  'ㅋ': 24, 'ㅌ': 25, 'ㅍ': 26, 'ㅎ': 27
};

// 복합 자모 테이블 (두 개의 자모가 합쳐질 때)
const COMPLEX_JUNGSEONG = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ'
};

const COMPLEX_JONGSEONG = {
  'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ',
  'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ'
};

// 자모 버퍼 변수
let composerState = {
  choBuffer: '',
  jungBuffer: '',
  jongBuffer: '',
  compositionState: 0, // 0: 초성 대기, 1: 중성 대기, 2: 종성 대기
  result: ''
};

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

/**
 * 한글 자모를 조합하여 완성형 한글 음절 생성
 * @param {string} cho - 초성 문자
 * @param {string} jung - 중성 문자
 * @param {string} jong - 종성 문자 (또는 빈 문자열)
 * @returns {string} 완성형 한글 음절
 */
function composeHangul(cho, jung, jong = '') {
  // 유효성 검사
  if (!CHOSEONG_TABLE.hasOwnProperty(cho) ||
      !JUNGSEONG_TABLE.hasOwnProperty(jung) ||
      (!jong || !JONGSEONG_TABLE.hasOwnProperty(jong))) {
    return '';
  }

  const LIndex = CHOSEONG_TABLE[cho];
  const VIndex = JUNGSEONG_TABLE[jung];
  const TIndex = JONGSEONG_TABLE[jong || ''];

  // Unicode 음절 계산 공식
  const SBase = 0xAC00;
  const LCount = 19;   // 초성 개수
  const VCount = 21;   // 중성 개수
  const TCount = 28;   // 종성 개수
  const NCount = VCount * TCount; // 588
  const TOffset = SBase + (LIndex * NCount) + (VIndex * TCount) + TIndex;

  return String.fromCharCode(TOffset);
}

/**
 * 한글 완성형 문자를 초성, 중성, 종성으로 분해
 * @param {string} syllable - 한글 완성형 음절 (예: '간')
 * @returns {object} 분해된 초성, 중성, 종성 객체
 */
function decomposeHangul(syllable) {
  if (!/^[가-힣]$/.test(syllable)) {
    return { cho: '', jung: '', jong: '' };
  }

  const code = syllable.charCodeAt(0) - 0xAC00;
  
  const jong = code % 28;
  const jung = Math.floor((code % 588) / 28);
  const cho = Math.floor(code / 588);
  
  const choList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const jungList = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const jongList = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  
  return {
    cho: choList[cho],
    jung: jungList[jung],
    jong: jongList[jong]
  };
}

/**
 * 개별 자모 입력을 처리하여 한글 조합
 * @param {string} char - 입력된 자모 문자
 * @returns {object} 조합 상태 및 결과
 */
function processJamo(char) {
  // 영문이나 숫자, 특수문자인 경우 바로 반환
  if (!/^[ㄱ-ㅎㅏ-ㅣ]$/.test(char)) {
    // 이전 조합 완료
    const result = finishComposition();
    return {
      result: result + char,
      reset: true
    };
  }
  
  // 상태에 따른 처리
  switch (composerState.compositionState) {
    // 초성 대기 상태
    case 0:
      if (char in CHOSEONG_TABLE) {
        composerState.choBuffer = char;
        composerState.compositionState = 1;
        return { result: '', reset: false };
      }
      // 중성이 먼저 들어온 경우 (외래어 등)
      if (char in JUNGSEONG_TABLE) {
        return { result: char, reset: true };
      }
      return { result: char, reset: true };
    
    // 중성 대기 상태
    case 1:
      if (char in JUNGSEONG_TABLE) {
        composerState.jungBuffer = char;
        composerState.compositionState = 2;
        return {
          result: composeHangul(composerState.choBuffer, composerState.jungBuffer),
          reset: false
        };
      } else {
        // 불가능한 조합: 초성만 있고 다음 글자가 초성인 경우
        const result = composerState.choBuffer;
        composerState.choBuffer = char;
        composerState.compositionState = char in CHOSEONG_TABLE ? 1 : 0;
        return { result, reset: false };
      }
    
    // 종성 대기 상태
    case 2:
      if (char in JONGSEONG_TABLE) {
        composerState.jongBuffer = char;
        return {
          result: composeHangul(
            composerState.choBuffer,
            composerState.jungBuffer,
            composerState.jongBuffer
          ),
          reset: false
        };
      } else if (char in CHOSEONG_TABLE) {
        // 다음 글자의 초성이 들어온 경우
        const result = composeHangul(
          composerState.choBuffer,
          composerState.jungBuffer,
          composerState.jongBuffer
        );
        composerState.choBuffer = char;
        composerState.jungBuffer = '';
        composerState.jongBuffer = '';
        composerState.compositionState = 1;
        return { result, reset: false };
      } else if (char in JUNGSEONG_TABLE) {
        // 다음 글자의 중성이 들어온 경우 (이전 글자 종료 후, 초성 없는 상태로)
        const result = composeHangul(
          composerState.choBuffer,
          composerState.jungBuffer,
          composerState.jongBuffer
        );
        composerState.choBuffer = '';
        composerState.jungBuffer = char;
        composerState.jongBuffer = '';
        composerState.compositionState = 1;
        return { result, reset: false };
      }
      return { result: char, reset: true };
    
    default:
      return { result: char, reset: true };
  }
}

/**
 * 현재 조합 중인 글자 완료하고 상태 초기화
 * @returns {string} 조합 완료된 글자
 */
function finishComposition() {
  let result = '';
  
  // 조합 상태에 따라 다른 처리
  if (composerState.compositionState === 0) {
    // 초성 대기 상태 - 아무것도 없음
    result = '';
  } else if (composerState.compositionState === 1) {
    // 중성 대기 상태 - 초성만 있음
    result = composerState.choBuffer;
  } else if (composerState.compositionState === 2) {
    // 종성 대기 상태 - 초성+중성 또는 초성+중성+종성
    result = composeHangul(
      composerState.choBuffer,
      composerState.jungBuffer,
      composerState.jongBuffer
    );
  }
  
  // 상태 초기화
  composerState.choBuffer = '';
  composerState.jungBuffer = '';
  composerState.jongBuffer = '';
  composerState.compositionState = 0;
  
  return result;
}

/**
 * IME Composition 이벤트 처리 함수
 * 한글 자모 조합 결과를 처리합니다.
 * @param {Object} event - IPC 이벤트 객체
 * @param {Object} data - IME Composition 이벤트 데이터
 */
function handleImeCompositionEvent(event, data) {
  if (!data) return;
  
  try {
    const { type, text, timestamp = Date.now() } = data;
    
    switch (type) {
      case 'compositionstart':
        // 조합 시작
        IME_COMPOSITION.isComposing = true;
        IME_COMPOSITION.compositionStart = timestamp;
        IME_COMPOSITION.compositionBuffer = '';
        debugLog(`IME 조합 시작: ${timestamp}`);
        break;
        
      case 'compositionupdate':
        // 조합 중간 업데이트
        if (IME_COMPOSITION.isComposing) {
          IME_COMPOSITION.compositionBuffer = text;
          debugLog(`IME 조합 업데이트: ${text}`);
        }
        break;
        
      case 'compositionend':
        // 조합 완료
        if (IME_COMPOSITION.isComposing) {
          IME_COMPOSITION.isComposing = false;
          IME_COMPOSITION.lastCompletedText = text;
          
          // 입력 완료 시점의 활성 창 정보 가져오기 (비동기)
          getActiveWindowInfo().then(windowInfo => {
            if (windowInfo) {
              // 완성된 텍스트 길이만큼 타이핑 카운트 증가
              const charCount = text.length;
              IME_COMPOSITION.totalTypingCount += charCount;
              
              // 브라우저 정보 및 URL 감지
              const browserName = detectBrowserName(windowInfo);
              const isGoogleDocs = isGoogleDocsWindow(windowInfo);
              
              debugLog(`IME 조합 완료: '${text}' (${charCount}자), 앱: ${windowInfo.owner?.name || '알 수 없음'}, 브라우저: ${browserName || '해당 없음'}, Google Docs: ${isGoogleDocs}`);
              
              // 타이핑 통계 업데이트 (완성된 글자 단위로)
              updateAppTypingStats(
                browserName || windowInfo.owner?.name || '알 수 없음',
                windowInfo.title || '',
                windowInfo.url || '',
                charCount,
                timestamp - IME_COMPOSITION.compositionStart
              );
              
              // 이벤트 처리 완료 후 저장
              IME_COMPOSITION.lastWindowInfo = windowInfo;
            }
          }).catch(error => {
            console.error('활성 창 정보 가져오기 실패:', error);
          });
          
          debugLog(`IME 조합 완료: '${text}'`);
          
          // 렌더러로 완성된 텍스트 알림
          if (event.sender) {
            try {
              event.sender.send('ime-composition-completed', {
                text,
                    timestamp,
                duration: timestamp - IME_COMPOSITION.compositionStart
              });
            } catch (err) {
              console.warn('렌더러에 IME 완료 알림 실패:', err);
            }
          }
        }
        break;
        
      // 자모 단위 입력 처리 (외부 앱에서 IME 없이 자모 입력 시)
      case 'jamo':
        {
          // 자모 입력 처리
          const result = processJamo(text);
          debugLog(`자모 입력 처리: ${text} → ${result.result}`);
          
          // 완성된 결과가 있으면 통계 업데이트
          if (result.result) {
            // 렌더러로 결과 알림
            if (event.sender) {
              try {
                event.sender.send('jamo-processed', {
                  input: text,
                  result: result.result,
                  timestamp
                });
              } catch (err) {
                console.warn('렌더러에 자모 처리 결과 알림 실패:', err);
              }
            }
            
            // 완전히 조합이 완료된 경우에만 통계 업데이트
            if (result.reset) {
              getActiveWindowInfo().then(windowInfo => {
                if (windowInfo) {
                  const charCount = result.result.length;
                  
                  // 브라우저 정보 및 URL 감지
                  const browserName = detectBrowserName(windowInfo);
                  
                  // 타이핑 통계 업데이트 (완성된 글자 단위로)
                  updateAppTypingStats(
                    browserName || windowInfo.owner?.name || '알 수 없음',
                    windowInfo.title || '',
                    windowInfo.url || '',
                    charCount,
                    100 // 임의의 시간 (ms)
                  );
                }
              }).catch(error => {
                console.error('활성 창 정보 가져오기 실패:', error);
              });
            }
          }
        }
        break;
        
      default:
        debugLog(`알 수 없는 IME 이벤트 타입: ${type}`);
    }
    
  } catch (error) {
    console.error('IME Composition 이벤트 처리 중 오류 발생:', error);
  }
}

/**
 * 현재 활성화된 창의 정보를 가져옵니다.
 * @returns {Promise<Object>} 활성 창 정보
 */
async function getActiveWindowInfo() {
  try {
    return await activeWin();
  } catch (error) {
    console.error('활성 창 정보 가져오기 실패:', error);
    return null;
  }
}

// IPC를 통한 키보드 이벤트 처리
function setupKeyboardIpcHandlers() {
  try {
    // 이미 등록되었는지 확인
    if (keyboardHandlersRegistered) {
      console.log('키보드 IPC 핸들러가 이미 등록되어 있습니다.');
      return true;
    }
    
    // 기존 IPC 핸들러 제거 시도
    try {
      ipcMain.removeHandler('keyboard-event');
      ipcMain.removeAllListeners('keyboard-event');
      ipcMain.removeHandler('ime-composition-event');
      ipcMain.removeAllListeners('ime-composition-event');
      ipcMain.removeHandler('get-last-completed-text');
      ipcMain.removeHandler('process-jamo'); 
      ipcMain.removeHandler('finish-hangul-composition');
      ipcMain.removeHandler('decompose-hangul');
      console.log('기존 키보드 IPC 핸들러가 제거되었습니다.');
    } catch (error) {
      console.warn('기존 핸들러 제거 중 오류 (무시 가능):', error.message);
    }

    // 키보드 이벤트 핸들러 등록
    ipcMain.on('keyboard-event', (event, data) => {
      try {
        if (!data) return;
        
        // IME 조합 중인 경우 처리하지 않음
        if (data.isComposing) {
          debugLog('IME 조합 중 - 키보드 이벤트 무시');
          return;
        }
        
        // 키 이벤트 처리 로직
        debugLog(`클라이언트에서 키 이벤트 수신: ${JSON.stringify(data)}`);
        
        // 기존 키 이벤트 처리 로직 호출
        const processKeyInputFn = getProcessKeyInput();
        if (processKeyInputFn) {
          processKeyInputFn(data);
        }
      } catch (error) {
        console.error('키보드 이벤트 처리 중 오류:', error);
      }
    });
    
    // IME Composition 이벤트 핸들러 등록
    ipcMain.on('ime-composition-event', handleImeCompositionEvent);
    
    // 마지막으로 완성된 텍스트 요청 핸들러
    ipcMain.handle('get-last-completed-text', () => {
      return IME_COMPOSITION.lastCompletedText || '';
    });
    
    // 자모 처리 API - 중복 등록 방지 확인 추가
    try {
      // 이미 등록된 핸들러인지 확인
      const existingHandlers = ipcMain._invokeHandlers || {};
      const hasProcessJamoHandler = existingHandlers['process-jamo'] !== undefined;
      
      if (!hasProcessJamoHandler) {
        ipcMain.handle('process-jamo', (event, char) => {
          return processJamo(char);
        });
        console.log('process-jamo 핸들러 등록됨');
      } else {
        console.log('process-jamo 핸들러가 이미 등록되어 있어 중복 등록하지 않음');
      }
    } catch (error) {
      console.error('process-jamo 핸들러 등록 중 오류:', error);
    }
    
    // 한글 합성 완료 처리
    ipcMain.handle('finish-hangul-composition', (event) => {
      return finishComposition();
    });
    
    // 한글 분해
    ipcMain.handle('decompose-hangul', (event, syllable) => {
      return decomposeHangul(syllable);
    });
    
    // 성공적으로 등록 완료
    keyboardHandlersRegistered = true;
    console.log('키보드 IPC 핸들러가 성공적으로 설정되었습니다.');
    return true;
  } catch (error) {
    console.error('키보드 IPC 핸들러 설정 오류:', error);
    keyboardHandlersRegistered = false;
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

// 키보드 이벤트 리스너 설정
/**
 * 키보드 이벤트 리스너 설정
 * @returns {Object} 키보드 리스너 인스턴스
 */
function setupKeyboardListener() {
  try {
    console.log('키보드 이벤트 리스너 설정 중...');
    
    // 기존 키보드 이벤트 핸들러 제거
    try {
      ipcMain.removeAllListeners('keyboard-event');
      ipcMain.removeAllListeners('ime-composition-event');
      ipcMain.removeHandler('sendKeyboardEvent');
      ipcMain.removeHandler('keyboard-event');
      ipcMain.removeHandler('ime-composition-event');
      console.log('기존 키보드 이벤트 핸들러가 제거되었습니다.');
    } catch (err) {
      // 무시
    }
    
    // 중복 호출을 방지하기 위해 플래그 확인
    if (!keyboardHandlersRegistered) {
      const result = setupKeyboardIpcHandlers();
      if (result) {
        keyboardHandlersRegistered = true;
        console.log('키보드 이벤트 IPC 핸들러가 설정되었습니다.');
      }
    } else {
      console.log('키보드 IPC 핸들러가 이미 등록되어 있습니다.');
    }
    
    // 마지막 활성 창 정보 업데이트 타이머 설정
    if (activeCheckTimer) {
      clearInterval(activeCheckTimer);
    }
    
    activeCheckTimer = setInterval(async () => {
      try {
        if (!appState.isTracking) return;
        
        // 현재 활성 창 정보 가져오기
        const windowInfo = await getActiveWindowInfo();
        
        if (windowInfo) {
          if (windowInfo.app !== lastActiveApp || windowInfo.title !== lastWindowTitle) {
            // 앱 전환 감지
            const prevApp = lastActiveApp;
            const prevTitle = lastWindowTitle;
            
            lastActiveApp = windowInfo.app;
            lastWindowTitle = windowInfo.title;
            
            // 앱 전환 이벤트 발생
            isAppSwitching = true;
            console.log(`앱 전환: ${prevApp} -> ${lastActiveApp}`);
            
            // 현재 창의 브라우저 타입 감지
            const browserType = detectBrowserName(windowInfo);
            IME_COMPOSITION.browserType = browserType;
            
            // 2초 후 앱 전환 플래그 해제
            setTimeout(() => {
              isAppSwitching = false;
            }, 2000);
          }
        }
      } catch (error) {
        console.error('활성 창 정보 가져오기 실패:', error);
      }
    }, 1000);
    
    console.log('키보드 이벤트 리스너 설정 완료');
    
    // 키보드 리스너 인스턴스 반환
    return {
      active: true,
      started: Date.now(),
      dispose: () => {
        if (activeCheckTimer) {
          clearInterval(activeCheckTimer);
          activeCheckTimer = null;
        }
      }
    };
  } catch (error) {
    console.error('키보드 이벤트 리스너 설정 실패:', error);
    return null;
  }
}

module.exports = {
  setupKeyboardIpcHandlers,
  setupKeyboardListener,
  handleImeCompositionEvent,
  processJamo,
  composeHangul,
  decomposeHangul,
  finishComposition,
  registerGlobalShortcuts: () => console.log('전역 단축키 등록을 아직 구현하지 않았습니다')
};
