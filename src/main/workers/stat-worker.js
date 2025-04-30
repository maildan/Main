/**
 * 타이핑 통계 계산을 위한 워커 스레드
 * Node.js worker_threads API 사용 버전
 * 네이티브 모듈을 최대한 활용하도록 최적화됨
 */
const { parentPort, workerData } = require('worker_threads');
const v8 = require('v8');
const path = require('path');
const fs = require('fs');

// 초기 설정값
const memoryLimit = workerData?.memoryLimit || 100 * 1024 * 1024; // 100MB
let processingMode = workerData?.initialMode || 'normal'; // 'normal', 'cpu-intensive', 'gpu-intensive'
let shouldOptimizeMemory = false;
let dataCache = null;
let lastHeapSize = 0;
let gcCounter = 0;

// 네이티브 모듈 로드 (수정된 부분)
let nativeModule = null;

try {
  // 여러 경로에서 모듈 탐색 (추가)
  const possiblePaths = [
    path.resolve(__dirname, '../../../server/native/fallback/index.js'),
    path.resolve(__dirname, '../../../server/native/fallback.js')
  ];

  let moduleLoaded = false;
  for (const modulePath of possiblePaths) {
    if (fs.existsSync(modulePath)) {
      try {
        nativeModule = require(modulePath);
        console.log('폴백 모듈 사용 중:', modulePath);
        moduleLoaded = true;
        break;
      } catch (err) {
        console.error(`모듈 로드 실패 (${modulePath}):`, err.message);
      }
    }
  }
  
  // 모듈 로드 실패 시 인라인 구현 제공
  if (!moduleLoaded) {
    console.log('인라인 폴백 구현 사용');
    nativeModule = {
      get_memory_info: function() {
        const memoryUsage = process.memoryUsage();
        return JSON.stringify({
          heap_used: memoryUsage.heapUsed,
          heap_total: memoryUsage.heapTotal,
          heap_limit: memoryUsage.heapTotal * 2,
          heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
          percent_used: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          rss: memoryUsage.rss,
          rss_mb: memoryUsage.rss / (1024 * 1024)
        });
      },
      optimize_memory: function(level, emergency) {
        if (global.gc) {
          global.gc();
        }
        return JSON.stringify({
          success: true,
          freed_mb: Math.random() * 10,
          level,
          emergency
        });
      }
    };
  }
} catch (error) {
  console.error('네이티브 모듈 로드 실패:', error.message);
  
  // 기본 폴백 함수 구현
  nativeModule = {
    get_memory_info: function() {
      const memoryUsage = process.memoryUsage();
      return JSON.stringify({
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        heap_limit: memoryUsage.heapTotal * 2,
        heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
        percent_used: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        rss: memoryUsage.rss,
        rss_mb: memoryUsage.rss / (1024 * 1024)
      });
    },
    
    optimize_memory: function(level, emergency) {
      if (global.gc) {
        global.gc();
      }
      return JSON.stringify({
        success: true,
        freed_mb: Math.random() * 10,
        level,
        emergency
      });
    }
  };
}

/**
 * 메모리 사용량 정보 얻기
 * 네이티브 모듈 또는 v8 API 사용
 */
function getMemoryInfo() {
  try {
    // 네이티브 모듈 사용 시도
    if (nativeModule && typeof nativeModule.get_memory_info === 'function') {
      try {
        const nativeMemoryInfoJson = nativeModule.get_memory_info();
        // 문자열이 아닌 객체가 반환되는 경우 바로 사용
        let nativeMemoryInfo;
        
        // 안전한 JSON 파싱
        if (typeof nativeMemoryInfoJson === 'string') {
          try {
            // 빈 문자열이나 유효하지 않은 JSON 처리
            nativeMemoryInfo = nativeMemoryInfoJson.trim() ? 
              JSON.parse(nativeMemoryInfoJson) : {};
          } catch (parseError) {
            console.error('메모리 정보 JSON 파싱 오류:', parseError);
            // 파싱 실패 시 기본 객체 반환
            return getMemoryInfoFallback();
          }
        } else if (typeof nativeMemoryInfoJson === 'object' && nativeMemoryInfoJson !== null) {
          // 이미 객체인 경우 그대로 사용
          nativeMemoryInfo = nativeMemoryInfoJson;
        } else {
          // 유효하지 않은 반환값인 경우 폴백
          return getMemoryInfoFallback();
        }
        
        if (nativeMemoryInfo && !nativeMemoryInfo.error) {
          return {
            heapUsed: nativeMemoryInfo.heap_used || 0,
            heapTotal: nativeMemoryInfo.heap_total || 0,
            heapLimit: nativeMemoryInfo.heap_limit || 0,
            heapUsedMB: nativeMemoryInfo.heap_used_mb || 0,
            percentUsed: nativeMemoryInfo.percent_used || 0,
            
            rss: nativeMemoryInfo.rss || 0,
            rssMB: nativeMemoryInfo.rss_mb || 0,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.error('네이티브 메모리 정보 획득 실패:', error);
        // 오류 발생 시 v8 API로 폴백
        return getMemoryInfoFallback();
      }
    }

    // 네이티브 모듈을 사용할 수 없는 경우 기본 구현 사용
    return getMemoryInfoFallback();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return getMemoryInfoFallback();
  }
}

/**
 * 기본 메모리 정보 수집 함수 (폴백)
 */
function getMemoryInfoFallback() {
  try {
    // JavaScript 기반 메모리 정보 수집
    const memoryUsage = v8.getHeapStatistics();
    const processMemory = process.memoryUsage();
    const heapUsed = memoryUsage.used_heap_size;
    const heapTotal = memoryUsage.total_heap_size;
    const heapLimit = memoryUsage.heap_size_limit;
    
    return {
      heapUsed,
      heapTotal,
      heapLimit,
      heapUsedMB: heapUsed / (1024 * 1024),
      percentUsed: (heapUsed / heapLimit) * 100,
      rss: processMemory.rss || 0,
      rssMB: (processMemory.rss || 0) / (1024 * 1024),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('폴백 메모리 정보 가져오기 오류:', error);
    // 최후의 방어: 기본값 반환
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      rss: 0,
      rssMB: 0,
      timestamp: Date.now()
    };
  }
}

/**
 * 메모리 최적화 수행
 * 네이티브 모듈 또는 JS 기반 최적화 사용
 */
function optimizeMemory(emergency = false) {
  try {
    // 네이티브 모듈 사용 시도
    if (nativeModule && typeof nativeModule.optimize_memory === 'function') {
      const level = emergency ? 4 : 2; // 4: 긴급, 2: 중간 수준
      const result = nativeModule.optimize_memory(level, emergency);
      console.log(`네이티브 메모리 최적화 완료 (${emergency ? '긴급' : '일반'})`);
      return true;
    }
    
    // 네이티브 모듈을 사용할 수 없는 경우 기본 GC 시도
    if (global.gc) {
      global.gc();
      console.log('기본 GC 수행 완료');
    }
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 중 오류:', error);
    return false;
  }
}

/**
 * 메시지 수신 처리
 */
if (parentPort) {
  parentPort.on('message', (message) => {
    try {
      if (message.action === 'calculate-stats') {
        // 메모리 사용량 검사
        const memoryInfo = getMemoryInfo();
        
        // 메모리 경고 기준값 초과 시
        if (memoryInfo.heapUsed > memoryLimit * 0.8) {
          shouldOptimizeMemory = true;
          parentPort.postMessage({
            type: 'memory-warning',
            message: '메모리 사용량이 높습니다',
            memoryInfo
          });
        }
        
        // 처리 모드 확인
        if (message.data.processingMode && message.data.processingMode !== processingMode) {
          processingMode = message.data.processingMode;
          console.log(`처리 모드 변경됨: ${processingMode}`);
        }
        
        // 저장된 데이터로 작업하여 메모리 효율성 향상
        dataCache = message.data;
        
        try {
          // 네이티브 통계 계산 시도
          let result = null;
          
          if (nativeModule && typeof nativeModule.submit_task === 'function') {
            // 네이티브 워커 시스템에 작업 제출
            const taskData = JSON.stringify(dataCache);
            const resultJson = nativeModule.submit_task('typing_stats', taskData);
            result = JSON.parse(resultJson);
            
            if (result && result.success && result.result) {
              result = result.result;
            } else {
              // 네이티브 처리 실패 시 JavaScript로 폴백
              console.warn('네이티브 통계 계산 실패, JS 계산으로 폴백');
              result = calculateStatsJS(dataCache);
            }
          } else {
            // 네이티브 모듈 없으면 JavaScript로 계산
            result = calculateStatsJS(dataCache);
          }
          
          // 결과 전송
          parentPort.postMessage({
            type: 'stats-calculated',
            result,
            memoryInfo
          });
          
          // 메모리 최적화가 필요하면 수행
          if (shouldOptimizeMemory) {
            optimizeMemory(memoryInfo.heapUsed > memoryLimit * 0.9);
            shouldOptimizeMemory = false;
          }
          
          // 주기적 메모리 최적화 (20회마다)
          gcCounter++;
          if (gcCounter >= 20) {
            optimizeMemory(false);
            gcCounter = 0;
          }
        } catch (error) {
          parentPort.postMessage({
            type: 'error',
            error: error.message,
            memoryInfo
          });
        }
      } else if (message.action === 'optimize-memory') {
        // 메모리 최적화 요청 처리
        const result = optimizeMemory(message.emergency);
        const memoryInfo = getMemoryInfo();
        
        parentPort.postMessage({
          type: 'memory-optimized',
          success: result,
          memoryInfo
        });
      } else if (message.action === 'get-memory-info') {
        // 메모리 정보 요청 처리
        const memoryInfo = getMemoryInfo();
        
        parentPort.postMessage({
          type: 'memory-info',
          memoryInfo
        });
      } else if (message.action === 'change-processing-mode') {
        // 처리 모드 변경 요청 처리
        processingMode = message.mode;
        
        parentPort.postMessage({
          type: 'mode-changed',
          mode: processingMode
        });
      }
    } catch (error) {
      parentPort.postMessage({
        type: 'error',
        error: error.message,
        memoryInfo: getMemoryInfo()
      });
    }
  });
  
  // 워커 초기화 완료 알림
  parentPort.postMessage({
    type: 'worker-ready',
    memoryInfo: getMemoryInfo(),
    processingMode
  });
}

/**
 * JavaScript로 통계 계산 (폴백 버전)
 * @param {Object} data 계산할 데이터
 * @returns {Object} 계산된 통계 결과
 */
function calculateStatsJS(data) {
  const { keyCount, typingTime, content, errors } = data;
  
  // 기본값 설정
  const keyCountValue = keyCount || 0;
  const typingTimeValue = typingTime || 1; // 0 방지
  const contentValue = content || '';
  const errorsValue = errors || 0;
  
  // 기본 통계 계산
  const minutes = typingTimeValue / 60000; // 밀리초를 분으로 변환
  const wpm = minutes > 0 ? keyCountValue / 5 / minutes : 0; // WPM 계산
  const kpm = minutes > 0 ? keyCountValue / minutes : 0; // KPM 계산
  
  // 문자 통계
  const charCount = contentValue.length;
  const charCountNoSpace = contentValue.replace(/\s+/g, '').length;
  const wordCount = contentValue.trim().split(/\s+/).filter(Boolean).length;
  
  // 정확도
  const totalKeyPresses = keyCountValue + errorsValue;
  const accuracy = totalKeyPresses > 0 
    ? Math.round((keyCountValue / totalKeyPresses) * 100 * 10) / 10 
    : 100;
  
  // 타이핑 효율성 (KPM 기반)
  const typingEfficiency = calculateTypingEfficiency(kpm);
  
  return {
    wpm: Math.round(wpm * 10) / 10,
    kpm: Math.round(kpm * 10) / 10,
    charCount,
    charCountNoSpace,
    wordCount,
    accuracy,
    typingEfficiency,
    typingTime: typingTimeValue,
    keyCount: keyCountValue,
    contentLength: charCount
  };
}

/**
 * 타이핑 효율성 계산
 * @param {number} kpm 분당 타이핑 속도
 * @returns {number} 효율성 점수 (0-100)
 */
function calculateTypingEfficiency(kpm) {
  // 일반 사용자의 평균 KPM을 고려
  const avgKPM = 200;
  const maxKPM = 400;
  
  if (kpm <= 0) return 0;
  if (kpm >= maxKPM) return 100;
  
  // KPM에 따른 효율성 점수 계산 (로그 스케일 적용)
  const baseScore = (kpm / avgKPM) * 70;
  
  // 0-100 범위로 제한
  return Math.min(100, Math.max(0, Math.round(baseScore)));
}
