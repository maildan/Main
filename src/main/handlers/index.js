/**
 * IPC 핸들러 모듈 통합 관리
 * 
 * 모든 기능별 IPC 핸들러 모듈을 가져와 등록합니다.
 */
const trackingHandlers = require('./tracking-handlers');
const settingsHandlers = require('./settings-handlers');
const windowHandlers = require('./window-handlers');
const memoryHandlers = require('./memory-handlers');
const restartHandlers = require('./restart-handlers');
const systemInfoHandlers = require('./system-info-handlers');
const keyboardHandlers = require('./keyboard-handlers');

/**
 * 모든 IPC 핸들러 등록
 */
function setupAllHandlers() {
  // 각 핸들러 모듈의 register 함수 호출
  trackingHandlers.register();
  settingsHandlers.register();
  windowHandlers.register();
  memoryHandlers.register();
  restartHandlers.register();
  systemInfoHandlers.register();
  keyboardHandlers.register();
}

// 외부에서 필요한 함수들 노출
module.exports = {
  setupAllHandlers,
  setupKeyboardListenerIfNeeded: keyboardHandlers.setupKeyboardListenerIfNeeded,
  cleanupKeyboardListener: keyboardHandlers.cleanupKeyboardListener,
  sendStatusToRenderer: trackingHandlers.sendStatusToRenderer,
  trackingHandlers,
  settingsHandlers,
  windowHandlers,
  memoryHandlers,
  restartHandlers,
  systemInfoHandlers,
  keyboardHandlers
}; 