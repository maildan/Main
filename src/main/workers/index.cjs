/**
 * Electron 메인 프로세스 워커 관리 모듈
 * 
 * 백그라운드 작업을 관리하고 프로세스 간 통신을 처리합니다.
 */

const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');
const os = require('os');

// 워커 이벤트 관리
const workerEvents = new EventEmitter();

// 활성 워커 맵
const activeWorkers = new Map();

// 워커 풀 설정
const MAX_WORKERS = Math.max(1, os.cpus().length - 1);
const workerPool = [];
let isPoolInitialized = false;

/**
 * 워커 풀 초기화
 * @param {number} size 워커 풀 크기 (기본값: CPU 코어 수 - 1)
 * @returns {boolean} 초기화 성공 여부
 */
function initializeWorkerPool(size = MAX_WORKERS) {
  if (isPoolInitialized) return true;
  
  // 네이티브 모듈 사용 시도
  try {
    const nativeModule = require('../../../native-modules.cjs');
    
    if (nativeModule && typeof nativeModule.initialize_worker_pool === 'function') {
      // 네이티브 워커 풀 사용 시도
      const success = nativeModule.initialize_worker_pool(size);
      
      if (success) {
        console.log(`네이티브 워커 풀 초기화 완료 (크기: ${size})`);
        isPoolInitialized = true;
        workerEvents.emit('pool:initialized', { size, native: true });
        return true;
      } else {
        console.warn('네이티브 워커 풀 초기화 실패, JavaScript 워커 풀로 폴백');
      }
    }
  } catch (error) {
    console.warn('네이티브 워커 모듈 로드 실패, JavaScript 워커 풀 사용:', error.message);
  }
  
  // JavaScript 워커 풀 초기화 (폴백)
  try {
    const poolSize = Math.min(Math.max(1, size), os.cpus().length);
    console.log(`워커 풀 초기화 (크기: ${poolSize})`);
    
    for (let i = 0; i < poolSize; i++) {
      const workerPath = path.join(__dirname, 'worker-thread.js');
      
      // Worker 생성 시도
      try {
        const worker = new Worker(workerPath, {
          workerData: { id: i, poolSize }
        });
        
        worker.on('message', (message) => {
          handleWorkerMessage(worker.threadId, message);
        });
        
        worker.on('error', (error) => {
          console.error(`워커 스레드 오류 (ID: ${worker.threadId}):`, error);
          workerEvents.emit('worker:error', { threadId: worker.threadId, error });
        });
        
        worker.on('exit', (code) => {
          console.log(`워커 스레드 종료 (ID: ${worker.threadId}, 코드: ${code})`);
          
          // 비정상 종료 시 워커 교체
          if (code !== 0) {
            console.log(`워커 스레드 재생성 (ID: ${worker.threadId})`);
            try {
              const newWorker = new Worker(workerPath, {
                workerData: { id: i, poolSize }
              });
              
              // 새 워커 설정 및 풀에 추가
              setupWorker(newWorker);
              
              // 풀의 기존 워커 교체
              const index = workerPool.findIndex(w => w.threadId === worker.threadId);
              if (index !== -1) {
                workerPool[index] = newWorker;
              }
            } catch (err) {
              console.error('워커 재생성 실패:', err);
            }
          }
          
          workerEvents.emit('worker:exit', { threadId: worker.threadId, code });
        });
        
        // 추가 설정 및 풀에 추가
        setupWorker(worker);
        workerPool.push(worker);
      } catch (workerError) {
        console.error(`워커 #${i} 생성 실패:`, workerError);
      }
    }
    
    isPoolInitialized = workerPool.length > 0;
    
    if (isPoolInitialized) {
      workerEvents.emit('pool:initialized', { size: workerPool.length, native: false });
      return true;
    } else {
      console.error('워커 풀 초기화 실패: 생성된 워커가 없습니다');
      return false;
    }
  } catch (error) {
    console.error('워커 풀 초기화 오류:', error);
    return false;
  }
}

/**
 * 워커 설정
 * @param {Worker} worker 워커 인스턴스
 */
function setupWorker(worker) {
  worker.isIdle = true;
  worker.taskHistory = [];
  
  // 워커 정보 저장
  activeWorkers.set(worker.threadId, worker);
}

/**
 * 워커 메시지 처리
 * @param {number} threadId 스레드 ID
 * @param {any} message 메시지 객체
 */
function handleWorkerMessage(threadId, message) {
  const worker = activeWorkers.get(threadId);
  
  if (!worker) {
    console.warn(`알 수 없는 워커 스레드로부터 메시지 수신 (ID: ${threadId})`);
    return;
  }
  
  if (message.type === 'task:completed') {
    worker.isIdle = true;
    
    // 작업 기록 업데이트
    worker.taskHistory.push({
      taskId: message.taskId,
      completedAt: Date.now(),
      success: true
    });
    
    // 이벤트 발생
    workerEvents.emit('task:completed', message.result);
  } else if (message.type === 'task:failed') {
    worker.isIdle = true;
    
    // 작업 기록 업데이트
    worker.taskHistory.push({
      taskId: message.taskId,
      completedAt: Date.now(),
      success: false,
      error: message.error
    });
    
    // 이벤트 발생
    workerEvents.emit('task:failed', {
      taskId: message.taskId,
      error: message.error
    });
  } else if (message.type === 'worker:ready') {
    worker.isIdle = true;
    workerEvents.emit('worker:ready', { threadId });
  }
}

/**
 * 사용 가능한 워커 가져오기
 * @returns {Worker|null} 사용 가능한 워커 인스턴스 또는 null
 */
function getAvailableWorker() {
  // 워커 풀이 초기화되지 않은 경우
  if (!isPoolInitialized) {
    initializeWorkerPool();
  }
  
  // 사용 가능한 워커 찾기
  for (const worker of workerPool) {
    if (worker.isIdle) {
      return worker;
    }
  }
  
  return null;
}

/**
 * 워커에 작업 제출
 * @param {string} taskType 작업 타입
 * @param {any} data 작업 데이터
 * @returns {Promise<any>} 작업 결과 Promise
 */
function submitTask(taskType, data) {
  // 네이티브 모듈 사용 시도
  try {
    const nativeModule = require('../../../native-modules.cjs');
    
    if (nativeModule && typeof nativeModule.submit_task === 'function') {
      return new Promise((resolve, reject) => {
        try {
          // 데이터 JSON 변환
          const dataString = typeof data === 'string' ? data : JSON.stringify(data);
          
          // 네이티브 모듈에 작업 제출
          const resultJson = nativeModule.submit_task(taskType, dataString);
          const result = JSON.parse(resultJson);
          
          if (result.success) {
            resolve(result.result ? JSON.parse(result.result) : result);
          } else {
            reject(new Error(result.error || '작업 실패'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }
  } catch (error) {
    console.warn('네이티브 작업 제출 모듈 로드 실패, JavaScript 워커 사용:', error.message);
  }
  
  // JavaScript 워커에 작업 제출 (폴백)
  return new Promise((resolve, reject) => {
    const worker = getAvailableWorker();
    
    if (!worker) {
      return reject(new Error('사용 가능한 워커가 없습니다.'));
    }
    
    // 작업 ID 생성
    const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // 워커 상태 업데이트
    worker.isIdle = false;
    
    // 응답 핸들러 설정
    const taskTimeoutMs = 30000; // 30초 타임아웃
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`작업 타임아웃: ${taskId}`));
    }, taskTimeoutMs);
    
    const onTaskCompleted = (result) => {
      if (result.taskId === taskId) {
        cleanup();
        resolve(result.data);
      }
    };
    
    const onTaskFailed = (error) => {
      if (error.taskId === taskId) {
        cleanup();
        reject(new Error(error.error || '작업 실패'));
      }
    };
    
    // 이벤트 리스너 및 타임아웃 정리 함수
    function cleanup() {
      clearTimeout(timeoutId);
      workerEvents.off('task:completed', onTaskCompleted);
      workerEvents.off('task:failed', onTaskFailed);
    }
    
    // 이벤트 리스너 등록
    workerEvents.once('task:completed', onTaskCompleted);
    workerEvents.once('task:failed', onTaskFailed);
    
    // 워커에 작업 전송
    worker.postMessage({
      type: 'task:execute',
      taskId,
      taskType,
      data
    });
  });
}

/**
 * 워커 풀 종료
 * @returns {boolean} 종료 성공 여부
 */
function shutdownWorkerPool() {
  if (!isPoolInitialized) return true;
  
  console.log('워커 풀 종료 중...');
  
  try {
    // 모든 워커 종료
    for (const worker of workerPool) {
      worker.terminate();
    }
    
    // 풀 리셋
    workerPool.length = 0;
    activeWorkers.clear();
    isPoolInitialized = false;
    
    console.log('워커 풀 종료 완료');
    return true;
  } catch (error) {
    console.error('워커 풀 종료 오류:', error);
    return false;
  }
}

/**
 * 워커 풀 통계 가져오기
 * @returns {Object} 워커 풀 통계
 */
function getWorkerPoolStats() {
  if (!isPoolInitialized) {
    return {
      thread_count: 0,
      active_tasks: 0,
      completed_tasks: 0,
      active_workers: 0,
      idle_workers: 0,
      pending_tasks: 0,
      failed_tasks: 0,
      total_tasks: 0,
      uptime_ms: 0,
      timestamp: Date.now()
    };
  }
  
  const idleWorkers = workerPool.filter(w => w.isIdle);
  const totalCompleted = workerPool.reduce((sum, w) => 
    sum + w.taskHistory.filter(t => t.success).length, 0);
  const totalFailed = workerPool.reduce((sum, w) => 
    sum + w.taskHistory.filter(t => !t.success).length, 0);
  
  return {
    thread_count: workerPool.length,
    active_tasks: workerPool.length - idleWorkers.length,
    completed_tasks: totalCompleted,
    active_workers: workerPool.length - idleWorkers.length,
    idle_workers: idleWorkers.length,
    pending_tasks: 0, // 현재 큐에 대기 중인 작업 - 구현 필요
    failed_tasks: totalFailed,
    total_tasks: totalCompleted + totalFailed,
    uptime_ms: isPoolInitialized ? Date.now() - workerPool[0]?.startTime || 0 : 0,
    timestamp: Date.now()
  };
}

// 모듈 내보내기
module.exports = {
  initializeWorkerPool,
  shutdownWorkerPool,
  submitTask,
  getWorkerPoolStats,
  workerEvents
};
