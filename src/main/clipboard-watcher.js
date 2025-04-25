/**
 * 클립보드 감시 모듈
 *
 * 시스템 클립보드 내용 감시 및 관리 기능을 제공합니다.
 */

const { clipboard, ipcMain } = require('electron');

// 마지막으로 감지된 텍스트
let lastText = '';
// 내부적으로 복사한 항목 추적
let internalCopyPending = false;
// 클립보드 변경 감지 활성화 상태
let isWatchingEnabled = false;
// 감시 간격 (밀리초)
let watchInterval = 500;
// 타이머 ID
let clipboardTimer = null;
// 변경 감지 콜백
let changeCallback = null;

/**
 * 클립보드 감시 간격 설정
 * @param {number} intervalMs 간격 (밀리초)
 */
function setWatchInterval(intervalMs) {
  if (intervalMs >= 100 && intervalMs <= 5000) {
    watchInterval = intervalMs;
    // 이미 실행 중이면 재시작
    if (isWatchingEnabled) {
      stopWatching();
      startWatching();
    }
  }
}

/**
 * 클립보드 내용 변경 감지
 * @param {function} callback 변경 감지 콜백 함수
 */
function startWatching(callback = null) {
  if (callback) {
    changeCallback = callback;
  }

  if (clipboardTimer) {
    clearInterval(clipboardTimer);
  }

  isWatchingEnabled = true;
  lastText = clipboard.readText();

  clipboardTimer = setInterval(() => {
    if (!isWatchingEnabled) return;

    try {
      const currentText = clipboard.readText();

      // 내용이 변경되었고, 내부 복사 작업이 아닌 경우만 처리
      if (currentText !== lastText && !internalCopyPending) {
        lastText = currentText;

        if (changeCallback) {
          changeCallback(currentText);
        }

        // 모든 창에 클립보드 내용 변경 이벤트 전송
        for (const win of require('electron').BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('clipboard-changed', {
              text: currentText,
              timestamp: Date.now(),
            });
          }
        }
      }

      // 내부 복사 플래그 초기화
      if (internalCopyPending) {
        internalCopyPending = false;
      }
    } catch (error) {
      console.error('클립보드 감시 오류:', error);
    }
  }, watchInterval);

  console.log(`클립보드 감시 시작 (간격: ${watchInterval}ms)`);
}

/**
 * 클립보드 감시 중지
 */
function stopWatching() {
  isWatchingEnabled = false;
  if (clipboardTimer) {
    clearInterval(clipboardTimer);
    clipboardTimer = null;
  }
  console.log('클립보드 감시 중지');
}

/**
 * 앱에서 클립보드로 텍스트 복사
 * @param {string} text 복사할 텍스트
 * @returns {boolean} 성공 여부
 */
function copyToClipboard(text) {
  try {
    internalCopyPending = true;
    clipboard.writeText(text);
    lastText = text;
    return true;
  } catch (error) {
    console.error('클립보드 복사 오류:', error);
    internalCopyPending = false;
    return false;
  }
}

/**
 * 클립보드에서 텍스트 읽기
 * @returns {string} 클립보드 텍스트
 */
function readFromClipboard() {
  try {
    return clipboard.readText();
  } catch (error) {
    console.error('클립보드 읽기 오류:', error);
    return '';
  }
}

/**
 * 클립보드에 이미지 복사
 * @param {string|Buffer} imageData 이미지 경로 또는 버퍼
 * @returns {boolean} 성공 여부
 */
function copyImageToClipboard(imageData) {
  try {
    if (typeof imageData === 'string') {
      // 파일 경로인 경우 NativeImage로 변환
      const nativeImage = require('electron').nativeImage.createFromPath(imageData);
      clipboard.writeImage(nativeImage);
    } else {
      // 버퍼인 경우 직접 이미지 생성
      const nativeImage = require('electron').nativeImage.createFromBuffer(imageData);
      clipboard.writeImage(nativeImage);
    }
    internalCopyPending = true;
    return true;
  } catch (error) {
    console.error('이미지 클립보드 복사 오류:', error);
    internalCopyPending = false;
    return false;
  }
}

/**
 * 클립보드 이벤트 리스너 초기화
 */
function initializeClipboardEvents() {
  // 클립보드 복사 이벤트
  ipcMain.handle('clipboard:copy', (event, text) => {
    return copyToClipboard(text);
  });

  // 클립보드 읽기 이벤트
  ipcMain.handle('clipboard:read', () => {
    return readFromClipboard();
  });

  // 이미지 복사 이벤트
  ipcMain.handle('clipboard:copy-image', (event, imageData) => {
    return copyImageToClipboard(imageData);
  });

  // 감시 시작 이벤트
  ipcMain.handle('clipboard:start-watching', (event, intervalMs) => {
    if (intervalMs) {
      setWatchInterval(intervalMs);
    }
    startWatching();
    return isWatchingEnabled;
  });

  // 감시 중지 이벤트
  ipcMain.handle('clipboard:stop-watching', () => {
    stopWatching();
    return !isWatchingEnabled;
  });
}

module.exports = {
  startWatching,
  stopWatching,
  copyToClipboard,
  readFromClipboard,
  copyImageToClipboard,
  setWatchInterval,
  initializeClipboardEvents,
};
