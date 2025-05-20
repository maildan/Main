/**
 * 키보드 관련 IPC 핸들러
 * 
 * 키보드 이벤트 리스너 설정 및 관리, 키 입력 처리, 한글 입력 테스트 등 기능을 처리합니다.
 */
const { ipcMain } = require('electron');
const { appState } = require('../constants');
const { debugLog } = require('../utils');
const { setupKeyboardListener } = require('../keyboard');
const { getSettings } = require('../settings');

// 키보드 리스너 인스턴스 관리
let keyboardListenerInstance = null;

/**
 * 필요한 경우 키보드 리스너 설정
 * @returns {boolean} 설정 성공 여부
 */
function setupKeyboardListenerIfNeeded() {
  try {
    // 모니터링 중이 아니면 키보드 리스너를 설정하지 않음
    if (!appState.isTracking) {
      debugLog('모니터링 중이 아니므로 키보드 리스너를 설정하지 않음');
      return false;
    }
    
    // 이미 리스너가 있으면 정리
    cleanupKeyboardListener();
    
    // 새 키보드 리스너 설정
    debugLog('키보드 리스너 설정 중...');
    keyboardListenerInstance = setupKeyboardListener();
    
    if (keyboardListenerInstance) {
      debugLog('키보드 리스너 설정 성공');
      
      // 설정에서 추적할 앱/웹사이트 목록 로드
      const settings = getSettings();
      debugLog(`모니터링 설정: ${settings.monitoredApps?.length || 0}개 앱, ${settings.monitoredWebsites?.length || 0}개 웹사이트 정의됨`);
      
      return true;
    } else {
      debugLog('키보드 리스너 설정 실패');
      return false;
    }
  } catch (error) {
    console.error('키보드 리스너 설정 오류:', error);
    return false;
  }
}

/**
 * 키보드 리스너 정리
 */
function cleanupKeyboardListener() {
  if (keyboardListenerInstance) {
    try {
      debugLog('기존 키보드 리스너 정리 중...');
      if (typeof keyboardListenerInstance.dispose === 'function') {
        keyboardListenerInstance.dispose();
      }
      keyboardListenerInstance = null;
      debugLog('키보드 리스너 정리 완료');
      return true;
    } catch (error) {
      console.error('키보드 리스너 정리 오류:', error);
      return false;
    }
  }
  return true; // 이미 리스너가 없으면 성공으로 간주
}

/**
 * 한글 문자의 자모 개수 계산
 * @param {string} char - 한글 문자
 * @returns {number} - 자모 개수
 */
function getJamoCount(char) {
  if (!char || char.length === 0) return 0;
  
  // 한글 여부 확인
  const isHangulComplete = /[\uAC00-\uD7AF]/.test(char);
  if (!isHangulComplete) {
    // 한글이 아니면 1개로 계산
    return 1;
  }
  
  try {
    // 초성, 중성, 종성 분리
    const charCode = char.charCodeAt(0);
    const baseCode = 0xAC00; // '가'의 유니코드
    
    // 종성 존재 여부 확인
    const hasJongseong = (charCode - baseCode) % 28 !== 0;
    
    // 초성 + 중성 + (종성 있으면 추가)
    return hasJongseong ? 3 : 2;
  } catch (error) {
    console.error('자모 개수 계산 오류:', error);
    return 1; // 오류 시 기본값
  }
}

/**
 * 키보드 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('키보드 관련 IPC 핸들러 등록 중...');

  // 키보드 테스트 입력 처리
  ipcMain.handle('test-keyboard-input', async (event, key) => {
    try {
      debugLog(`키보드 테스트 입력 요청: ${key}`);
      
      // keyboard 모듈 가져오기
      const keyboard = require('../keyboard');
      
      // 시뮬레이션 함수 호출
      if (typeof keyboard.simulateKeyPress === 'function') {
        const result = keyboard.simulateKeyPress(key);
        return { success: true, result };
      } else {
        debugLog('키보드 시뮬레이션 함수를 찾을 수 없음');
        return { success: false, error: 'simulateKeyPress 함수를 찾을 수 없음' };
      }
    } catch (error) {
      console.error('키보드 테스트 입력 처리 오류:', error);
      return { success: false, error: error.message };
    }
  });

  // 한글 입력 테스트 핸들러
  ipcMain.handle('test-hangul-input', async (event, options) => {
    try {
      const defaultOptions = {
        text: '안녕하세요',
        durationSec: 5,
        measureWpm: true,
        measureAccuracy: true
      };
      
      // 옵션 병합
      const testOptions = {
        ...defaultOptions,
        ...(typeof options === 'string' ? { text: options } : options)
      };
      
      debugLog(`한글 입력 테스트 요청: "${testOptions.text}", 옵션:`, testOptions);
      
      if (!testOptions.text) {
        return { success: false, error: '입력 텍스트가 없습니다' };
      }
      
      // 타이핑 테스트 시작 시간 저장
      const testStartTime = Date.now();
      let keyPressCount = 0;
      let errorCount = 0;
      let completedChars = 0;
      
      // 테스트 텍스트 처리
      const testText = testOptions.text;
      
      // 각 글자별 자모 카운트 계산
      const charJamoCounts = [];
      for (let i = 0; i < testText.length; i++) {
        const char = testText[i];
        const jamoCount = getJamoCount(char);
        charJamoCounts.push(jamoCount);
        keyPressCount += jamoCount; // 총 키 입력 수 누적
      }
      
      // 실제 테스트 시뮬레이션
      for (let i = 0; i < testText.length; i++) {
        const currentChar = testText[i];
        
        // 무작위 오타 시뮬레이션 (5% 확률)
        const hasTypo = Math.random() < 0.05;
        if (hasTypo) {
          errorCount++;
          // 오타 수정을 위한 백스페이스 키 입력 시뮬레이션
          keyPressCount++;
        }
        
        // 완성된 글자 카운트
        completedChars++;
      }
      
      // 테스트 종료 시간 및 소요 시간 계산
      const testEndTime = Date.now();
      const durationMs = testEndTime - testStartTime;
      const durationSec = durationMs / 1000;
      const durationMin = durationSec / 60;
      
      // WPM 계산 (1 word = 5 keystrokes 기준)
      const grossWPM = Math.round((keyPressCount / 5) / durationMin);
      
      // 정확도 계산
      const accuracy = errorCount > 0
        ? Math.round(((keyPressCount - errorCount) / keyPressCount) * 100)
        : 100;
      
      // 테스트 결과
      const result = {
        success: true,
        text: testText,
        keystrokes: keyPressCount,
        completedChars: completedChars,
        errors: errorCount,
        duration: durationSec,
        wpm: grossWPM,
        accuracy: accuracy,
        timestamp: new Date().toISOString()
      };
      
      debugLog('한글 입력 테스트 결과:', result);
      return result;
    } catch (error) {
      console.error('한글 입력 테스트 오류:', error);
      return {
        success: false,
        error: error.message || '한글 입력 테스트 중 오류가 발생했습니다'
      };
    }
  });

  debugLog('키보드 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register,
  setupKeyboardListenerIfNeeded,
  cleanupKeyboardListener,
  getJamoCount
}; 