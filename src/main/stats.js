const { Worker } = require('worker_threads');
const path = require('path');
const { appState, BROWSER_DISPLAY_NAMES, IDLE_TIMEOUT, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { debugLog, formatTime } = require('./utils');
const { saveStats: saveStatsToDb, getStatById } = require('./database');

// 워커 인스턴스 관리
let statWorker = null;
let workerInitialized = false;
let workerMemoryUsage = { heapUsed: 0, heapTotal: 0 };
let lastWorkerCheck = 0;
let pendingTasks = [];

// 메모리 사용량 임계치 및 처리 모드 상태
const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
let processingMode = 'normal'; // 'normal', 'cpu-intensive', 'gpu-intensive'

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
 * 키 입력 처리 함수
 * @param {string} windowTitle - 현재 활성 창 제목
 * @param {string} browserName - 브라우저 이름
 * @param {Object} keyData - 키 입력 데이터 (옵션)
 */
function processKeyInput(windowTitle, browserName, keyData = null) {
  const now = Date.now();
  
  // 창 전환 감지
  if (appState.currentStats.currentWindow !== windowTitle) {
    appState.currentStats.currentWindow = windowTitle;
    appState.currentStats.currentBrowser = BROWSER_DISPLAY_NAMES[browserName] || browserName;
    debugLog('창 전환 감지:', {
      title: windowTitle,
      browser: appState.currentStats.currentBrowser
    });
  }

  // 디버그 로그 추가
  if (keyData) {
    debugLog(`키 입력 처리: ${JSON.stringify({
      type: keyData.type || 'keyDown',
      key: keyData.key || '정보 없음',
      text: keyData.text || '',
      timestamp: now
    })}`);
  }

  // 타자 수 증가 처리 로직
  if (!keyData) {
    // 키 데이터가 없는 경우 간단히 카운트 증가
    appState.currentStats.keyCount++;
    debugLog(`일반 키 입력: 카운트=${appState.currentStats.keyCount}`);
  } else if (keyData.type === 'compositionend' && keyData.text) {
    // 한글 조합 완료: 텍스트 길이만큼 카운트 증가
    const textLength = keyData.text.length;
    appState.currentStats.keyCount += textLength;
    
    // 현재 문자열 추가 (통계 계산용)
    if (!appState.currentContent) appState.currentContent = '';
    appState.currentContent += keyData.text;
    
    debugLog(`한글 입력 완료: "${keyData.text}" (${textLength}자), 누적=${appState.currentStats.keyCount}`);
  } else if (keyData.type === 'compositionupdate') {
    // 한글 조합 중: 카운트는 증가시키지 않고 로그만 남김
    debugLog(`한글 조합 중: "${keyData.text || ''}"`);
  } else if (keyData.type === 'keyDown' && keyData.key && keyData.key.length === 1) {
    // 일반 키 입력 (영문, 숫자, 특수문자 등)
    appState.currentStats.keyCount++;
    
    // 현재 문자열 추가 (통계 계산용)
    if (!appState.currentContent) appState.currentContent = '';
    appState.currentContent += keyData.key;
    
    debugLog(`일반 문자 입력: "${keyData.key}", 누적=${appState.currentStats.keyCount}`);
  } else if (keyData.type === 'keyDown') {
    // 특수 키 입력 (Enter, Tab, Space 등)
    appState.currentStats.keyCount++;
    
    // 현재 문자열에 공백 추가 (Enter, Tab, Space 등은 공백으로 처리)
    if (keyData.key === 'Enter' || keyData.key === 'Tab' || keyData.key === ' ' || keyData.key === 'Space') {
      if (!appState.currentContent) appState.currentContent = '';
      appState.currentContent += ' ';
    }
    
    debugLog(`특수 키 입력: ${keyData.key}, 누적=${appState.currentStats.keyCount}`);
  } else if (keyData.simulated) {
    // 시뮬레이션된 키 입력 (테스트용)
    appState.currentStats.keyCount++;
    debugLog(`시뮬레이션 키 입력: ${keyData.key || '정보 없음'}, 누적=${appState.currentStats.keyCount}`);
  }
  
  // 첫 키 입력이거나 일정 시간 이후 입력인 경우
  if (!appState.currentStats.startTime || (now - appState.currentStats.lastActiveTime) > IDLE_TIMEOUT) {
    if (!appState.currentStats.startTime) {
      appState.currentStats.startTime = now;
      debugLog('타이핑 세션 시작');
    } else {
      debugLog(`타이핑 세션 재개 (비활성 시간: ${formatTime(Math.floor((now - appState.currentStats.lastActiveTime) / 1000))})`);
    }
  }
  
  appState.currentStats.lastActiveTime = now;
  
  // 현재 통계 업데이트 및 UI에 전송
  updateAndSendStats();
  
  // 일정 키 입력마다 별도 스레드에서 고급 통계 계산
  if (appState.currentStats.keyCount % 20 === 0) {
    calculateStatsInWorker();
  }
}

/**
 * 워커를 사용하여 통계 계산
 * 메모리 최적화: CPU 집약적 작업을 별도 스레드로 분리
 */
function calculateStatsInWorker() {
  // 워커가 아직 초기화되지 않은 경우 초기화
  if (!statWorker) {
    initializeWorker();
  }
  
  const message = {
    action: 'calculate-stats',
    data: {
      keyCount: appState.currentStats.keyCount,
      typingTime: appState.currentStats.typingTime,
      content: appState.currentContent || '',
      errors: appState.currentStats.errors || 0,
      processingMode: processingMode // 현재 처리 모드 전달
    }
  };
  
  if (statWorker && workerInitialized) {
    // 워커가 준비된 경우 메시지 전송
    try {
      statWorker.postMessage(message);
    } catch (error) {
      console.error('워커 메시지 전송 오류:', error);
      
      // 오류 발생 시 대안 처리
      try {
        // 메모리 사용량 초과 여부에 따라 처리 방식 선택
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > MEMORY_THRESHOLD) {
          // 메모리 사용량이 높은 경우 경량화된 계산 수행
          updateCalculatedStatsLite();
          debugLog('메모리 사용량 초과: 경량화된 계산 수행');
        } else {
          // 일반적인 경우 표준 계산 수행
          updateCalculatedStatsMain();
        }
      } catch (fallbackError) {
        console.error('폴백 계산 중 오류:', fallbackError);
        // 최소한의 상태 업데이트
        updateCalculatedStatsMinimal();
      }
    }
  } else {
    // 워커가 준비되지 않은 경우 표준 계산으로 폴백
    debugLog('워커 사용 불가: 메인 스레드에서 계산');
    updateCalculatedStatsMain();
  }
}

/**
 * 경량화된 통계 계산 (메모리 사용량 최소화)
 */
function updateCalculatedStatsLite() {
  const { keyCount, typingTime } = appState.currentStats;
  
  // 최소한의 필수 계산만 수행
  appState.currentStats.totalWords = Math.round(keyCount / 5);
  appState.currentStats.totalChars = keyCount;
  appState.currentStats.pages = keyCount / 1800;
  appState.currentStats.accuracy = 100;
}

/**
 * 최소한의 통계 계산 (긴급 상황용)
 */
function updateCalculatedStatsMinimal() {
  // 메모리 사용을 최소화하기 위해 가장 기본적인 계산만 수행
  appState.currentStats.totalWords = Math.round(appState.currentStats.keyCount / 5);
  appState.currentStats.totalChars = appState.currentStats.keyCount;
}

/**
 * 워커 상태 확인 및 필요시 재시작
 */
function checkWorkerStatus() {
  lastWorkerCheck = Date.now();
  
  // 워커가 없거나 초기화되지 않은 경우 재시작
  if (!statWorker) {
    debugLog('워커 없음, 재초기화');
    initializeWorker();
    return;
  }
  
  // 메모리 사용량이 너무 높은 경우 워커 재시작
  if (workerMemoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD * 2) {
    debugLog('워커 메모리 사용량 과다, 재시작');
    restartWorker();
    return;
  }
  
  // 워커 메모리 최적화 요청 (일반 모드)
  optimizeWorkerMemory(false);
}

/**
 * 워커 재시작
 */
function restartWorker() {
  if (statWorker) {
    debugLog('워커 재시작');
    try {
      // 기존 워커 종료
      statWorker.terminate();
      statWorker = null;
      workerInitialized = false;
      
      // 메모리 정리
      if (global.gc) {
        global.gc();
      }
      
      // 새 워커 시작
      setTimeout(() => {
        initializeWorker();
      }, 500); // 약간의 지연 후 재시작
      
    } catch (error) {
      console.error('워커 재시작 중 오류:', error);
    }
  } else {
    initializeWorker();
  }
}

/**
 * 워커 없이 메인 스레드에서 간단한 통계 계산 (폴백)
 * 메모리 최적화: 필수 계산만 수행
 */
function updateCalculatedStatsMain() {
  const { keyCount } = appState.currentStats;
  
  // 간단한 추정
  appState.currentStats.totalWords = Math.round(keyCount / 5);
  appState.currentStats.totalChars = keyCount;
  appState.currentStats.pages = keyCount / 1800;
  appState.currentStats.accuracy = 100; // 기본값
}

/**
 * 통계 업데이트 및 UI로 전송
 * 메모리 최적화: 객체 복제 최소화
 */
function updateAndSendStats() {
  if (!appState.mainWindow) return;
  
  // 현재 시간 기준으로 타이핑 시간 계산
  const now = Date.now();
  const typingTime = appState.currentStats.startTime 
    ? Math.floor((now - appState.currentStats.startTime) / 1000) 
    : 0;
    
  // 타이핑 시간 업데이트
  appState.currentStats.typingTime = typingTime;
  
  // 필요한 통계 계산 (객체 복제 없이)
  if (!appState.currentStats.totalWords) {
    appState.currentStats.totalWords = Math.round(appState.currentStats.keyCount / 5);
  }
  
  if (!appState.currentStats.totalChars) {
    appState.currentStats.totalChars = appState.currentStats.keyCount;
  }
  
  if (!appState.currentStats.totalCharsNoSpace) {
    appState.currentStats.totalCharsNoSpace = Math.round(appState.currentStats.keyCount * 0.8);
  }
  
  appState.currentStats.pages = appState.currentStats.totalChars / 1800;
  
  // UI에 통계 전송 (불필요한 속성 제외)
  if (appState.mainWindow.webContents) {
    appState.mainWindow.webContents.send('typing-stats-update', {
      keyCount: appState.currentStats.keyCount,
      typingTime: appState.currentStats.typingTime,
      windowTitle: appState.currentStats.currentWindow,
      browserName: appState.currentStats.currentBrowser,
      totalChars: appState.currentStats.totalChars,
      totalWords: appState.currentStats.totalWords,
      pages: appState.currentStats.pages,
      accuracy: appState.currentStats.accuracy
    });
  }
  
  // 트레이 메뉴 갱신
  const { updateTrayMenu } = require('./tray');
  if (typeof updateTrayMenu === 'function') {
    updateTrayMenu();
  }
  
  // 미니뷰가 있다면 미니뷰 업데이트
  updateMiniViewStats();
  
  // 주기적 메모리 사용량 체크 (50회 간격)
  if (appState.currentStats.keyCount % 50 === 0) {
    const { checkMemoryUsage } = require('./memory-manager');
    checkMemoryUsage();
  }
  
  // 디버깅용 로그 (필수적인 경우만)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && appState.currentStats.keyCount % 200 === 0) {
    debugLog('통계 업데이트:', {
      keyCount: appState.currentStats.keyCount,
      typingTime: formatTime(typingTime),
      window: appState.currentStats.currentWindow?.substring(0, 30)
    });
  }
}

/**
 * 미니뷰 통계 업데이트
 */
function updateMiniViewStats() {
  // 미니뷰 창이 있고 표시 중인 경우에만 업데이트
  if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed() && appState.miniViewWindow.isVisible()) {
    appState.miniViewWindow.webContents.send('mini-view-stats-update', {
      keyCount: appState.currentStats.keyCount,
      typingTime: appState.currentStats.typingTime,
      windowTitle: appState.currentStats.currentWindow,
      browserName: appState.currentStats.currentBrowser,
      totalChars: appState.currentStats.totalChars,
      totalWords: appState.currentStats.totalWords,
      accuracy: appState.currentStats.accuracy,
      isTracking: appState.isTracking
    });
  }
}

/**
 * 타이핑 패턴 분석 요청
 */
function analyzeTypingPattern() {
  if (!statWorker || !workerInitialized) {
    if (!statWorker) {
      initializeWorker();
    }
    return;
  }
  
  // 최소 100회 이상의 키 입력이 있는 경우에만 분석 수행
  if (appState.keyPresses && appState.keyPresses.length >= 100) {
    try {
      // 필요한 데이터만 복사하여 메모리 사용 최적화
      const keyPresses = appState.keyPresses.slice(-1000); // 최대 1000개만 사용
      const timestamps = appState.keyTimestamps.slice(-1000); // 최대 1000개만 사용
      
      statWorker.postMessage({
        action: 'analyze-typing-pattern',
        data: {
          keyPresses,
          timestamps
        }
      });
    } catch (error) {
      console.error('타이핑 패턴 분석 요청 중 오류:', error);
    }
  }
}

/**
 * 통계 저장 처리
 * @param {string} content - 저장할 내용 설명
 * @returns {object} 저장된 통계 데이터
 */
function saveStats(content) {
  if (!appState.mainWindow) return null;
  
  try {
    // 메모리 최적화: 필요한 데이터만 포함
    const stats = {
      content,
      key_count: appState.currentStats.keyCount,
      typing_time: appState.currentStats.typingTime,
      timestamp: new Date().toISOString(),
      window_title: appState.currentStats.currentWindow,
      browser_name: appState.currentStats.currentBrowser,
      total_chars: appState.currentStats.totalChars,
      total_words: appState.currentStats.totalWords,
      pages: appState.currentStats.pages,
      accuracy: appState.currentStats.accuracy
    };
    
    debugLog('저장할 통계 데이터:', stats);
    
    // SQLite 데이터베이스에 저장
    const savedId = saveStatsToDb(stats);
    
    // 메모리 사용량 최적화를 위한 통계 초기화
    resetStats();
    
    // 저장된 데이터 반환
    return getStatById(savedId) || stats;
  } catch (error) {
    console.error('통계 저장 중 오류:', error);
    
    // 오류 발생 시에도 통계 초기화
    resetStats();
    return null;
  }
}

/**
 * 통계 초기화
 * 메모리 최적화: 객체 재생성 대신 속성만 초기화
 */
function resetStats() {
  // 기존 객체의 참조는 유지하면서 내부 값만 초기화
  const stats = appState.currentStats;
  stats.keyCount = 0;
  stats.typingTime = 0;
  stats.startTime = null;
  stats.lastActiveTime = null;
  stats.totalChars = 0;
  stats.totalWords = 0;
  stats.totalCharsNoSpace = 0;
  stats.pages = 0;
  stats.accuracy = 100;
  
  // 창 정보는 유지 (불필요한 문자열 재생성 방지)
  debugLog('통계 초기화 완료');
  
  // 메모리 정리
  if (global.gc && appState.currentStats.keyCount > 1000) {
    global.gc();
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
  getProcessingMode: () => processingMode
};
