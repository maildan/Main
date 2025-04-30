const { globalShortcut, app, BrowserWindow } = require('electron');
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

    // 이미 등록된 단축키가 있으면 해제
    globalShortcut.unregisterAll();

    // 현재 눌린 특수 키 추적
    const pressedModifiers = {
      alt: false,
      ctrl: false,
      shift: false,
      meta: false,
    };

    // 정규 입력 처리 함수
    const handleRegularInput = async () => {
      if (!appState.isTracking) return;

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
    };

    // 메인 윈도우에서 키보드 이벤트 리스너 설정
    const registerKeyboardEvents = () => {
      const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());

      if (!mainWindow) {
        debugLog('메인 윈도우를 찾을 수 없어 웹 컨텐츠 키보드 이벤트를 설정할 수 없습니다');
        return;
      }

      mainWindow.webContents.on('before-input-event', (event, input) => {
        if (!appState.isTracking) return;

        // 특수키 상태 추적
        if (input.key === 'Alt') {
          pressedModifiers.alt = input.type === 'keyDown';
          if (input.type === 'keyDown') return; // ALT 키 누르기는 카운트하지 않음
        }
        if (input.key === 'Control') {
          pressedModifiers.ctrl = input.type === 'keyDown';
          if (input.type === 'keyDown') return; // CTRL 키 누르기는 카운트하지 않음
        }
        if (input.key === 'Shift') {
          pressedModifiers.shift = input.type === 'keyDown';
          if (input.type === 'keyDown') return; // SHIFT 키 누르기는 카운트하지 않음
        }
        if (input.key === 'Meta') {
          pressedModifiers.meta = input.type === 'keyDown';
          if (input.type === 'keyDown') return; // META(Windows 키) 누르기는 카운트하지 않음
        }
        if (input.key === 'Tab') {
          if (input.type === 'keyDown') return; // TAB 키 누르기는 카운트하지 않음
        }

        // 단축키 조합 감지 (예: ALT+TAB, CTRL+C 등)
        if (pressedModifiers.alt || pressedModifiers.ctrl || pressedModifiers.meta) {
          // 단축키는 카운트하지 않음
          return;
        }

        // 기능 키, 방향키, 기타 특수키 필터링
        if (SPECIAL_KEYS.includes(input.key.toUpperCase())) {
          return;
        }

        // 여기까지 왔다면 일반 입력 키로 간주하고 처리
        if (input.type === 'keyDown') {
          // 키 누름 이벤트만 처리
          handleRegularInput();
        }
      });

      debugLog('웹 컨텐츠 키보드 이벤트가 설정되었습니다');
    };

    // 애플리케이션 전체 단축키 등록
    globalShortcut.register('Alt+F4', () => {
      debugLog('Alt+F4 감지됨');
      // 애플리케이션 종료 방지 (필요한 경우)
      return false;
    });

    // 메인 윈도우가 생성될 때 이벤트 리스너 등록
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('did-finish-load', () => {
        registerKeyboardEvents();
      });
    });

    // 이미 생성된 윈도우에 이벤트 리스너 등록
    registerKeyboardEvents();

    debugLog('키보드 리스너가 설정되었습니다.');

    // 리소스 정리 함수 반환
    return {
      dispose: () => {
        globalShortcut.unregisterAll();
        const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());
        if (mainWindow) {
          mainWindow.webContents.removeAllListeners('before-input-event');
        }
        debugLog('키보드 리스너가 해제되었습니다.');
      },
    };
  } catch (error) {
    console.error('키보드 리스너 설정 오류:', error);
    return null;
  }
}

module.exports = {
  setupKeyboardListener,
};
