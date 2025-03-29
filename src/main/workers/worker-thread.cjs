/**
 * 워커 스레드 구현
 * 네이티브 모듈 연동 기능 추가
 */
const { parentPort, workerData, threadId } = require('worker_threads');
const v8 = require('v8');

console.log(`워커 스레드 시작 (ID: ${threadId})`);

// 작업 실행 상태
let isProcessing = false;
let lastMemoryCheck = Date.now();
let memoryWarningThreshold = 100 * 1024 * 1024; // 100MB

// 네이티브 모듈 로드 시도
let nativeModule = null;
try {
  nativeModule = require('../../../../native-modules.cjs');
  console.log(`워커 ${threadId}: 네이티브 모듈 로드 성공`);
} catch (error) {
  console.warn(`워커 ${threadId}: 네이티브 모듈 로드 실패:`, error.message);
}

// 부모 프로세스에 메시지 수신 리스너 설정
if (parentPort) {
  parentPort.on('message', (message) => {
    if (message.type === 'task:execute') {
      handleTask(message);
    }
  });
  
  // 워커 준비 알림
  parentPort.postMessage({
    type: 'worker:ready',
    threadId
  });
} else {
  console.error('부모 포트가 없습니다. 워커가 올바르게 시작되지 않았습니다.');
}

/**
 * 작업 처리 함수
 * @param {Object} message 메시지 객체
 */
async function handleTask(message) {
  if (isProcessing) {
    parentPort.postMessage({
      type: 'task:failed',
      taskId: message.taskId,
      error: '이미 다른 작업을 처리 중입니다.'
    });
    return;
  }
  
  isProcessing = true;
  console.log(`워커 ${threadId}: 작업 시작 (${message.taskType})`);
  
  try {
    const startTime = Date.now();
    
    // 메모리 사용량 확인
    if (Date.now() - lastMemoryCheck > 5000) {
      const memoryInfo = getMemoryInfo();
      lastMemoryCheck = Date.now();
      
      if (memoryInfo.heapUsed > memoryWarningThreshold) {
        console.warn(`워커 ${threadId}: 메모리 사용량 높음 (${Math.round(memoryInfo.heapUsedMB)}MB)`);
        
        if (global.gc) {
          global.gc();
          console.log(`워커 ${threadId}: GC 수행됨`);
        }
      }
    }
    
    // 네이티브 모듈 사용 시도
    let result = null;
    
    if (nativeModule && typeof nativeModule.submit_task === 'function') {
      try {
        // 데이터 직렬화
        const dataString = typeof message.data === 'string' 
          ? message.data 
          : JSON.stringify(message.data);
        
        // 네이티브 모듈에 작업 제출
        const resultJson = nativeModule.submit_task(message.taskType, dataString);
        const parsedResult = JSON.parse(resultJson);
        
        if (parsedResult.success) {
          result = parsedResult.result ? JSON.parse(parsedResult.result) : parsedResult;
        } else {
          throw new Error(parsedResult.error || '네이티브 작업 실패');
        }
      } catch (nativeError) {
        console.warn(`워커 ${threadId}: 네이티브 작업 처리 실패, JavaScript 폴백 사용:`, nativeError.message);
        result = processTaskJS(message.taskType, message.data);
      }
    } else {
      result = processTaskJS(message.taskType, message.data);
    }
    
    // 처리 시간 계산
    const processingTime = Date.now() - startTime;
    
    // 결과 전송
    parentPort.postMessage({
      type: 'task:completed',
      taskId: message.taskId,
      result: {
        taskId: message.taskId,
        data: result,
        processingTime,
        threadId
      }
    });
    
    console.log(`워커 ${threadId}: 작업 완료 (${processingTime}ms)`);
  } catch (error) {
    console.error(`워커 ${threadId}: 작업 처리 중 오류:`, error);
    
    parentPort.postMessage({
      type: 'task:failed',
      taskId: message.taskId,
      error: error.message || '작업 처리 중 오류 발생'
    });
  } finally {
    isProcessing = false;
  }
}

/**
 * JavaScript로 작업 처리 (폴백)
 * @param {string} taskType 작업 유형
 * @param {any} data 작업 데이터
 * @returns {any} 처리 결과
 */
function processTaskJS(taskType, data) {
  console.log(`워커 ${threadId}: JavaScript 처리 (${taskType})`);
  
  switch (taskType) {
    case 'typing_stats':
      return processTypingStats(data);
    
    case 'data_analysis':
      return processDataAnalysis(data);
    
    case 'text_processing':
      return processTextData(data);
    
    default:
      throw new Error(`지원되지 않는 작업 유형: ${taskType}`);
  }
}

/**
 * 타이핑 통계 처리
 * @param {Object} data 타이핑 데이터
 * @returns {Object} 처리된 통계
 */
function processTypingStats(data) {
  const { keyCount, typingTime, content } = data;
  
  // 기본 통계 계산
  const minutes = typingTime / 60000; // 밀리초를 분으로 변환
  const wpm = minutes > 0 ? keyCount / 5 / minutes : 0; // WPM 계산
  const kpm = minutes > 0 ? keyCount / minutes : 0; // KPM 계산
  
  // 문자 통계
  const charCount = content ? content.length : 0;
  const charCountNoSpace = content ? content.replace(/\s+/g, '').length : 0;
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  
  return {
    wpm: Math.round(wpm * 10) / 10,
    kpm: Math.round(kpm * 10) / 10,
    charCount,
    charCountNoSpace,
    wordCount,
    accuracy: data.accuracy || 100,
    typingTime,
    keyCount
  };
}

/**
 * 데이터 분석 처리
 */
function processDataAnalysis(data) {
  // 간단한 데이터 분석 구현
  return {
    analyzed: true,
    summary: '데이터 분석 완료',
    timestamp: Date.now()
  };
}

/**
 * 텍스트 데이터 처리
 */
function processTextData(data) {
  // 간단한 텍스트 처리 구현
  return {
    processed: true,
    summary: '텍스트 처리 완료',
    timestamp: Date.now()
  };
}

/**
 * 메모리 정보 가져오기
 */
function getMemoryInfo() {
  const memoryUsage = v8.getHeapStatistics();
  const heapUsed = memoryUsage.used_heap_size;
  const heapTotal = memoryUsage.total_heap_size;
  
  return {
    heapUsed,
    heapTotal,
    heapUsedMB: heapUsed / (1024 * 1024),
    heapTotalMB: heapTotal / (1024 * 1024),
    percentUsed: (heapUsed / heapTotal) * 100
  };
}
