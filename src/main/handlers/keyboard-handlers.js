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

// 키보드 핸들러 등록 상태 추적 플래그
let keyboardHandlersRegistered = false;

/**
 * 필요할 경우에만 키보드 리스너 설정
 * @returns {boolean} 설정 성공 여부
 */
function setupKeyboardListenerIfNeeded() {
  try {
    // 이미 키보드 핸들러가 등록되어 있는지 확인
    if (keyboardHandlersRegistered) {
      debugLog('키보드 IPC 핸들러가 이미 등록되어 있어 추가 설정하지 않습니다.');
      return true;
    }
    
    // 키보드 리스너 초기화
    if (!appState.keyboardListener) {
      debugLog('키보드 리스너 초기화 중...');
      appState.keyboardListener = setupKeyboardListener();
    
      // 성공 확인
      if (appState.keyboardListener && appState.keyboardListener.active) {
        keyboardHandlersRegistered = true;
        debugLog('키보드 리스너 초기화 성공');
      return true;
      } else {
        debugLog('키보드 리스너 초기화 실패');
        return false;
      }
    } else {
      // 이미 존재하는 경우
      keyboardHandlersRegistered = true;
      debugLog('이미 키보드 리스너가 존재합니다.');
      return true;
    }
  } catch (error) {
    console.error('키보드 리스너 설정 오류:', error);
    return false;
  }
}

/**
 * 키보드 리스너 자원 정리
 */
function cleanupKeyboardListener() {
  try {
    if (appState.keyboardListener) {
      if (typeof appState.keyboardListener.dispose === 'function') {
        appState.keyboardListener.dispose();
      }
      appState.keyboardListener = null;
      keyboardHandlersRegistered = false;
      debugLog('키보드 리스너 자원 정리 완료');
      return true;
    }
    return false;
    } catch (error) {
    console.error('키보드 리스너 정리 중 오류:', error);
      return false;
    }
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

  try {
    // 이미 등록된 핸들러 제거
    try {
      ipcMain.removeHandler('process-jamo');
      ipcMain.removeHandler('test-hangul-input');
    } catch (err) {
      // 무시 - 핸들러가 없을 수 있음
    }

    // 자모 처리 IPC 핸들러
    ipcMain.handle('process-jamo', (event, char) => {
      try {
        // keyboard.js의 processJamo 함수 사용
        const { processJamo } = require('../keyboard');
        return processJamo(char);
      } catch (error) {
        console.error('자모 처리 중 오류:', error);
        return { error: error.message };
      }
    });
    } catch (error) {
    console.error('키보드 핸들러 등록 중 오류:', error);
    }

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
      
      // 분당 단어 수 (WPM) - 한글은 1글자당 1단어로 계산
      const wpm = testOptions.measureWpm ? Math.round(completedChars / durationMin) : null;
      
      // 정확도
      const accuracy = testOptions.measureAccuracy ? 
        Math.round(((keyPressCount - errorCount) / keyPressCount) * 100) : null;
      
      return {
        success: true,
        result: {
          completedChars,
          keyPressCount,
          errorCount,
          durationMs,
          durationSec,
          wpm,
          accuracy,
          charJamoCounts
        }
      };
    } catch (error) {
      console.error('한글 입력 테스트 중 오류:', error);
      return { success: false, error: error.message };
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