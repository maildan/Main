/**
 * 전역 단축키 관리 모듈
 *
 * Electron 앱에서 전역 및 로컬 키보드 단축키를 관리합니다.
 */

const { globalShortcut, BrowserWindow, ipcMain } = require('electron');

// 등록된 전역 단축키 목록
const registeredShortcuts = new Map();
// 윈도우별 로컬 단축키 목록
const localShortcuts = new Map();

/**
 * 전역 단축키 등록
 * @param {string} accelerator 단축키 문자열
 * @param {function} callback 실행할 콜백 함수
 * @param {string} description 단축키 설명
 * @returns {boolean} 등록 성공 여부
 */
function registerGlobalShortcut(accelerator, callback, description = '') {
  try {
    // 이미 등록된 단축키인지 확인
    if (registeredShortcuts.has(accelerator)) {
      console.warn(`단축키가 이미 등록되어 있습니다: ${accelerator}`);
      return false;
    }

    // 단축키 등록
    const success = globalShortcut.register(accelerator, () => {
      try {
        // 콜백 실행
        callback();
      } catch (error) {
        console.error(`단축키 실행 오류 (${accelerator}):`, error);
      }
    });

    if (success) {
      // 성공적으로 등록되면 목록에 추가
      registeredShortcuts.set(accelerator, {
        callback,
        description,
        timestamp: Date.now(),
      });

      console.log(`전역 단축키 등록 성공: ${accelerator}`);
      return true;
    } else {
      console.error(`전역 단축키 등록 실패: ${accelerator}`);
      return false;
    }
  } catch (error) {
    console.error(`단축키 등록 오류 (${accelerator}):`, error);
    return false;
  }
}

/**
 * 전역 단축키 해제
 * @param {string} accelerator 단축키 문자열
 * @returns {boolean} 해제 성공 여부
 */
function unregisterGlobalShortcut(accelerator) {
  try {
    if (!registeredShortcuts.has(accelerator)) {
      console.warn(`등록되지 않은 단축키입니다: ${accelerator}`);
      return false;
    }

    // 단축키 해제
    globalShortcut.unregister(accelerator);

    // 목록에서 제거
    registeredShortcuts.delete(accelerator);

    console.log(`전역 단축키 해제 성공: ${accelerator}`);
    return true;
  } catch (error) {
    console.error(`단축키 해제 오류 (${accelerator}):`, error);
    return false;
  }
}

/**
 * 모든 전역 단축키 해제
 */
function unregisterAllGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll();
    registeredShortcuts.clear();
    console.log('모든 전역 단축키가 해제되었습니다.');
  } catch (error) {
    console.error('모든 단축키 해제 중 오류 발생:', error);
  }
}

/**
 * 로컬 윈도우 단축키 등록
 * @param {BrowserWindow} window 대상 브라우저 윈도우
 * @param {string} accelerator 단축키 문자열
 * @param {function} callback 실행할 콜백 함수
 * @returns {boolean} 등록 성공 여부
 */
function registerLocalShortcut(window, accelerator, callback) {
  if (!window || window.isDestroyed()) {
    console.error('유효하지 않은 윈도우입니다.');
    return false;
  }

  try {
    // 윈도우 ID 가져오기
    const windowId = window.id;

    // 윈도우 단축키 맵 초기화
    if (!localShortcuts.has(windowId)) {
      localShortcuts.set(windowId, new Map());
    }

    const windowShortcuts = localShortcuts.get(windowId);

    // 이미 등록된 단축키인지 확인
    if (windowShortcuts.has(accelerator)) {
      console.warn(`해당 윈도우에 이미 등록된 단축키입니다: ${accelerator}`);
      return false;
    }

    // 단축키 리스너 추가
    window.webContents.on('before-input-event', (event, input) => {
      // 단축키와 입력 일치 확인
      const isCommandOrControl = input.control || input.meta;
      const isShift = input.shift;
      const isAlt = input.alt;

      if (input.type === 'keyDown') {
        let shortcutMatched = false;

        // 단축키 형식에 따라 파싱 및 매칭
        if (accelerator.includes('+')) {
          const keys = accelerator.split('+');
          const modifiers = keys.slice(0, -1).map(m => m.toLowerCase());
          const key = keys[keys.length - 1].toLowerCase();

          const hasCtrl = modifiers.some(
            m => m === 'ctrl' || m === 'control' || m === 'commandorcontrol'
          );
          const hasShift = modifiers.includes('shift');
          const hasAlt = modifiers.includes('alt');

          shortcutMatched =
            hasCtrl === isCommandOrControl &&
            hasShift === isShift &&
            hasAlt === isAlt &&
            key === input.key.toLowerCase();
        } else {
          // 단일 키 단축키
          shortcutMatched = input.key.toLowerCase() === accelerator.toLowerCase();
        }

        if (shortcutMatched) {
          event.preventDefault();
          try {
            callback();
          } catch (error) {
            console.error(`로컬 단축키 실행 오류 (${accelerator}):`, error);
          }
        }
      }
    });

    // 단축키 목록에 추가
    windowShortcuts.set(accelerator, {
      callback,
      timestamp: Date.now(),
    });

    // 윈도우가 닫힐 때 단축키 정리 이벤트 추가
    window.once('closed', () => {
      localShortcuts.delete(windowId);
    });

    return true;
  } catch (error) {
    console.error(`로컬 단축키 등록 오류 (${accelerator}):`, error);
    return false;
  }
}

/**
 * 단축키 관리 초기화
 */
function initializeShortcuts() {
  // 앱이 종료될 때 모든 단축키 해제
  require('electron').app.on('will-quit', () => {
    unregisterAllGlobalShortcuts();
  });

  // 프론트엔드에서 단축키 등록 요청 처리
  ipcMain.handle('shortcuts:register-global', (event, { accelerator, description }) => {
    // 렌더러로부터 받은 단축키 등록 처리
    return registerGlobalShortcut(
      accelerator,
      () => {
        // 단축키가 눌렸을 때 이벤트 발생
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window && !window.isDestroyed()) {
          window.webContents.send('shortcut-triggered', { accelerator });
        }
      },
      description
    );
  });

  // 프론트엔드에서 단축키 해제 요청 처리
  ipcMain.handle('shortcuts:unregister-global', (event, { accelerator }) => {
    return unregisterGlobalShortcut(accelerator);
  });

  // 등록된 모든 단축키 조회 요청
  ipcMain.handle('shortcuts:get-all', () => {
    const shortcuts = [];
    for (const [accelerator, data] of registeredShortcuts.entries()) {
      shortcuts.push({
        accelerator,
        description: data.description,
        timestamp: data.timestamp,
      });
    }
    return shortcuts;
  });
}

/**
 * 기본 앱 단축키 설정
 */
function setupDefaultShortcuts() {
  // 개발 환경에서만 개발자 도구 단축키 등록
  if (process.env.NODE_ENV === 'development') {
    registerGlobalShortcut(
      'CommandOrControl+Shift+I',
      () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          focusedWindow.webContents.toggleDevTools();
        }
      },
      '개발자 도구 열기/닫기'
    );
  }

  // 앱 다시 시작 단축키
  registerGlobalShortcut(
    'CommandOrControl+Shift+R',
    () => {
      require('electron').app.relaunch();
      require('electron').app.exit(0);
    },
    '앱 다시 시작'
  );

  // 모든 창 닫기 단축키
  registerGlobalShortcut(
    'CommandOrControl+Shift+W',
    () => {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.close();
        }
      }
    },
    '모든 창 닫기'
  );
}

module.exports = {
  registerGlobalShortcut,
  unregisterGlobalShortcut,
  unregisterAllGlobalShortcuts,
  registerLocalShortcut,
  initializeShortcuts,
  setupDefaultShortcuts,
};
