/**
 * 워커 스레드 관리자
 * 애플리케이션 내 웹 워커 관리
 */
const { Worker } = require('worker_threads');
const path = require('path');
const { debugLog } = require('../utils');

// 워커 풀 관리
const workerPool = [];
const maxWorkers = Math.max(1, require('os').cpus().length - 1);
let isInitialized = false;

/**
 * 워커 초기화
 */
function initWorkers() {
  if (isInitialized) return;

  debugLog(`워커 풀 초기화 (최대 ${maxWorkers}개)`);

  // 워커 생성
  for (let i = 0; i < maxWorkers; i++) {
    createWorker();
  }

  isInitialized = true;
}

/**
 * 워커 생성
 * @returns {Worker} 생성된 워커
 */
function createWorker() {
  const workerPath = path.join(__dirname, 'worker-thread.js');

  // Worker 생성
  const worker = new Worker(workerPath);

  worker.on('message', (message) => {
    // 메시지 타입에 따른 로깅 및 처리
    if (message.type === 'task:completed') {
      // 작업 완료 처리
      const { taskId, result } = message;
      debugLog(`워커로부터 작업 완료 수신: ${taskId}`);

      // 작업 완료 콜백 실행
      executeTaskCallback(taskId, result);
    }
    else if (message.type === 'task:failed') {
      // 작업 실패 처리
      const { taskId, error } = message;
      debugLog(`워커로부터 작업 실패 수신: ${taskId}, 오류: ${error}`);

      // 실패 콜백 실행
      executeTaskErrorCallback(taskId, error);
    }
    else if (message.type === 'worker-ready') {
      // 워커 준비 상태 처리
      const { threadId, memoryInfo, processingMode } = message;
      const memoryUsedMB = memoryInfo?.heapUsedMB?.toFixed(2) || 'N/A';

      debugLog(`워커 준비됨 (ID: ${threadId || '?'}, 메모리: ${memoryUsedMB}MB, 모드: ${processingMode || 'normal'})`);

      // 워커를 사용 가능한 상태로 설정
      worker.isReady = true;
      worker.isBusy = false;
      worker.lastUsed = Date.now();
      worker.memoryInfo = memoryInfo;
      worker.processingMode = processingMode;
    }
    else {
      // 알 수 없는 메시지 유형을 더 명확하게 로깅
      debugLog(`워커로부터 알 수 없는 메시지 유형 수신: ${message.type || 'undefined'}`);
    }
  });

  // 에러 이벤트 처리
  worker.on('error', (error) => {
    debugLog(`워커 오류: ${error.message}`);

    // 오류가 발생한 워커를 풀에서 제거
    const workerIndex = workerPool.findIndex(w => w === worker);
    if (workerIndex !== -1) {
      workerPool.splice(workerIndex, 1);
    }

    // 새 워커 생성
    createWorker();
  });

  // 워커 종료 이벤트 처리
  worker.on('exit', (code) => {
    debugLog(`워커 종료 (종료 코드: ${code})`);

    // 비정상 종료인 경우 새 워커 생성
    if (code !== 0) {
      const workerIndex = workerPool.findIndex(w => w === worker);
      if (workerIndex !== -1) {
        workerPool.splice(workerIndex, 1);
      }

      createWorker();
    }
  });

  // 워커 상태 초기화
  worker.isReady = false;
  worker.isBusy = false;
  worker.lastUsed = Date.now();

  // 풀에 워커 추가
  workerPool.push(worker);

  return worker;
}

/**
 * 작업 완료 콜백 실행
 * @param {string} taskId 작업 ID
 * @param {any} result 작업 결과
 */
function executeTaskCallback(taskId, result) {
  // 콜백 호출 구현
  debugLog(`작업 완료 콜백 실행: ${taskId}`);
}

/**
 * 작업 오류 콜백 실행
 * @param {string} taskId 작업 ID
 * @param {string|Error} error 오류 정보
 */
function executeTaskErrorCallback(taskId, error) {
  // 오류 콜백 호출 구현
  debugLog(`작업 오류 콜백 실행: ${taskId}, 오류: ${error}`);
}

/**
 * 사용 가능한 워커 가져오기
 * @returns {Worker|null} 사용 가능한 워커 또는 null
 */
function getAvailableWorker() {
  // 사용 가능한 워커 찾기
  const availableWorker = workerPool.find(worker => worker.isReady && !worker.isBusy);

  if (availableWorker) {
    availableWorker.isBusy = true;
    availableWorker.lastUsed = Date.now();
    return availableWorker;
  }

  // 사용 가능한 워커가 없으면 null 반환
  return null;
}

// 모듈 내보내기
module.exports = {
  initWorkers,
  getAvailableWorker,
  createWorker,
  getAllWorkers: () => [...workerPool],
  getWorkerCount: () => workerPool.length,
  getReadyWorkerCount: () => workerPool.filter(w => w.isReady).length,
  getBusyWorkerCount: () => workerPool.filter(w => w.isBusy).length
};
