/**
 * 메모리 관리 모듈
 * 일렉트론 앱의 메모리 사용량 모니터링 및 최적화를 담당
 */

const { app } = require('electron');
const { appState } = require('./constants');
const { debugLog } = require('./utils');

/**
 * 현재 메모리 사용량 정보 가져오기
 * @returns {Object} 메모리 사용 정보
 */
function getMemoryInfo() {
  try {
    const memoryUsage = process.memoryUsage();
    
    const info = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 10) / 10,
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024) * 10) / 10,
      percentUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    };
    
    // 앱 상태에 저장
    appState.memoryUsage = info;
    
    return info;
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      rss: 0,
      external: 0,
      heapUsedMB: 0,
      rssMB: 0,
      percentUsed: 0
    };
  }
}

/**
 * 메모리 사용량 확인 및 조치
 * @returns {Object} 메모리 사용 정보
 */
function checkMemoryUsage() {
  const memoryInfo = getMemoryInfo();
  const { settings } = appState;
  
  // 설정된 임계값 (기본값: 150MB)
  const threshold = settings?.maxMemoryThreshold || 150;
  
  // 임계값 초과 시 조치
  if (memoryInfo.heapUsedMB > threshold) {
    debugLog(`메모리 사용량 경고: ${memoryInfo.heapUsedMB}MB (임계값: ${threshold}MB)`);
    
    // 기본 메모리 정리 작업
    freeUpMemoryResources(false);
    
    // 메모리 사용량이 매우 높으면 GC 직접 호출 (--expose-gc 옵션 필요)
    if (memoryInfo.heapUsedMB > threshold * 1.5 && global.gc) {
      debugLog('높은 메모리 사용량 감지: GC 수행');
      performGC();
    }
  }
  
  return memoryInfo;
}

/**
 * 수동 가비지 컬렉션 수행
 * @returns {Object|null} GC 전후 메모리 정보
 */
function performGC() {
  try {
    // GC 수행 전 메모리 상태
    const memoryBefore = getMemoryInfo();
    
    // V8 GC 호출 (--expose-gc 옵션이 활성화된 경우에만 작동)
    if (global.gc) {
      debugLog('수동 가비지 컬렉션 수행 중...');
      global.gc();
      
      // GC 후 메모리 상태
      const memoryAfter = getMemoryInfo();
      
      const freedMemory = memoryBefore.heapUsed - memoryAfter.heapUsed;
      const freedMB = Math.round(freedMemory / (1024 * 1024) * 10) / 10;
      
      debugLog(`GC 완료: ${freedMB}MB 메모리 해제됨`);
      
      return {
        before: memoryBefore,
        after: memoryAfter,
        freed: freedMemory,
        freedMB
      };
    } else {
      debugLog('GC를 직접 호출할 수 없습니다. --expose-gc 플래그가 필요합니다.');
      return null;
    }
  } catch (error) {
    console.error('GC 호출 중 오류:', error);
    return null;
  }
}

/**
 * 메모리 리소스 해제 (캐시 정리, 미사용 객체 해제 등)
 * @param {boolean} emergency - 긴급 상황 여부 (true일 경우 더 적극적인 정리)
 */
function freeUpMemoryResources(emergency = false) {
  try {
    debugLog(`메모리 리소스 해제 시작 (긴급 모드: ${emergency})`);
    
    // 앱 상태에서 불필요한 캐시 정리
    if (appState.caches) {
      Object.keys(appState.caches).forEach(key => {
        if (emergency || appState.caches[key].temporary) {
          debugLog(`캐시 정리: ${key}`);
          delete appState.caches[key];
        }
      });
    }
    
    // 웹 컨텐츠 캐시 정리
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      const webContents = appState.mainWindow.webContents;
      
      if (emergency) {
        // 긴급 상황에서는 모든 세션 캐시 정리
        webContents.session.clearCache().then(() => {
          debugLog('웹 세션 캐시 정리 완료');
        }).catch(err => {
          debugLog('웹 세션 캐시 정리 중 오류:', err);
        });
        
        // 코드 캐시 정리 (V8)
        try {
          webContents.session.clearCodeCaches({ urls: ['*'] });
        } catch (e) {
          debugLog('코드 캐시 정리 중 오류:', e);
        }
      } else {
        // 일반 정리에서는 이미지/스크립트 캐시만 선택적으로 정리
        try {
          webContents.session.clearStorageData({
            storages: ['appcache', 'serviceworkers', 'cachestorage'],
            quotas: ['temporary']
          }).then(() => {
            debugLog('임시 웹 스토리지 정리 완료');
          }).catch(err => {
            debugLog('임시 웹 스토리지 정리 중 오류:', err);
          });
        } catch (e) {
          debugLog('스토리지 정리 중 오류:', e);
        }
      }
    }
    
    // 앱이 포그라운드에 없을 때만 수행할 작업
    if (!appState.mainWindow || !appState.mainWindow.isFocused()) {
      // 백그라운드에서 일시 중지할 수 있는 작업들
      if (appState.pollingIntervals) {
        appState.pollingIntervals.forEach(interval => {
          if (interval.id) {
            clearInterval(interval.id);
            debugLog(`폴링 일시 중지: ${interval.name}`);
          }
        });
      }
    }
    
    // 렌더러 프로세스에 메모리 정리 요청 전달
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      try {
        appState.mainWindow.webContents.send('request-renderer-gc', { emergency });
      } catch (e) {
        debugLog('렌더러 GC 요청 중 오류:', e);
      }
    }
    
    return true;
  } catch (error) {
    console.error('메모리 리소스 해제 중 오류:', error);
    return false;
  }
}

/**
 * 앱이 포그라운드로 돌아왔을 때 일시 중지된 작업 재개
 */
function resumeBackgroundTasks() {
  try {
    debugLog('백그라운드 작업 재개');
    
    // 일시 중지된 폴링 작업 재개
    if (appState.pollingIntervals) {
      appState.pollingIntervals.forEach(interval => {
        if (!interval.id && interval.fn && interval.ms) {
          interval.id = setInterval(interval.fn, interval.ms);
          debugLog(`폴링 재개: ${interval.name}`);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('백그라운드 작업 재개 중 오류:', error);
    return false;
  }
}

/**
 * 백그라운드 모드를 위한 메모리 최적화
 * @param {boolean} enable - 백그라운드 최적화 활성화 여부
 * @returns {boolean} - 성공 여부
 */
function optimizeMemoryForBackground(enable = true) {
  try {
    debugLog(`백그라운드 메모리 최적화 ${enable ? '활성화' : '비활성화'}`);
    
    if (enable) {
      // 백그라운드에서 메모리 사용량 줄이기
      freeUpMemoryResources(false);
      
      // GC 직접 호출 시도
      if (global.gc) {
        setTimeout(() => {
          try {
            global.gc();
            debugLog('백그라운드 모드 GC 수행 완료');
          } catch (e) {
            debugLog('백그라운드 GC 수행 중 오류:', e);
          }
        }, 500);
      }
      
      // 폴링 간격 늘리기
      if (appState.pollingIntervals) {
        appState.pollingIntervals.forEach(interval => {
          if (interval.id) {
            clearInterval(interval.id);
            // 백그라운드에서는 간격을 2배로 늘림
            interval.id = setInterval(interval.fn, interval.ms * 2);
            debugLog(`백그라운드 폴링 조정: ${interval.name}`);
          }
        });
      }
    } else {
      // 일반 모드로 복귀
      resumeBackgroundTasks();
      
      // 메모리 최적화 해제 이후 필요한 리소스 다시 로드
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        try {
          appState.mainWindow.webContents.send('background-mode-changed', false);
        } catch (e) {
          debugLog('백그라운드 모드 변경 알림 중 오류:', e);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('백그라운드 메모리 최적화 중 오류:', error);
    return false;
  }
}

/**
 * 메모리 모니터링 설정
 * 주기적으로 메모리 사용량을 체크하고 필요시 최적화
 */
function setupMemoryMonitoring() {
  debugLog('메모리 모니터링 설정 시작');
  
  // 메모리 모니터링 간격 (설정에서 읽어오거나 기본값 30초 사용)
  const getCheckInterval = () => {
    try {
      const { appState } = require('./constants');
      return appState.settings?.garbageCollectionInterval || 30000;
    } catch (error) {
      return 30000; // 기본값
    }
  };
  
  // 메모리 임계값 설정
  const HIGH_MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
  const CRITICAL_MEMORY_THRESHOLD = 150 * 1024 * 1024; // 150MB
  
  // 메모리 모니터링 간격
  let MEMORY_CHECK_INTERVAL = getCheckInterval();
  
  // 주기적인 메모리 확인 및 최적화
  let memoryInterval = null;
  
  // 메모리 모니터링 시작
  const startMemoryMonitoring = () => {
    if (memoryInterval) {
      clearInterval(memoryInterval);
    }
    
    debugLog('주기적 메모리 모니터링 시작');
    
    // 초기 메모리 확인
    checkMemoryUsage();
    
    // 주기적 메모리 확인 설정
    memoryInterval = setInterval(() => {
      checkMemoryUsage();
    }, MEMORY_CHECK_INTERVAL);
  };
  
  // 메모리 모니터링 중지
  const stopMemoryMonitoring = () => {
    if (memoryInterval) {
      clearInterval(memoryInterval);
      memoryInterval = null;
      debugLog('메모리 모니터링 중지됨');
    }
  };
  
  // 메모리 사용량 확인
  const checkMemoryUsage = () => {
    try {
      const memoryInfo = getMemoryInfo();
      
      // 필요시 메모리 최적화 - 단위 변환 명확히 표현
      const heapUsedMB = memoryInfo.heapUsedMB;
      const criticalThresholdMB = CRITICAL_MEMORY_THRESHOLD / (1024 * 1024); // 바이트에서 MB로 변환
      const highThresholdMB = HIGH_MEMORY_THRESHOLD / (1024 * 1024); // 바이트에서 MB로 변환
      
      if (heapUsedMB > criticalThresholdMB) {
        debugLog(`심각한 메모리 사용량 감지: ${heapUsedMB}MB - 긴급 최적화 시작 (임계치: ${criticalThresholdMB}MB)`);
        freeUpMemoryResources(true); // 긴급 모드
      } else if (heapUsedMB > highThresholdMB) {
        debugLog(`높은 메모리 사용량 감지: ${heapUsedMB}MB - 표준 최적화 시작 (임계치: ${highThresholdMB}MB)`);
        freeUpMemoryResources(false); // 표준 모드
      }
      
      return memoryInfo;
    } catch (error) {
      console.error('메모리 사용량 확인 중 오류:', error);
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        heapUsedMB: 0,
        rssMB: 0,
        percentUsed: 0
      };
    }
  };
  
  // 메모리 최적화 함수 (기존 함수 사용)
  const freeUpMemoryResources = (emergency = false) => {
    try {
      // 임시 변수 제거
      global.gc && global.gc();
      
      debugLog(`메모리 최적화 수행됨 (긴급 모드: ${emergency})`);
      
      return true;
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
      return false;
    }
  };
  
  // 메모리 정보 가져오기
  const getMemoryInfo = () => {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsed = memoryUsage.heapUsed;
      const heapTotal = memoryUsage.heapTotal;
      const rss = memoryUsage.rss;
      const external = memoryUsage.external;
      
      const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 10) / 10;
      const rssMB = Math.round(rss / (1024 * 1024));
      const percentUsed = Math.round((heapUsed / heapTotal) * 100);
      
      return {
        timestamp: Date.now(),
        heapUsed,
        heapTotal,
        rss,
        external,
        heapUsedMB,
        rssMB,
        percentUsed
      };
    } catch (error) {
      console.error('메모리 정보 가져오기 오류:', error);
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        heapUsedMB: 0,
        rssMB: 0,
        percentUsed: 0
      };
    }
  };
  
  // 설정 변경 시 모니터링 간격 업데이트
  const updateCheckInterval = (newInterval) => {
    if (newInterval && typeof newInterval === 'number' && newInterval > 0) {
      MEMORY_CHECK_INTERVAL = newInterval;
      
      // 이미 실행 중이라면 다시 시작
      if (memoryInterval) {
        stopMemoryMonitoring();
        startMemoryMonitoring();
      }
      
      debugLog(`메모리 모니터링 간격 업데이트: ${newInterval}ms`);
      return true;
    }
    return false;
  };
  
  // 모니터링 시작
  startMemoryMonitoring();
  
  // 앱이 끝날 때 정리
  app.on('will-quit', () => {
    stopMemoryMonitoring();
  });
  
  // 인터페이스 반환
  return {
    start: startMemoryMonitoring,
    stop: stopMemoryMonitoring,
    check: checkMemoryUsage,
    updateInterval: updateCheckInterval,
    getMemoryInfo
  };
}

// 모듈 내보내기
module.exports = {
  getMemoryInfo,
  checkMemoryUsage,
  performGC,
  freeUpMemoryResources,
  resumeBackgroundTasks,
  optimizeMemoryForBackground,
  setupMemoryMonitoring
};
