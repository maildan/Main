/**
 * 타이핑 통계 계산을 위한 워커 스레드
 * Node.js worker_threads API 사용 버전
 * 네이티브 모듈을 최대한 활용하도록 최적화됨
 */
const { parentPort, workerData } = require('worker_threads');
const v8 = require('v8');

// 초기 설정값
const memoryLimit = workerData?.memoryLimit || 100 * 1024 * 1024; // 100MB
let processingMode = workerData?.initialMode || 'normal'; // 'normal', 'cpu-intensive', 'gpu-intensive'
let shouldOptimizeMemory = false;
let dataCache = null;
let lastHeapSize = 0;
let gcCounter = 0;

// 네이티브 모듈 로드 시도
let nativeModule = null;
try {
  // 상대 경로로 네이티브 모듈 로드 시도
  nativeModule = require('../../../../native-modules.cjs');
  console.log('네이티브 모듈 로드 성공');
} catch (error) {
  console.warn('네이티브 모듈 로드 실패:', error.message);
  // 오류 발생 시 폴백 모드로 동작
}

/**
 * 메모리 사용량 정보 얻기
 * 네이티브 모듈 또는 v8 API 사용
 */
function getMemoryInfo() {
  try {
    // 네이티브 모듈 사용 시도
    if (nativeModule && typeof nativeModule.get_memory_info === 'function') {
      const nativeMemoryInfo = JSON.parse(nativeModule.get_memory_info());
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
    }

    // 네이티브 모듈을 사용할 수 없는 경우 v8 API 사용
    const memoryUsage = v8.getHeapStatistics();
    const heapUsed = memoryUsage.used_heap_size;
    const heapTotal = memoryUsage.total_heap_size;
    const heapLimit = memoryUsage.heap_size_limit;
    
    return {
      heapUsed,
      heapTotal,
      heapLimit,
      heapUsedMB: heapUsed / (1024 * 1024),
      percentUsed: (heapUsed / heapTotal) * 100,
      rss: memoryUsage.total_physical_size || 0,
      rssMB: (memoryUsage.total_physical_size || 0) / (1024 * 1024),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
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
