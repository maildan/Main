const { parentPort, workerData, threadId } = require('worker_threads');
const os = require('os');
const v8 = require('v8');

console.log(`워커 스레드 시작 (ID: ${threadId})`);

// 작업 실행 상태
let isProcessing = false;

// Worker 시작 시 메모리 정보
const memoryInfo = process.memoryUsage();
const heapUsedMB = memoryInfo.heapUsed / (1024 * 1024);
const percentUsed = (memoryInfo.heapUsed / memoryInfo.heapTotal) * 100;

// 워커 상태 정보
const initialMemoryInfo = {
  heapUsed: memoryInfo.heapUsed,
  heapTotal: memoryInfo.heapTotal,
  heapLimit: memoryInfo.heapTotal * 2, // 추정값
  heapUsedMB: heapUsedMB,
  percentUsed: percentUsed,
  rss: memoryInfo.rss,
  rssMB: memoryInfo.rss / (1024 * 1024),
  timestamp: Date.now()
};

// CPU 사용량에 따라 처리 모드 결정
let processingMode = 'normal';
const cpuUsage = os.loadavg()[0];

if (cpuUsage > 2.0) {
  processingMode = 'low-priority';
} else if (os.cpus().length <= 2) {
  processingMode = 'cpu-intensive';
} else {
  processingMode = 'normal';
}

// 부모 프로세스에 메시지 수신 리스너 설정
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      // 메시지 로깅 및 처리 로직
      console.log(`워커 메시지 수신: ${message.type || 'unknown'}`);

      if (message.type === 'task:execute') {
        const { taskId, taskType, payload } = message;

        try {
          // 작업 처리 로직
          let result;

          switch (taskType) {
            case 'memory-optimization':
              result = await performMemoryOptimization(payload);
              break;
            case 'data-processing':
              result = await processData(payload);
              break;
            default:
              throw new Error(`지원하지 않는 작업 유형: ${taskType}`);
          }

          // 결과 반환
          parentPort.postMessage({
            type: 'task:completed',
            taskId,
            result
          });
        } catch (error) {
          // 오류 반환
          parentPort.postMessage({
            type: 'task:failed',
            taskId,
            error: error.message || String(error)
          });
        }
      } else if (message.type === 'status:request') {
        // 상태 정보 반환
        const currentMemoryInfo = process.memoryUsage();

        parentPort.postMessage({
          type: 'status:response',
          threadId: process.threadId,
          memoryInfo: {
            heapUsed: currentMemoryInfo.heapUsed,
            heapTotal: currentMemoryInfo.heapTotal,
            heapUsedMB: currentMemoryInfo.heapUsed / (1024 * 1024),
            percentUsed: (currentMemoryInfo.heapUsed / currentMemoryInfo.heapTotal) * 100,
            rss: currentMemoryInfo.rss,
            rssMB: currentMemoryInfo.rss / (1024 * 1024),
            timestamp: Date.now()
          },
          processingMode
        });
      }
    } catch (error) {
      console.error('워커 메시지 처리 중 오류:', error);
    }
  });

  // 메모리 정보 가져오기
  const memoryInfo = process.memoryUsage();
  const heapUsedMB = memoryInfo.heapUsed / (1024 * 1024);
  const percentUsed = (memoryInfo.heapUsed / memoryInfo.heapTotal) * 100;

  // 워커 준비 알림 형식 수정
  parentPort.postMessage({
    type: 'worker-ready',
    threadId,
    memoryInfo: {
      heapUsed: memoryInfo.heapUsed,
      heapTotal: memoryInfo.heapTotal,
      heapLimit: memoryInfo.heapTotal * 2, // 대략적인 추정값
      heapUsedMB: heapUsedMB,
      percentUsed: percentUsed,
      rss: memoryInfo.rss,
      rssMB: memoryInfo.rss / (1024 * 1024),
      timestamp: Date.now()
    },
    processingMode: 'normal'
  });

  // 주기적 메모리 사용량 보고 설정
  setInterval(() => {
    const currentMemory = process.memoryUsage();
    console.log(`워커 ${threadId} 메모리 사용량: ${Math.round(currentMemory.heapUsed / (1024 * 1024))}MB`);
  }, 60000);
} else {
  console.error('부모 포트가 없습니다. 워커가 올바르게 시작되지 않았습니다.');
}

// 메모리 최적화 작업 처리 함수
async function performMemoryOptimization(payload) {
  // 최적화 레벨 확인
  const level = payload.level || 'medium';
  const aggressive = payload.aggressive || false;

  // 여기에 실제 메모리 최적화 로직 구현
  if (global.gc) {
    global.gc();
  }

  return {
    success: true,
    freedMemory: 1024 * 1024 * 5, // 예시: 5MB
    timestamp: Date.now()
  };
}

// 데이터 처리 작업 함수
async function processData(payload) {
  // 여기에 실제 데이터 처리 로직 구현

  // 처리할 데이터가 없으면 오류 반환
  if (!payload || !payload.data) {
    throw new Error('처리할 데이터가 없습니다.');
  }

  // 예시: 텍스트 데이터 처리
  if (payload.dataType === 'text') {
    const text = payload.data;
    const words = text.split(/\s+/).length;
    const chars = text.length;

    return {
      words,
      chars,
      processed: true
    };
  }

  // 지원하지 않는 데이터 유형
  throw new Error(`지원하지 않는 데이터 유형: ${payload.dataType}`);
}
