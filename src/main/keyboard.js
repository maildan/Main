const { GlobalKeyboardListener } = require('node-global-key-listener');
const activeWin = require('active-win');
const { appState, SPECIAL_KEYS } = require('./constants');
const { detectBrowserName } = require('./browser');
const { processKeyInput } = require('./stats');
const { debugLog } = require('./utils');

/**
 * 키보드 이벤트 감지 설정
 */
function setupKeyboardListener() {
  try {
    debugLog('키보드 리스너 설정 중...');
    appState.keyboardListener = new GlobalKeyboardListener();
    
    // 현재 눌린 특수 키 추적
    const pressedModifiers = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false
    };
    
    // 키 입력 감지
    appState.keyboardListener.addListener(async function(e, down) {
      if (!appState.isTracking) return;
      
      // 특수키 상태 추적
      if (e.name === 'ALT' || e.name === 'ALTGR') {
        pressedModifiers.alt = down;
        if (down) return; // ALT 키 누르기는 카운트하지 않음
      }
      if (e.name === 'CONTROL' || e.vKey === 17) {
        pressedModifiers.ctrl = down;
        if (down) return; // CTRL 키 누르기는 카운트하지 않음
      }
      if (e.name === 'SHIFT' || e.vKey === 16) {
        pressedModifiers.shift = down;
        if (down) return; // SHIFT 키 누르기는 카운트하지 않음
      }
      if (e.name === 'META' || e.vKey === 91 || e.vKey === 92) {
        pressedModifiers.meta = down;
        if (down) return; // META(Windows 키) 누르기는 카운트하지 않음
      }
      if (e.name === 'TAB' || e.vKey === 9) {
        if (down) return; // TAB 키 누르기는 카운트하지 않음
      }
      
      // 단축키 조합 감지 (예: ALT+TAB, CTRL+C 등)
      if (pressedModifiers.alt || pressedModifiers.ctrl || pressedModifiers.meta) {
        // 단축키는 카운트하지 않음
        return;
      }
      
      // 기능 키, 방향키, 기타 특수키 필터링
      if (SPECIAL_KEYS.includes(e.name)) {
        return;
      }
      
      // 여기까지 왔다면 일반 입력 키로 간주하고 처리
      if (down) { // 키 누름 이벤트만 처리
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
    });
    
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
