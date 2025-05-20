/**
 * 데이터 동기화 모듈
 * 기능:
 * - MongoDB와 Supabase 간의 데이터 동기화
 * - 타이핑 통계 실시간 전송 (3초마다)
 * - 주기적 데이터 백업 (1주일마다)
 * - 장애 복구 메커니즘
 */

const { debugLog } = require('./utils');
// MongoDB와 Supabase 클라이언트 가져오기 (CommonJS 모듈이므로 require 사용)
const mongoClient = require('../lib/mongodb');
const supabaseClient = require('../lib/supabase');

// 로컬 대기열 (네트워크 장애 시 데이터 보관)
let dataQueue = [];
let isProcessingQueue = false;
let lastSyncTime = null;

// 동기화 상태
const syncStatus = {
  lastMongoSync: null,
  lastSupabaseSync: null,
  pendingItemsCount: 0,
  failedItems: [],
  syncErrors: [],
  isFullSyncRunning: false
};

/**
 * 모듈 초기화
 */
async function initialize() {
  try {
    debugLog('데이터 동기화 모듈 초기화 중...');
    
    // MongoDB 연결 초기화
    await mongoClient.connectToMongoDB();
    
    // MongoDB 상태 모니터링 설정
    mongoClient.setupHealthCheck(30000); // 30초마다 연결 확인
    
    // Supabase 연결 테스트
    const supabaseConnected = await supabaseClient.testConnection();
    if (!supabaseConnected) {
      debugLog('Supabase 연결 실패, 재시도 예정');
    }
    
    // 실시간 데이터 전송 시작 (3초마다)
    startRealTimeSync();
    
    // 주기적 전체 동기화 (1주일마다)
    scheduleFullSync();
    
    debugLog('데이터 동기화 모듈 초기화 완료');
    return true;
  } catch (error) {
    console.error('데이터 동기화 모듈 초기화 오류:', error);
    return false;
  }
}

/**
 * 실시간 데이터 전송 시작
 */
function startRealTimeSync() {
  debugLog('실시간 데이터 전송 시작 (3초 간격)');
  
  // 3초마다 대기열 처리
  setInterval(processQueue, 3000);
  
  // MongoDB Change Stream 모니터링 시작
  mongoClient.startChangeStream(async (change) => {
    if (change.operationType === 'insert' || change.operationType === 'update') {
      // 새 문서를 대기열에 추가
      const document = change.fullDocument;
      addToQueue(document);
    }
  }).catch(error => {
    console.error('MongoDB Change Stream 모니터링 오류:', error);
  });
}

/**
 * 타이핑 로그 데이터를 대기열에 추가
 * @param {Object} data - 저장할 로그 데이터
 */
function addToQueue(data) {
  // 대기열에 이미 동일한 idempotencyKey를 가진 항목이 있는지 확인
  const existingIndex = dataQueue.findIndex(item => 
    item.idempotencyKey && item.idempotencyKey === data.idempotencyKey
  );
  
  if (existingIndex >= 0) {
    // 기존 항목 업데이트
    dataQueue[existingIndex] = { ...data, queuedAt: new Date() };
    debugLog(`기존 대기열 항목 업데이트: ${data.idempotencyKey || data._id}`);
  } else {
    // 새 항목 추가
    dataQueue.push({ ...data, queuedAt: new Date() });
    syncStatus.pendingItemsCount = dataQueue.length;
    debugLog(`대기열에 항목 추가됨, 현재 크기: ${dataQueue.length}`);
  }
}

/**
 * 대기열 처리
 */
async function processQueue() {
  if (isProcessingQueue || dataQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  debugLog(`대기열 처리 시작, ${dataQueue.length}개 항목`);
  
  try {
    // 현재 대기열의 일부만 처리 (배치 크기 제한)
    const BATCH_SIZE = 50;
    const batch = dataQueue.slice(0, BATCH_SIZE);
    
    // MongoDB에 저장 (로컬 로그도 MongoDB에 저장)
    if (batch.length > 0) {
      try {
        // 배치 저장
        const mongoResult = await mongoClient.saveBatchTypingLogs(batch);
        debugLog(`MongoDB 배치 저장 완료: ${mongoResult.insertedCount}개 항목`);
        
        syncStatus.lastMongoSync = new Date();
        
        // Supabase에도 저장 (장기 보존용)
        try {
          const supabaseResult = await supabaseClient.saveBatchTypingLogs(batch);
          
          if (supabaseResult.success) {
            debugLog(`Supabase 배치 저장 완료: ${supabaseResult.insertedCount}개 항목`);
            syncStatus.lastSupabaseSync = new Date();
            
            // 성공적으로 처리된 항목 대기열에서 제거
            dataQueue = dataQueue.slice(BATCH_SIZE);
            syncStatus.pendingItemsCount = dataQueue.length;
          } else {
            throw new Error(supabaseResult.error);
          }
        } catch (supabaseError) {
          console.error('Supabase 저장 오류:', supabaseError);
          // MongoDB에는 저장되었으므로 다음 주기적 동기화에서 처리됨
          
          // 오류 정보 기록
          syncStatus.syncErrors.push({
            timestamp: new Date(),
            service: 'supabase',
            error: String(supabaseError),
            itemsCount: batch.length
          });
        }
      } catch (mongoError) {
        console.error('MongoDB 저장 오류:', mongoError);
        
        // 오류 정보 기록
        syncStatus.syncErrors.push({
          timestamp: new Date(),
          service: 'mongodb',
          error: String(mongoError),
          itemsCount: batch.length
        });
        
        // 실패한 항목 추적 (나중에 재시도)
        syncStatus.failedItems.push(...batch.map(item => ({
          data: item,
          error: String(mongoError),
          timestamp: new Date()
        })));
        
        // 재시도 로직을 위해 대기열에서 제거하지 않음
        // 다음 동기화 주기에서 재시도
      }
    }
  } catch (error) {
    console.error('대기열 처리 중 오류:', error);
  } finally {
    isProcessingQueue = false;
    lastSyncTime = new Date();
  }
}

/**
 * 주기적 전체 동기화 (1주일마다)
 */
function scheduleFullSync() {
  debugLog('주기적 전체 동기화 예약 (1주일 간격)');
  
  // Supabase 모듈의 ETL 스케줄러 사용
  const etlScheduler = supabaseClient.scheduleETL(fetchAllMongoData, 168); // 168시간 = 1주일
  
  // 초기 동기화 수행 (5분 후)
  setTimeout(() => {
    debugLog('초기 전체 동기화 시작');
    etlScheduler.runNow().catch(error => {
      console.error('초기 전체 동기화 오류:', error);
    });
  }, 5 * 60 * 1000); // 5분 후 시작
}

/**
 * MongoDB에서 모든 데이터 가져오기 (ETL 용)
 * @returns {Promise<Array>} MongoDB 데이터
 */
async function fetchAllMongoData() {
  syncStatus.isFullSyncRunning = true;
  debugLog('MongoDB에서 전체 데이터 가져오기 시작');
  
  try {
    // 마지막 동기화 이후의 데이터만 가져오기
    const query = {};
    
    // 마지막 성공적인 ETL 이후 데이터만 가져오기
    if (syncStatus.lastSupabaseSync) {
      query.timestamp = { $gt: syncStatus.lastSupabaseSync };
    }
    
    const options = {
      limit: 10000, // 최대 10000개 문서
      sort: { timestamp: 1 } // 오래된 순서로 정렬
    };
    
    const data = await mongoClient.getTypingStats(query, options);
    debugLog(`MongoDB에서 ${data.length}개 문서 가져옴`);
    
    return data;
  } catch (error) {
    console.error('MongoDB 데이터 가져오기 오류:', error);
    throw error;
  } finally {
    syncStatus.isFullSyncRunning = false;
  }
}

/**
 * 실패한 항목 재시도
 */
async function retryFailedItems() {
  if (syncStatus.failedItems.length === 0) {
    return;
  }
  
  debugLog(`실패한 항목 재시도 시작: ${syncStatus.failedItems.length}개`);
  
  try {
    // 실패한 항목 복구
    const itemsToRetry = [...syncStatus.failedItems];
    syncStatus.failedItems = [];
    
    // 대기열에 다시 추가
    itemsToRetry.forEach(item => {
      addToQueue(item.data);
    });
    
    debugLog(`실패한 항목 ${itemsToRetry.length}개를 대기열에 다시 추가함`);
  } catch (error) {
    console.error('실패한 항목 재시도 오류:', error);
  }
}

/**
 * 통계 저장 및 동기화
 * @param {Object} stats - 저장할 통계 데이터
 * @returns {Promise<Object>} 저장 결과
 */
async function saveAndSyncStats(stats) {
  try {
    // 고유 ID 생성
    if (!stats.idempotencyKey) {
      stats.idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // 대기열에 추가 (처리 주기에 따라 MongoDB와 Supabase에 동기화됨)
    addToQueue(stats);
    
    return {
      success: true,
      id: stats.idempotencyKey,
      message: '통계가 대기열에 추가되었습니다'
    };
  } catch (error) {
    console.error('통계 저장 및 동기화 오류:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * 동기화 상태 가져오기
 * @returns {Object} 현재 동기화 상태
 */
function getSyncStatus() {
  return {
    ...syncStatus,
    queueSize: dataQueue.length,
    lastSyncTime,
    isProcessingQueue
  };
}

/**
 * 실패한 작업 즉시 재시도
 */
function forceRetryFailedItems() {
  return retryFailedItems();
}

/**
 * 모듈 내보내기
 */
module.exports = {
  initialize,
  saveAndSyncStats,
  getSyncStatus,
  forceRetryFailedItems,
  addToQueue
}; 