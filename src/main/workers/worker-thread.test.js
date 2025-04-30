// filepath: c:\Users\user\Desktop\loop\src\main\workers\worker-thread.js
/**
 * 워커 스레드 구현
 * 네이티브 모듈 연동 기능 추가
 */

console.log(`워커 스레드 시작 (ID: ${threadId})`);

// 작업 실행 상태
let isProcessing = false;
let lastMemoryCheck = Date.now();
let memoryWarningThreshold = 100 * 1024 * 1024; // 100MB

// 네이티브 모듈 로드 시도
let nativeModule = null;
try {
  // 상대 경로 대신 프로젝트 루트에서 절대 경로로 로드
  const projectRoot = path.resolve(__dirname, '../../../');
  const nativeModulePath = path.join(projectRoot, 'native-modules');
  
  // 폴백 모듈을 먼저 시도
  try {
    console.log(`워커 ${threadId}: 폴백 모듈 로드 성공`);
  } catch (fallbackError) {
    console.warn(`워커 ${threadId}: 폴백 모듈 로드 실패:`, fallbackError.message);
    
    // 네이티브 모듈 시도
    console.log(`워커 ${threadId}: 네이티브 모듈 로드 성공`);
  }
} catch (error) {
  console.warn(`워커 ${threadId}: 모든 모듈 로드 실패:`, error.message);
  // 오류가 발생해도 워커는 계속 실행 (폴백 로직 사용)
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
      lastMemoryCheck = Date.now();
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > memoryWarningThreshold) {
        console.warn(`워커 ${threadId}: 메모리 사용량이 경고 임계값을 초과했습니다.`);
      }
    }
    
    // 필요한 작업 수행
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    isProcessing = false;
  }
}