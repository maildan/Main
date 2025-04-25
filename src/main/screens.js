/**
 * 다중 모니터 및 화면 관리 모듈
 *
 * 여러 모니터 환경에서 화면 관리 기능을 제공합니다.
 */

const { screen, app, BrowserWindow } = require('electron');
const path = require('path');

/**
 * 현재 사용 가능한 모니터 정보 가져오기
 * @returns {Electron.Display[]} 모니터 정보 배열
 */
function getAllDisplays() {
  return screen.getAllDisplays();
}

/**
 * 기본 디스플레이 정보 가져오기
 * @returns {Electron.Display} 기본 디스플레이 정보
 */
function getPrimaryDisplay() {
  return screen.getPrimaryDisplay();
}

/**
 * 특정 좌표에 있는 디스플레이 정보 가져오기
 * @param {number} x X 좌표
 * @param {number} y Y 좌표
 * @returns {Electron.Display} 디스플레이 정보
 */
function getDisplayAtPoint(x, y) {
  return screen.getDisplayNearestPoint({ x, y });
}

/**
 * 윈도우가 위치한 디스플레이 정보 가져오기
 * @param {Electron.BrowserWindow} window 브라우저 윈도우
 * @returns {Electron.Display} 디스플레이 정보
 */
function getDisplayForWindow(window) {
  if (!window || window.isDestroyed()) {
    return screen.getPrimaryDisplay();
  }

  return screen.getDisplayMatching(window.getBounds());
}

/**
 * 윈도우를 특정 디스플레이로 이동
 * @param {Electron.BrowserWindow} window 브라우저 윈도우
 * @param {number|Electron.Display} display 디스플레이 인덱스 또는 디스플레이 객체
 * @param {boolean} center 화면 중앙에 위치시킬지 여부
 * @returns {boolean} 이동 성공 여부
 */
function moveWindowToDisplay(window, display, center = true) {
  if (!window || window.isDestroyed()) {
    return false;
  }

  try {
    // 디스플레이 객체 가져오기
    let targetDisplay;

    if (typeof display === 'number') {
      // 인덱스로 디스플레이 찾기
      const displays = getAllDisplays();
      if (display < 0 || display >= displays.length) {
        targetDisplay = getPrimaryDisplay();
      } else {
        targetDisplay = displays[display];
      }
    } else if (display && typeof display === 'object') {
      // 이미 디스플레이 객체인 경우
      targetDisplay = display;
    } else {
      // 기본 디스플레이 사용
      targetDisplay = getPrimaryDisplay();
    }

    // 윈도우 크기 및 위치 가져오기
    const windowBounds = window.getBounds();

    // 새 위치 계산
    let newBounds;

    if (center) {
      // 디스플레이 중앙에 배치
      const x = Math.round(
        targetDisplay.bounds.x + (targetDisplay.bounds.width - windowBounds.width) / 2
      );
      const y = Math.round(
        targetDisplay.bounds.y + (targetDisplay.bounds.height - windowBounds.height) / 2
      );

      newBounds = {
        x,
        y,
        width: windowBounds.width,
        height: windowBounds.height,
      };
    } else {
      // 디스플레이 좌상단에 위치
      newBounds = {
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: windowBounds.width,
        height: windowBounds.height,
      };
    }

    // 윈도우 이동
    window.setBounds(newBounds);

    return true;
  } catch (error) {
    console.error('윈도우 디스플레이 이동 오류:', error);
    return false;
  }
}

/**
 * 윈도우를 다음 디스플레이로 이동
 * @param {Electron.BrowserWindow} window 브라우저 윈도우
 * @param {boolean} center 화면 중앙에 위치시킬지 여부
 * @returns {boolean} 이동 성공 여부
 */
function moveWindowToNextDisplay(window, center = true) {
  if (!window || window.isDestroyed()) {
    return false;
  }

  try {
    const displays = getAllDisplays();
    if (displays.length <= 1) {
      return false; // 디스플레이가 하나뿐이면 이동할 필요 없음
    }

    // 현재 윈도우가 위치한 디스플레이 찾기
    const currentDisplay = getDisplayForWindow(window);
    const currentIndex = displays.findIndex(d => d.id === currentDisplay.id);

    // 다음 디스플레이 인덱스 계산 (순환)
    const nextIndex = (currentIndex + 1) % displays.length;

    // 다음 디스플레이로 이동
    return moveWindowToDisplay(window, displays[nextIndex], center);
  } catch (error) {
    console.error('다음 디스플레이로 이동 중 오류:', error);
    return false;
  }
}

/**
 * 다중 디스플레이 이벤트 리스너 설정
 * @param {function} callback 디스플레이 변경 시 호출할 콜백 함수
 */
function setupDisplayListeners(callback) {
  // 디스플레이 추가 이벤트
  screen.on('display-added', (event, display) => {
    console.log('새 디스플레이 연결됨:', display.id);
    if (typeof callback === 'function') {
      callback('added', display);
    }
  });

  // 디스플레이 제거 이벤트
  screen.on('display-removed', (event, display) => {
    console.log('디스플레이 연결 해제됨:', display.id);
    if (typeof callback === 'function') {
      callback('removed', display);
    }
  });

  // 디스플레이 메트릭 변경 이벤트 (해상도, 배율 등)
  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    console.log('디스플레이 메트릭 변경됨:', display.id, changedMetrics);
    if (typeof callback === 'function') {
      callback('metrics-changed', display, changedMetrics);
    }
  });
}

/**
 * 미니 뷰 창 생성 (보조 디스플레이용)
 * @param {string} url 로드할 URL
 * @param {Electron.Display} display 표시할 디스플레이
 * @returns {Electron.BrowserWindow} 생성된 윈도우
 */
function createMiniViewWindow(url, display) {
  // 기본 디스플레이 사용 (지정되지 않은 경우)
  const targetDisplay = display || getPrimaryDisplay();

  // 미니 뷰 윈도우 생성
  const miniWindow = new BrowserWindow({
    width: 300,
    height: 400,
    x: targetDisplay.bounds.x + targetDisplay.bounds.width - 320,
    y: targetDisplay.bounds.y + 40,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'preload.js'),
    },
  });

  // URL 로드
  if (url) {
    miniWindow.loadURL(url);
  } else {
    miniWindow.loadFile(path.join(app.getAppPath(), 'src/app/mini-view/index.html'));
  }

  // 윈도우 이벤트 설정
  miniWindow.on('blur', () => {
    // 포커스 잃으면 반투명하게
    miniWindow.setOpacity(0.8);
  });

  miniWindow.on('focus', () => {
    // 포커스 얻으면 완전히 불투명하게
    miniWindow.setOpacity(1.0);
  });

  return miniWindow;
}

/**
 * 화면 정보 가져오기 (해상도, 배율 등)
 * @returns {object} 화면 정보
 */
function getScreenInfo() {
  const primaryDisplay = getPrimaryDisplay();
  const allDisplays = getAllDisplays();

  return {
    primary: {
      id: primaryDisplay.id,
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      scaleFactor: primaryDisplay.scaleFactor,
      colorDepth: primaryDisplay.colorDepth,
      workArea: primaryDisplay.workArea,
      accelerometerSupport: primaryDisplay.accelerometerSupport,
    },
    displays: allDisplays.map(display => ({
      id: display.id,
      width: display.bounds.width,
      height: display.bounds.height,
      scaleFactor: display.scaleFactor,
      colorDepth: display.colorDepth,
      isPrimary: display.id === primaryDisplay.id,
      bounds: display.bounds,
      workArea: display.workArea,
    })),
    count: allDisplays.length,
  };
}

module.exports = {
  getAllDisplays,
  getPrimaryDisplay,
  getDisplayAtPoint,
  getDisplayForWindow,
  moveWindowToDisplay,
  moveWindowToNextDisplay,
  setupDisplayListeners,
  createMiniViewWindow,
  getScreenInfo,
};
