/**
 * 메모리 관리 및 최적화 모듈
 */
const { app } = require('electron');
const { appState, HIGH_MEMORY_THRESHOLD, CRITICAL_MEMORY_THRESHOLD } = require('./constants');
const { debugLog } = require('./utils');

/**
 * 현재 메모리 사용량 정보 가져오기
 * @returns {Object} 메모리 사용량 정보
 */
function getMemoryInfo() {
  try {
    const memoryUsage = process.memoryUsage();
    
    // 메가바이트 단위로 변환
    const heapUsedMB = Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100;
    const heapTotalMB = Math.round(memoryUsage.heapTotal / (1024 * 1024) * 100) / 100;
    const rssMB = Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100;
    const percentUsed = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
    // 시스템 메모리 정보도 함께 기록
    const memoryInfo = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      // 사람이 읽기 쉬운 형태로 변환
      heapUsedMB,
      heapTotalMB,
      rssMB,
      percentUsed
    };
    
    // 앱 상태 업데이트
    appState.memoryUsage = {
      lastCheck: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss
    };
    
    // 메모리 사용량이 임계치를 초과하면 경고 로그
    if (memoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD) {
      debugLog(`경고: 높은 메모리 사용량 감지 (${heapUsedMB}MB / ${heapTotalMB}MB, ${percentUsed}%)`);
    }
    
    return memoryInfo;
  } catch (error) {
    debugLog('메모리 정보 수집 중 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      rss: 0,
      external: 0,
      heapUsedMB: 0,
      heapTotalMB: 0,
      rssMB: 0,
      percentUsed: 0
    };
  }
}

/**
 * 가비지 컬렉션 수행
 * @returns {Object|null} GC 전후 메모리 정보
 */
function performGC() {
  const gcEnabled = typeof global.gc === 'function';
  
  if (!gcEnabled) {
    debugLog('가비지 컬렉션을 수행할 수 없음 (--expose-gc 플래그 필요) - process.argv:', process.argv);
    
    // GC 불가능해도 최대한 메모리 정리 수행
    try {
      // 대용량 객체 참조 해제
      if (appState.oldHistoryData) {
        delete appState.oldHistoryData;
      }
      
      // 강제 GC 힌트
      if (global.gc) {
        global.gc();
      } else if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
      
      // 노드의 메모리 해제 힌트
      if (typeof process !== 'undefined' && process.memoryUsage) {
        if (process.emitWarning) {
          process.emitWarning('Memory limit warning', {
            detail: 'Attempting to release memory'
          });
        }
      }
      
      return null;
    } catch (error) {
      debugLog('대체 메모리 정리 중 오류:', error);
      return null;
    }
  }
  
  const beforeGC = getMemoryInfo();
  
  try {
    // GC 실행 전 추가 메모리 정리 작업
    freeUpMemoryResources(false); // 비긴급 정리
    
    // GC 수행
    global.gc();
    appState.lastGcTime = Date.now();
    
    // GC 후 결과 확인 및 로그 기록
    setTimeout(() => {
      const afterGC = getMemoryInfo();
      
      const savedBytes = beforeGC.heapUsed - afterGC.heapUsed;
      const savedMB = Math.round((savedBytes / (1024 * 1024)) * 100) / 100;
      const percentReduction = Math.round((savedBytes / beforeGC.heapUsed) * 100);
      
      // 절약된 메모리가 있을 때만 로그
      if (savedBytes > 1024 * 1024) { // 1MB 이상 절약된 경우에만
        debugLog(`GC 결과: ${savedMB}MB 회수 (${percentReduction}% 절약), 현재: ${afterGC.heapUsedMB}MB`);
      }
    }, 100);
    
    return { before: beforeGC };
  } catch (error) {
    debugLog('GC 수행 중 오류:', error);
    return null;
  }
}

/**
 * 백그라운드에서 메모리 사용량 최적화
 * @param {boolean} isBackground 백그라운드 상태 여부
 */
function optimizeMemoryForBackground(isBackground) {
  if (!isBackground) {
    // 포그라운드로 돌아오면 기본 상태로 복원
    appState.inBackgroundMode = false;
    return;
  }
  
  // 백그라운드 모드 설정
  appState.inBackgroundMode = true;
  
  // 즉시 GC 수행
  performGC();
  
  // 추가 최적화 설정
  if (appState.settings?.reduceMemoryInBackground) {
    // 백그라운드에서 메모리 최적화 전략 수립
    // - 불필요한 캐시 비우기
    // - 리소스 사용 제한
    
    // 모든 BrowserWindow의 웹 컨텐츠도 GC 요청
    if (appState.mainWindow) {
      appState.mainWindow.webContents.send('request-renderer-gc');
    }
    
    if (appState.miniViewWindow) {
      appState.miniViewWindow.webContents.send('request-renderer-gc');
    }
  }
}

/**
 * 메모리 상태 모니터링 및 최적화
 * @returns {Object} 현재 메모리 정보
 */
function checkMemoryUsage() {
  const memoryInfo = getMemoryInfo();
  const now = Date.now();
  
  // 지정된 시간마다 자동 GC 실행
  const gcInterval = appState.settings?.garbageCollectionInterval || 60000; // 기본값 1분
  
  if (appState.lastGcTime && (now - appState.lastGcTime) > gcInterval) {
    debugLog(`주기적 메모리 체크: ${memoryInfo.heapUsedMB}MB (${memoryInfo.percentUsed}%)`);
    
    // 임계치 초과 시에만 GC 실행 (기본값 30% 이상)
    const minPercentForGC = 30;
    if (memoryInfo.percentUsed > minPercentForGC) {
      performGC();
    }
  }
  
  // 메모리 임계치 초과 시 긴급 정리
  if (memoryInfo.heapUsed > HIGH_MEMORY_THRESHOLD) {
    debugLog(`높은 메모리 사용: ${memoryInfo.heapUsedMB}MB - GC 실행`);
    performGC();
  }
  
  // 백그라운드 모드에서는 더 적극적인 메모리 해제
  if (appState.inBackgroundMode && appState.settings?.reduceMemoryInBackground) {
    // 일정 수준 이상이면 추가 GC
    if (memoryInfo.heapUsed > HIGH_MEMORY_THRESHOLD * 0.5) { // 50%로 임계값 낮춤
      performGC();
    }
  }
  
  // 메모리 위험 수준 시 더 강력한 조치
  if (memoryInfo.heapUsed > CRITICAL_MEMORY_THRESHOLD) {
    debugLog(`위험한 메모리 수준: ${memoryInfo.heapUsedMB}MB - 긴급 조치 실행`);
    freeUpMemoryResources(true); // 긴급 메모리 정리
    performGC(); // 강제 GC
  }
  
  return memoryInfo;
}

/**
 * 추가 메모리 자원 확보를 위한 함수
 * @param {boolean} isEmergency 긴급 상황인지 여부
 */
function freeUpMemoryResources(isEmergency = false) {
  process.nextTick(() => {/* 비워둠 */});
}

/**
 * 메모리 사용량을 최적화하기 위한 리소스 해제
 * @param {boolean} emergency 긴급 상황 여부
 */
function freeUpMemoryResources(emergency = false) {
  try {
    // 현재 메모리 상태 확인
    const memoryBefore = getMemoryInfo();
    
    // 1. 불필요한 캐시 정리
    global.gc && global.gc();
    
    // 2. 대용량 데이터 정리 (긴급 상황에서만)
    if (emergency) {
      // 오래된 로그 데이터 참조 해제
      if (appState.historyLogs && appState.historyLogs.length > 100) {
        appState.historyLogs = appState.historyLogs.slice(-50); // 최근 50개만 유지
      }
      
      // 임시 데이터 정리
      appState.tempData = null;
    }
    
    // 3. 메모리 누수 방지를 위한 참조 순환 끊기
    if (appState.circularRefs) {
      Object.keys(appState.circularRefs).forEach(key => {
        appState.circularRefs[key] = null;
      });
    }
    
    // 4. GPU 메모리 관련 리소스 정리 (추가)
    if (appState.gpuResources && emergency) {
      // GPU 관련 임시 리소스 정리
      if (Array.isArray(appState.gpuResources)) {
        appState.gpuResources.length = 0;
      } else if (typeof appState.gpuResources === 'object') {
        Object.keys(appState.gpuResources).forEach(key => {
          appState.gpuResources[key] = null;
        });
      }
      appState.gpuResources = null;
    }
    
    // 결과 확인
    const memoryAfter = getMemoryInfo();
    const savedMB = Math.round((memoryBefore.heapUsed - memoryAfter.heapUsed) / (1024 * 1024));
    
    debugLog(`메모리 정리 완료: ${savedMB}MB 확보됨 (${emergency ? '긴급모드' : '일반모드'})`);
    
    return {
      before: memoryBefore,
      after: memoryAfter,
      savedBytes: memoryBefore.heapUsed - memoryAfter.heapUsed
    };
  } catch (error) {
    console.error('메모리 리소스 해제 중 오류:', error);
    return null;
  }
}

/**
 * 메모리 모니터링 시작
 */
function setupMemoryMonitoring(interval = 30000) {
  debugLog(`메모리 모니터링 시작 (간격: ${interval}ms)`);
  
  // 초기 메모리 정보 수집
  const initialMemory = getMemoryInfo();
  debugLog(`초기 메모리 상태: ${initialMemory.heapUsedMB}MB (${initialMemory.percentUsed}%)`);
  
  // 주기적 메모리 체크 설정
  const memoryCheckInterval = setInterval(() => {
    checkMemoryUsage();
    
    // 사용자 비활성 상태 확인
    const now = Date.now();
    if (appState.currentStats.lastActiveTime) {
      const idleTime = now - appState.currentStats.lastActiveTime;
      appState.idleTime = idleTime;
      
      // 1분 이상 비활성 상태면 메모리 정리
      if (idleTime > 60000) {
        debugLog('사용자 비활성 상태, 메모리 정리 실행');
        performGC();
      }
    }
  }, interval);
  
  // 앱 종료 시 인터벌 정리
  app.on('will-quit', () => {
    clearInterval(memoryCheckInterval);
    debugLog('메모리 모니터링 정리됨');
    
    // 종료 전 마지막 GC 수행
    if (global.gc) {
      global.gc();
    }
  });
  
  // 메모리 위기 감지 이벤트 설정
  app.on('render-process-gone', (event, webContents, details) => {
    if (['crashed', 'oom'].includes(details.reason)) {
      debugLog(`렌더러 프로세스 문제 발생: ${details.reason} - 메모리 긴급 정리 시작`);
      freeUpMemoryResources(true);
    }
  });
  
  return memoryCheckInterval;
}

/**
 * V8 힙 스냅샷 생성 (디버깅용)
 * @returns {Promise<string>} 힙 스냅샷 파일 경로
 */
async function createHeapSnapshot() {
  try {
    // V8 힙 스냅샷 모듈 동적 로드 (필요한 경우에만)
    const v8 = require('v8');
    const fs = require('fs');
    const path = require('path');
    
    const snapshotDir = path.join(app.getPath('userData'), 'snapshots');
    
    // 디렉토리 생성
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    
    // 스냅샷 파일 경로
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(snapshotDir, `heapsnapshot-${timestamp}.heapsnapshot`);
    
    // 힙 스냅샷 생성
    const snapshot = v8.getHeapSnapshot();
    const fileStream = fs.createWriteStream(snapshotPath);
    
    // 스냅샷 데이터를 파일로 전송
    return new Promise((resolve, reject) => {
      snapshot.pipe(fileStream);
      
      fileStream.on('finish', () => {
        debugLog(`힙 스냅샷 저장 완료: ${snapshotPath}`);
        resolve(snapshotPath);
      });
      
      fileStream.on('error', (err) => {
        debugLog('힙 스냅샷 생성 오류:', err);
        reject(err);
      });
    });
  } catch (error) {
    debugLog('힙 스냅샷 생성 중 오류:', error);
    return Promise.reject(error);
  }
}

module.exports = {
  getMemoryInfo,
  performGC,
  checkMemoryUsage,
  setupMemoryMonitoring,
  optimizeMemoryForBackground,
  freeUpMemoryResources,
  createHeapSnapshot // 추가된 함수
};
