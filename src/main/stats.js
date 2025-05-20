const { Worker } = require('worker_threads');
const path = require('path');
const { appState, BROWSER_DISPLAY_NAMES, IDLE_TIMEOUT, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { debugLog, formatTime } = require('./utils');
const { saveStats: saveStatsToDb, getStatById } = require('./database');
const { getSettings } = require('./settings');
const dataSync = require('./data-sync');

// 워커 인스턴스 관리
let statWorker = null;
let workerInitialized = false;
let workerMemoryUsage = { heapUsed: 0, heapTotal: 0 };
let lastWorkerCheck = 0;
let pendingTasks = [];

// 메모리 사용량 임계치 및 처리 모드 상태
const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
let processingMode = 'normal'; // 'normal', 'cpu-intensive', 'gpu-intensive'

// 한글 입력 관련 상태
const hangulState = {
  isComposing: false,
  lastComposedText: '',
  composingBuffer: ''
};

/**
 * 워커 초기화 - CPU 집약적 계산을 위한 별도 스레드
 */
function initializeWorker() {
  if (statWorker) {
    return;
  }
  
  try {
    const workerPath = path.join(__dirname, './workers/stat-worker.js');
    
    // GPU 가속 설정 확인 및 모드 설정
    const preferredMode = appState.settings?.processingMode || 'auto';
    let initialMode = 'normal';
    
    // 자동 모드가 아닌 경우 사용자 지정 모드 사용
    if (preferredMode !== 'auto') {
      initialMode = preferredMode;
      processingMode = preferredMode;
      debugLog(`사용자 지정 처리 모드 사용: ${processingMode}`);
    }
    
    // 자동 모드인 경우 시스템 상태에 따라 초기 모드 결정
    if (preferredMode === 'auto') {
      const { getMemoryInfo } = require('./memory-manager');
      const memoryInfo = getMemoryInfo();
      
      // 메모리 상태에 따른 모드 선택 (임계값 조정)
      const memoryThreshold = appState.settings?.maxMemoryThreshold 
        ? appState.settings.maxMemoryThreshold * 1024 * 1024  // MB를 바이트로 변환
        : HIGH_MEMORY_THRESHOLD;
      
      if (memoryInfo.heapUsed > memoryThreshold * 0.8) { // 80% 임계점
        initialMode = appState.gpuEnabled ? 'gpu-intensive' : 'cpu-intensive';
        processingMode = initialMode;
        debugLog(`메모리 상황에 따른 초기 모드 설정: ${processingMode}, 사용 메모리: ${Math.round(memoryInfo.heapUsed/(1024*1024))}MB`);
      }
    }
    
    // 워커에 필요한 옵션 전달 (메모리 임계치 사용자 설정 적용)
    const actualMemoryThreshold = appState.settings?.maxMemoryThreshold 
      ? appState.settings.maxMemoryThreshold * 1024 * 1024  // MB를 바이트로 변환
      : MEMORY_THRESHOLD;
      
    statWorker = new Worker(workerPath, {
      workerData: {
        memoryLimit: actualMemoryThreshold,
        initialMode: processingMode,
        gpuEnabled: appState.gpuEnabled,
        maxMemoryThreshold: appState.settings?.maxMemoryThreshold || 100,
        // 워커 성능 최적화 옵션 추가
        resourceLimits: {
          maxYoungGenerationSizeMb: 32,
          maxOldGenerationSizeMb: 128,
          codeRangeSizeMb: 16,
        }
      }
    });
    
    statWorker.on('message', (message) => {
      try {
        // 메시지 타입에 따라 처리
        switch (message.action) {
          case 'stats-calculated':
            // 계산된 통계 처리
            updateCalculatedStats(message.result);
            
            // 워커 메모리 정보 업데이트
            if (message.memoryInfo) {
              updateWorkerMemoryInfo(message.memoryInfo);
            }
            break;
            
          case 'pattern-analyzed':
            // 분석된 패턴 처리
            updateTypingPattern(message.result);
            
            // 워커 메모리 정보 업데이트
            if (message.memoryInfo) {
              updateWorkerMemoryInfo(message.memoryInfo);
            }
            break;
            
          case 'initialized':
            // 워커 초기화 완료
            workerInitialized = true;
            debugLog('워커 초기화 완료:', message.timestamp);
            
            // 대기 중인 작업 처리
            processPendingTasks();
            break;
            
          case 'memory-optimized':
            // 메모리 최적화 결과 처리
            debugLog('워커 메모리 최적화 완료:', {
              before: `${Math.round(message.before / (1024 * 1024))}MB`,
              after: `${Math.round(message.after / (1024 * 1024))}MB`,
              reduction: `${Math.round(message.reduction / (1024 * 1024))}MB`,
              emergency: message.emergency
            });
            break;
            
          case 'memory-warning':
            // 메모리 경고 로깅
            debugLog('워커 메모리 경고:', message.message, 
                     `${Math.round(message.memoryInfo.heapUsedMB)}MB`);
            
            // 메인 프로세스도 메모리 정리 시도
            const { checkMemoryUsage } = require('./memory-manager');
            checkMemoryUsage(true);
            
            // 메모리 사용량이 임계치를 초과하면 처리 모드 변경
            if (message.memoryInfo.heapUsed > MEMORY_THRESHOLD) {
              switchToLowMemoryMode();
            }
            break;
            
          case 'error':
            console.error('워커 오류:', message.error);
            if (message.memoryInfo) {
              updateWorkerMemoryInfo(message.memoryInfo);
            }
            break;
            
          case 'worker-ready':
            workerInitialized = true;
            if (message.memoryInfo) {
              updateWorkerMemoryInfo(message.memoryInfo);
            }
            break;
            
          default:
            debugLog('알 수 없는 워커 메시지:', message);
        }
      } catch (error) {
        console.error('워커 메시지 처리 중 오류:', error);
      }
    });
    
    statWorker.on('error', (error) => {
      console.error('워커 실행 오류:', error);
      
      // 워커 상태 초기화
      workerInitialized = false;
      statWorker = null;
      
      // 메모리 최적화 목적으로 일정 시간 후 재생성 시도
      setTimeout(() => {
        if (!statWorker) {
          debugLog('워커 재생성 시도');
          initializeWorker();
        }
      }, 30000); // 30초 후 재시도
    });
    
    statWorker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`워커가 코드 ${code}로 종료됨`);
      }
      
      // 워커 참조 및 상태 정리
      workerInitialized = false;
      statWorker = null;
      
      // 메모리 급증 방지를 위한 자원 확보
      try {
        // 대용량 객체 참조 제거
        const { freeUpMemoryResources } = require('./memory-manager');
        freeUpMemoryResources(true);
      } catch (err) {
        console.error('메모리 정리 중 오류:', err);
      }
    });
    
    debugLog('통계 워커 초기화 시작됨');
  } catch (error) {
    console.error('워커 초기화 오류:', error);
    workerInitialized = false;
    statWorker = null;
    
    // 워커 없이도 기본 기능 동작하도록 폴백 모드 활성화
    debugLog('워커 초기화 실패: 폴백 모드로 전환');
    switchToFallbackMode();
  }
}

/**
 * 저메모리 모드로 전환
 * 메모리 사용량이 임계치를 초과할 때 CPU/GPU 집약적 처리 모드로 전환
 */
function switchToLowMemoryMode() {
  try {
    // 이미 저메모리 모드인 경우 또는 사용자가 처리 모드를 수동으로 지정한 경우 중단
    if (processingMode !== 'normal' || 
        (appState.settings?.processingMode && appState.settings.processingMode !== 'auto')) {
      return;
    }
    
    debugLog('메모리 사용량 임계치 초과: 저메모리 모드로 전환');
    
    // GPU 지원 여부 확인 및 가능한 경우 GPU 모드로 전환
    appState.gpuEnabled = appState.settings?.useHardwareAcceleration === true;
    
    // GPU 모드 최적화
    if (appState.gpuEnabled) {
      processingMode = 'gpu-intensive';
      debugLog('GPU 가속 처리 모드 활성화 (성능 향상)');
      
      // GPU 메모리 최적화 추가 코드
      if (global.gc) {
        global.gc();
        debugLog('GPU 모드 전환 전 메모리 정리 수행');
      }
    } else {
      processingMode = 'cpu-intensive';
      debugLog('CPU 집약적 처리 모드 활성화 (메모리 최적화)');
    }
    
    // 워커에 모드 변경 알림
    if (statWorker && workerInitialized) {
      statWorker.postMessage({
        action: 'change-processing-mode',
        mode: processingMode
      });
    }
    
    // 메모리 정리
    const { freeUpMemoryResources } = require('./memory-manager');
    freeUpMemoryResources(false);
    
  } catch (error) {
    console.error('저메모리 모드 전환 오류:', error);
  }
}

/**
 * 일반 처리 모드로 복귀
 */
function restoreNormalMode() {
  if (processingMode === 'normal') {
    return;
  }
  
  debugLog('일반 처리 모드로 복귀');
  processingMode = 'normal';
  
  // 워커에 모드 변경 알림
  if (statWorker && workerInitialized) {
    statWorker.postMessage({
      action: 'change-processing-mode',
      mode: processingMode
    });
  }
}

/**
 * 폴백 모드로 전환 (워커 없이 동작)
 */
function switchToFallbackMode() {
  debugLog('폴백 모드 활성화: 워커 없이 메인 스레드에서 계산');
  // 폴백 모드에서는 계산을 간소화하고 메인 스레드에서 처리
}

/**
 * 워커 메모리 정보 업데이트
 * @param {Object} memoryInfo - 워커에서 전송한 메모리 정보
 */
function updateWorkerMemoryInfo(memoryInfo) {
  if (!memoryInfo) return;
  
  workerMemoryUsage = {
    heapUsed: memoryInfo.heapUsed || 0,
    heapTotal: memoryInfo.heapTotal || 0,
    heapUsedMB: memoryInfo.heapUsedMB || 0,
    timestamp: memoryInfo.timestamp || Date.now()
  };
  
  lastWorkerCheck = Date.now();
  
  // 메모리 사용량에 따른 처리 모드 전환
  if (workerMemoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD) {
    // 심각한 메모리 부족 - 긴급 메모리 확보
    optimizeWorkerMemory(true);
    
    // 저메모리 모드로 전환
    if (workerMemoryUsage.heapUsed > MEMORY_THRESHOLD) {
      switchToLowMemoryMode();
    }
  } else if (workerMemoryUsage.heapUsed > MEMORY_THRESHOLD) {
    // 메모리 임계치 초과 - 저메모리 모드로 전환
    switchToLowMemoryMode();
  } else if (workerMemoryUsage.heapUsed < MEMORY_THRESHOLD * 0.7 && processingMode !== 'normal') {
    // 메모리 사용량이 충분히 낮아지면 일반 모드로 복귀
    restoreNormalMode();
  }
}

/**
 * 워커 메모리 최적화
 * @param {boolean} emergency - 긴급 최적화 여부
 */
function optimizeWorkerMemory(emergency = false) {
  if (!statWorker || !workerInitialized) return;
  
  try {
    statWorker.postMessage({
      action: 'optimize-memory',
      emergency
    });
    
    debugLog(`워커 메모리 최적화 요청: ${emergency ? '긴급' : '일반'}`);
    
  } catch (error) {
    console.error('워커 메모리 최적화 요청 중 오류:', error);
  }
}

/**
 * 대기 중인 작업 처리
 */
function processPendingTasks() {
  if (!statWorker || !workerInitialized || pendingTasks.length === 0) return;
  
  debugLog(`대기 중인 작업 ${pendingTasks.length}개 처리 시작`);
  
  // 대기 중인 작업 처리
  while (pendingTasks.length > 0) {
    const task = pendingTasks.shift();
    try {
      statWorker.postMessage(task);
    } catch (error) {
      console.error('대기 작업 처리 중 오류:', error);
    }
  }
}

/**
 * 계산된 통계 정보로 앱 상태 업데이트
 * @param {Object} result - 계산된 통계 결과
 */
function updateCalculatedStats(result) {
  if (!result) return;
  
  // 계산된 값으로 통계 업데이트 (객체 복제 없이 직접 속성 업데이트)
  appState.currentStats.totalWords = result.wordCount;
  appState.currentStats.totalChars = result.characterCount;
  appState.currentStats.pages = result.pageCount;
  appState.currentStats.accuracy = result.accuracy;
  
  // UI에 통계 전송
  updateAndSendStats();
}

/**
 * 분석된 타이핑 패턴 정보 업데이트
 * @param {Object} result - 분석된 패턴 결과
 */
function updateTypingPattern(result) {
  if (!result) return;
  
  // 패턴 정보를 앱 상태에 저장 (필요한 경우)
  appState.typingPatterns = result;
  
  // 필요한 경우 UI에 전송
  if (appState.mainWindow && appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('typing-patterns-update', result);
  }
}

/**
 * 통계 업데이트 및 UI로 전송
 */
function updateAndSendStats() {
  try {
    if (!appState.mainWindow || !appState.currentStats) return;
    
    // 마지막 업데이트로부터 너무 짧은 시간이 지났으면 스킵 (과도한 업데이트 방지)
    const now = Date.now();
    appState.lastStatsUpdateTime = appState.lastStatsUpdateTime || 0;
    
    // 실시간 기본 통계 최소 계산 (CPU 부하 감소)
    updateCalculatedStatsMinimal();
    
    // 메인 윈도우로 통계 전송
    appState.mainWindow.webContents.send('update-current-stats', appState.currentStats);
    
    // 미니뷰 창이 있으면 미니뷰도 업데이트
    if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
      appState.miniViewWindow.webContents.send('update-mini-stats', {
        keyCount: appState.currentStats.keyCount,
        wpm: appState.currentStats.wpm || 0,
        accuracy: appState.currentStats.accuracy || 100,
        typingTime: appState.currentStats.typingTime || 0
      });
    }
    
    // 마지막 업데이트 시간 저장
    appState.lastStatsUpdateTime = now;
    
    return true;
  } catch (error) {
    console.error('통계 업데이트 및 전송 중 오류:', error);
    return false;
  }
}

/**
 * 키 입력 처리 함수
 * @param {Object} event - 키 이벤트 객체
 * @returns {boolean} - 처리 성공 여부
 */
function processKeyInput(event) {
  try {
    // 추적 중이 아니면 처리하지 않음
    if (!appState.isTracking) {
      debugLog('모니터링이 꺼져 있어 키 입력을 처리하지 않음');
      return false;
    }
    
    // 이벤트 객체 검증
    if (!event || typeof event !== 'object') {
      debugLog('잘못된 이벤트 객체가 전달됨');
      return false;
    }
    
    // VirtualTyping 이벤트 처리 (앱 전환 시 가상 타이핑)
    if (event.key === 'VirtualTyping') {
      // 앱 전환 시 가상 타이핑 처리
      const appName = event.appName || 'Unknown App';
      const windowTitle = event.windowTitle || 'Unknown Window';
      const url = event.url || '';
      
      debugLog(`화면 전환에 의한 가상 타이핑 이벤트 처리: ${appName} - ${windowTitle}`);
      
      // 현재 통계 업데이트
      if (!appState.currentStats) {
        appState.currentStats = {};
      }
      
      // 현재 윈도우 정보 업데이트
      appState.currentStats.currentWindow = windowTitle;
      appState.currentStats.currentBrowser = appName;
      
      // settings.json에 정의된 앱/웹사이트인지 확인
      let isMonitoredApp = false;
      let isMonitoredWebsite = false;
      
      try {
        const { getSettings } = require('./settings');
        const settings = getSettings();
        
        // 모니터링할 앱/웹사이트 목록 가져오기
        const monitoredApps = settings.monitoredApps || [];
        const monitoredWebsites = settings.monitoredWebsites || [];
        
        // 앱 이름이 모니터링 목록에 있는지 확인
        isMonitoredApp = monitoredApps.some(app => 
          appName.toLowerCase().includes(app.toLowerCase())
        );
        
        // URL이 있으면 웹사이트 모니터링 확인
        if (url) {
          isMonitoredWebsite = monitoredWebsites.some(site => 
            url.toLowerCase().includes(site.toLowerCase())
          );
        }
        
        if (isMonitoredApp || isMonitoredWebsite) {
          debugLog(`모니터링 대상 앱/웹사이트 감지됨: ${appName} - ${url || windowTitle}`);
          
          // 타이핑 통계 업데이트
          // 값이 주어지지 않은 경우 기본값은 1개의 문자와 10ms의 타이핑 시간
          const charCount = event.charCount || 1;
          const typingTime = event.typingTime || 10;
          
          // 타이핑 통계 누적 업데이트
          appState.currentStats.keyCount += charCount;
          appState.currentStats.typingTime += typingTime;
          appState.currentStats.totalChars += charCount;
          
          // 단어 수 계산 (평균적으로 5자당 1단어)
          const wordIncrement = Math.max(1, Math.floor(charCount / 5));
          appState.currentStats.totalWords += wordIncrement;
          
          // 공백을 제외한 문자 수 (약 75% 정도로 추정)
          appState.currentStats.totalCharsNoSpace += Math.ceil(charCount * 0.75);
          
          // 마지막 활동 시간 업데이트
          appState.currentStats.lastActiveTime = Date.now();
          
          // 메인 창에 통계 업데이트 전달
          sendStatsUpdate();
          
          return true;
        } else {
          debugLog(`모니터링 제외 앱/웹사이트: ${appName} - ${url || windowTitle}`);
        }
      } catch (error) {
        console.error('앱/웹사이트 확인 중 오류:', error);
      }
      
      return false;
    }
    
    // 일반 키 입력 처리 (기존 로직 유지)
    const { key } = event;
    
    // 특수 키 필터링 (사용자 입력이 아닌 키)
    if (SPECIAL_KEYS.includes(key)) {
      return false;
    }
    
    // 입력 처리 (일반 키)
    if (!appState.currentStats) {
      appState.currentStats = {};
    }
    
    // 키 카운터 증가
    appState.currentStats.keyCount = (appState.currentStats.keyCount || 0) + 1;
    
    // 타이핑 시간 증가 (평균 타이핑 시간 기준으로 가중치 적용)
    const averageKeyPressTime = 50; // ms 단위 - 평균 키 입력 시간
    appState.currentStats.typingTime = (appState.currentStats.typingTime || 0) + averageKeyPressTime;
    
    // 전체 문자 수 증가
    appState.currentStats.totalChars = (appState.currentStats.totalChars || 0) + 1;
    
    // 공백이 아닌 경우만 공백 제외 문자 수 증가
    if (key !== ' ') {
      appState.currentStats.totalCharsNoSpace = (appState.currentStats.totalCharsNoSpace || 0) + 1;
    }
    
    // 공백이나 구두점이면 단어 수 증가
    if (key === ' ' || key === '.' || key === ',' || key === '!' || key === '?' || key === ';') {
      appState.currentStats.totalWords = (appState.currentStats.totalWords || 0) + 1;
    }
    
    // 마지막 활동 시간 업데이트
    appState.currentStats.lastActiveTime = Date.now();
    
    // 메인 창에 통계 업데이트 전달
    sendStatsUpdate();
    
    return true;
  } catch (error) {
    console.error('키 입력 처리 오류:', error);
    return false;
  }
}

/**
 * WPM 계산 함수 (실시간)
 */
function calculateWPM() {
  try {
    const stats = appState.currentStats;
    if (!stats || !stats.startTime || !stats.lastActiveTime) return 0;
    
    // 경과 시간 계산 (분 단위)
    const now = Date.now();
    const elapsedMs = stats.lastActiveTime - stats.startTime;
    const elapsedMinutes = elapsedMs / 60000;
    
    // 너무 짧은 시간이면 계산하지 않음
    if (elapsedMinutes < 0.05) { // 3초 이하
      stats.wpm = 0;
      return 0;
    }
    
    // 타이핑 시간 기준으로 계산 (분 단위)
    const typingMinutes = Math.max(stats.typingTime / 60000, 0.05);
    
    // WPM 계산 (표준: 5타 = 1단어)
    const standardWords = stats.totalChars / 5;
    const calculatedWPM = Math.round(standardWords / typingMinutes);
    
    // 현실적인 범위로 제한 (0-300 WPM)
    stats.wpm = Math.min(Math.max(calculatedWPM, 0), 300);
    
    return stats.wpm;
  } catch (error) {
    console.error('WPM 계산 중 오류:', error);
    return 0;
  }
}

/**
 * 최소한의 통계만 계산 (실시간 업데이트용)
 */
function updateCalculatedStatsMinimal() {
  try {
    calculateWPM();
    return true;
  } catch (error) {
    console.error('최소 통계 계산 중 오류:', error);
    return false;
  }
}

/**
 * 통계 시작
 */
function startTracking() {
  appState.isTracking = true;
  appState.currentStats.startTime = Date.now();
  appState.currentStats.lastActiveTime = Date.now();
  
  // 워커 초기화
  initializeWorker();
  
  debugLog('타이핑 모니터링 시작됨');
  return true;
}

/**
 * 통계 중지
 * 메모리 최적화: 불필요한 리소스 정리
 */
function stopTracking() {
  appState.isTracking = false;
  
  // 워커 종료 (메모리 해제)
  if (statWorker) {
    statWorker.terminate();
    statWorker = null;
    workerInitialized = false;
  }
  
  debugLog('타이핑 모니터링 중지됨');
  return true;
}

/**
 * 리소스 해제 함수 (메모리 누수 방지)
 */
function cleanup() {
  if (statWorker) {
    statWorker.terminate();
    statWorker = null;
  }
  
  // 대기 작업 정리
  pendingTasks = [];
  workerInitialized = false;
  
  // 참조 정리
  appState.currentContent = null;
}

/**
 * 출력 가능한 키인지 확인
 * @param {string} key - 키 문자
 * @returns {boolean} - 출력 가능 여부
 */
function isPrintableKey(key) {
  if (!key || key.length === 0) return false;
  
  // 특수키 목록 (출력 불가능한 키)
  const nonPrintableKeys = [
    'Shift', 'Control', 'Alt', 'Meta', 'Command', 'CapsLock',
    'Tab', 'Escape', 'Enter', 'Backspace', 'Delete',
    'Home', 'End', 'PageUp', 'PageDown',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ];
  
  // 특수키는 출력 불가능
  if (nonPrintableKeys.includes(key)) return false;
  
  // 길이가 1보다 크고 특수키 이름이 아니면 출력 가능 (예: "A", "1", "+")
  if (key.length === 1) return true;
  
  // 기능키 형태 확인 (길이가 1보다 큰 경우)
  return !key.includes('Arrow') && 
         !key.includes('Page') && 
         !key.startsWith('F') && 
         !['Shift', 'Control', 'Alt', 'Meta', 'Command'].includes(key);
}

/**
 * 한글 문자인지 확인
 * @param {string} char - 검사할 문자
 * @returns {boolean} - 한글 여부
 */
function isHangul(char) {
  if (!char || typeof char !== 'string') return false;
  
  // 한글 유니코드 범위 (AC00-D7AF: 완성형 한글)
  const hangulComplete = /[\uAC00-\uD7AF]/;
  
  // 한글 자모 (1100-11FF: 한글 자모)
  const hangulJamo = /[\u1100-\u11FF]/;
  
  // 결합 자모 (3130-318F: 한글 호환 자모)
  const hangulCompatJamo = /[\u3130-\u318F]/;
  
  return hangulComplete.test(char) || 
         hangulJamo.test(char) || 
         hangulCompatJamo.test(char);
}

/**
 * 정확도 업데이트 (기본값: 100%)
 */
function updateAccuracy(isCorrect) {
  // 간단한 정확도 계산 (백스페이스 비율로 추정)
  if (appState.currentStats.keyCount > 0 && appState.currentStats.errorCount > 0) {
    const correctKeys = appState.currentStats.keyCount - appState.currentStats.errorCount;
    appState.currentStats.accuracy = Math.round((correctKeys / appState.currentStats.keyCount) * 100);
    
    // 정확도가 너무 낮으면 최소값 설정
    if (appState.currentStats.accuracy < 20) {
      appState.currentStats.accuracy = 20;
    }
  } else {
    // 오류가 없거나 키 입력이 없는 경우 100%
    appState.currentStats.accuracy = 100;
  }
  
  // 오류 처리
  if (!isCorrect) {
    appState.currentStats.errorCount = (appState.currentStats.errorCount || 0) + 1;
  }
}

/**
 * 통계 데이터 저장
 * @param {Object} stats - 저장할 통계 데이터
 * @returns {Object|null} 저장된 데이터 또는 null
 */
function saveStats(stats) {
  try {
    // 로컬 SQLite에 저장
    const savedToLocal = database.saveStats(stats);
    
    // MongoDB/Supabase 동기화 (비동기 처리)
    dataSync.saveAndSyncStats(stats)
      .then(result => {
        if (result.success) {
          debugLog(`클라우드 동기화 성공: ${result.id}`);
        } else {
          console.error('클라우드 동기화 실패:', result.error);
        }
      })
      .catch(error => {
        console.error('클라우드 동기화 오류:', error);
      });
    
    return savedToLocal;
  } catch (error) {
    console.error('통계 저장 오류:', error);
    return null;
  }
}

module.exports = {
  processKeyInput,
  updateAndSendStats,
  saveStats,
  resetStats,
  startTracking,
  stopTracking,
  cleanup,
  initializeWorker,
  analyzeTypingPattern,
  optimizeWorkerMemory,
  // 새로운 함수 내보내기
  switchToLowMemoryMode,
  restoreNormalMode,
  getProcessingMode: () => processingMode,
  getHangulState: () => ({ ...hangulState })
};
