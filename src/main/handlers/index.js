/**
 * IPC 핸들러 모듈 통합
 * 모든 IPC 핸들러를 관리하고 초기화합니다.
 */

// 각 도메인별 핸들러 모듈 가져오기
const systemInfoHandlers = require('./system-info-handlers');
const windowHandlers = require('./window-handlers');
const settingsHandlers = require('./settings-handlers');
const memoryHandlers = require('./memory-handlers');
const restartHandlers = require('./restart-handlers');
const keyboardHandlers = require('./keyboard-handlers');
const trackingHandlers = require('./tracking-handlers');

// 핸들러가 이미 설정되었는지 추적
let isAllHandlersSetup = false;

/**
 * 모든 IPC 핸들러를 초기화하고 등록합니다.
 */
function setupAllHandlers() {
  // 이미 설정되었으면 중복 설정 방지
  if (isAllHandlersSetup) {
    console.log('모든 핸들러가 이미 설정되어 있습니다.');
    return true;
  }

  try {
    // 시스템 정보 관련 핸들러 등록
    systemInfoHandlers.register();
    
    // 창/윈도우 관련 핸들러 등록
    windowHandlers.register();
    
    // 설정 관련 핸들러 등록
  settingsHandlers.register();
    
    // 메모리 관리 관련 핸들러 등록
  memoryHandlers.register();
    
    // 앱 재시작 관련 핸들러 등록
  restartHandlers.register();
    
    // 키보드 관련 핸들러 등록
  keyboardHandlers.register();
    
    // 추적 관련 핸들러 등록
    trackingHandlers.register();
    
    // 핸들러 설정 완료
    isAllHandlersSetup = true;
    return true;
  } catch (error) {
    console.error('핸들러 설정 중 오류 발생:', error);
    return false;
  }
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