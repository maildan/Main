const { uIOhook, UiohookKey } = require('uiohook-napi');
const activeWin = require('active-win');
const { appState, SPECIAL_KEYS } = require('./constants');
const { detectBrowserName } = require('./browser');
const { processKeyInput } = require('./stats');
const { debugLog } = require('./utils');

// 키 누름 이벤트 처리 함수 (파일 레벨로 이동)
async function handleKeyPress() {
  try {
    const activeWindowInfo = await activeWin();
    if (!activeWindowInfo) return;

    // 브라우저 감지
    const browserName = detectBrowserName(activeWindowInfo);

    // 브라우저가 감지되면 처리 (특정 브라우저로 한정하지 않음)
    if (browserName) {
      processKeyInput(activeWindowInfo.title, browserName);
    }
  } catch (error) {
    console.error('활성 창 확인 오류:', error);
  }
}

// 키코드에서 키 이름을 가져오는 도우미 함수 (파일 레벨로 이동)
function getKeyNameFromKeycode(keycode) {
  // 일반적인 키 매핑 - 필요에 따라 확장 가능
  const keycodeMap = {
    // 알파벳 키 (a-z)
    30: 'A', 48: 'B', 46: 'C', 32: 'D', 18: 'E', 33: 'F', 34: 'G', 35: 'H', 23: 'I',
    36: 'J', 37: 'K', 38: 'L', 50: 'M', 49: 'N', 24: 'O', 25: 'P', 16: 'Q', 19: 'R',
    31: 'S', 20: 'T', 22: 'U', 47: 'V', 17: 'W', 45: 'X', 21: 'Y', 44: 'Z',
    // 숫자 키 (0-9)
    11: '0', 2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9',
    // 특수 키
    57: 'SPACE',
    // 추가 키는 필요에 따라 추가
  };

  return keycodeMap[keycode] || 'UNKNOWN';
}

/**
 * 키보드 이벤트 감지 설정
 */
function setupKeyboardListener() {
  try {
    debugLog('키보드 리스너 설정 중...');
    
    // 현재 눌린 특수 키 추적
    const pressedModifiers = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false
    };
    
    // uIOhook 키보드 이벤트 리스너 설정
    uIOhook.on('keydown', (event) => {
      if (!appState.isTracking) return;
      
      // 특수키 상태 추적
      pressedModifiers.alt = event.altKey;
      pressedModifiers.ctrl = event.ctrlKey;
      pressedModifiers.shift = event.shiftKey;
      pressedModifiers.meta = event.metaKey;
      
      // 특수키 필터링 (직접 키코드 비교)
      if (event.keycode === 56 || event.keycode === 3640) { // ALT 키
        return;
      }
      if (event.keycode === 29 || event.keycode === 3613) { // CTRL 키
        return;
      }
      if (event.keycode === 42 || event.keycode === 54) { // SHIFT 키
        return;
      }
      if (event.keycode === 3675 || event.keycode === 3676) { // META 키 (Windows/Command)
        return;
      }
      if (event.keycode === 15) { // TAB 키
        return;
      }
      
      // 단축키 조합 감지 (예: ALT+TAB, CTRL+C 등)
      if (pressedModifiers.alt || pressedModifiers.ctrl || pressedModifiers.meta) {
        // 단축키는 카운트하지 않음
        return;
      }
      
      // 기능 키, 방향키, 기타 특수키 필터링
      const keyName = getKeyNameFromKeycode(event.keycode);
      if (SPECIAL_KEYS.includes(keyName)) {
        return;
      }
      
      
      // 여기까지 왔다면 일반 입력 키로 간주하고 처리
      handleKeyPress();
    });
    
    // 리스너 시작
    uIOhook.start();
    
    // appState에 리스너 저장 (정리를 위해)
    appState.keyboardListener = {
      stop: () => {
        uIOhook.stop();
      }
    };
    
    debugLog('키보드 리스너가 설정되었습니다.');
    return appState.keyboardListener;
  } catch (error) {
    console.error('키보드 리스너 설정 오류:', error);
    return null;
  }
}

module.exports = {
  setupKeyboardListener
};
