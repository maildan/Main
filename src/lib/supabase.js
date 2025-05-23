/**
 * Supabase 연결 및 데이터 관리 모듈
 * 기능:
 * - 특정 주기(1주일)마다 MongoDB에서 Supabase로 데이터 전송
 * - 데이터 분석 및 장기 보존을 위한 스키마 최적화
 * - 장애 복구 메커니즘 (재시도, 중복 방지 등)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase 연결 정보
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// 환경 변수 확인
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다. 서비스는 제한된 기능으로 작동합니다.');
  console.error('필요한 환경 변수: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY');
  console.error('.env 파일이나 환경 변수를 확인해주세요.');
}

// Supabase 클라이언트 인스턴스
let supabase = null;
let serviceClient = null;

/**
 * Supabase 클라이언트 초기화
 * @returns {Object|null} Supabase 클라이언트 또는 null(연결 정보 누락 시)
 */
export function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase 연결 초기화 실패: 환경 변수가 누락되었습니다.');
    return null;
  }
  
  if (!supabase) {
    try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: true
      },
      global: {
        headers: {
          'x-application-name': 'Loop-Typing-Stats'
        },
      },
      db: {
        schema: 'public'
      }
    });
    
    console.log('Supabase 클라이언트 초기화 완료');
    } catch (error) {
      console.error('Supabase 클라이언트 초기화 오류:', error);
      return null;
    }
  }
  
  return supabase;
}

/**
 * 서비스 롤 클라이언트 초기화 (관리자 권한)
 * @returns {Object|null} Supabase 서비스 클라이언트 또는 null(연결 정보 누락 시)
 */
export function initServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase 서비스 클라이언트 초기화 실패: URL 또는 서비스 키가 누락되었습니다.');
    return null;
  }
  
  if (!serviceClient) {
    try {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    console.log('Supabase 서비스 클라이언트 초기화 완료');
    } catch (error) {
      console.error('Supabase 서비스 클라이언트 초기화 오류:', error);
      return null;
    }
  }
  
  return serviceClient;
}

/**
 * 타이핑 로그 저장
 * @param {Object} logData - 저장할 로그 데이터
 * @returns {Promise<Object>} 저장 결과
 */
export async function saveTypingLog(logData) {
  const client = initSupabase();
  
  try {
    // 타임스탬프 처리
    const data = {
      ...logData,
      timestamp: new Date(logData.timestamp || Date.now()).toISOString(),
      created_at: new Date().toISOString()
    };
    
    // 멱등성을 위한 ID 처리
    if (logData.idempotencyKey) {
      data.idempotency_key = logData.idempotencyKey;
    }
    
    // Supabase에 데이터 삽입
    const { data: result, error } = await client
      .from('typing_logs')
      .upsert(data, { 
        onConflict: 'idempotency_key',
        ignoreDuplicates: true
      });
    
    if (error) throw error;
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Supabase 로그 저장 오류:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 배치 작업으로 여러 로그 저장
 * @param {Array<Object>} logsData - 저장할 로그 데이터 배열
 * @returns {Promise<Object>} 저장 결과
 */
export async function saveBatchTypingLogs(logsData) {
  const client = initSupabase();
  
  if (!Array.isArray(logsData) || logsData.length === 0) {
    return { success: false, error: '유효한 로그 데이터가 필요합니다' };
  }
  
  try {
    // 데이터 형식 변환
    const formattedData = logsData.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp || Date.now()).toISOString(),
      created_at: new Date().toISOString(),
      idempotency_key: log.idempotencyKey || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    }));
    
    // PgBouncer 연결 풀을 통한 삽입
    const { data, error } = await client
      .from('typing_logs')
      .upsert(formattedData, { 
        onConflict: 'idempotency_key',
        ignoreDuplicates: true,
        returning: 'minimal' // 성능 최적화
      })
      .select('count');
    
    if (error) throw error;
    
    return {
      success: true,
      insertedCount: formattedData.length
    };
  } catch (error) {
    console.error('Supabase 배치 로그 저장 오류:', error);
    
    // 실패 시 재시도 로직 추가 (필요시)
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * MongoDB에서 Supabase로 ETL 처리
 * @param {Array<Object>} mongoData - MongoDB에서 가져온 데이터
 * @returns {Promise<Object>} ETL 결과
 */
export async function transferFromMongoDB(mongoData) {
  const client = initSupabase();
  
  if (!Array.isArray(mongoData) || mongoData.length === 0) {
    return { success: false, error: '전송할 데이터가 없습니다' };
  }
  
  try {
    // MongoDB 형식에서 Supabase 형식으로 변환
    const supabaseData = mongoData.map(doc => ({
      content: doc.content,
      key_count: doc.keyCount,
      typing_time: doc.typingTime,
      window_title: doc.windowTitle,
      browser_name: doc.browserName,
      total_chars: doc.totalChars || 0,
      total_words: doc.totalWords || 0,
      accuracy: doc.accuracy || 100,
      timestamp: new Date(doc.timestamp).toISOString(),
      created_at: new Date().toISOString(),
      idempotency_key: doc._id || doc.idempotencyKey || `mongo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    }));
    
    // 배치 단위로 나누어 처리 (PgBouncer 한계 고려)
    const BATCH_SIZE = 100;
    const results = [];
    
    for (let i = 0; i < supabaseData.length; i += BATCH_SIZE) {
      const batch = supabaseData.slice(i, i + BATCH_SIZE);
      
      // Supabase에 삽입
      const { data, error } = await client
        .from('typing_logs')
        .upsert(batch, { 
          onConflict: 'idempotency_key',
          ignoreDuplicates: true,
          returning: 'minimal'
        });
      
      if (error) {
        console.error(`배치 ${i/BATCH_SIZE + 1} 처리 중 오류:`, error);
        results.push({ 
          batchIndex: i/BATCH_SIZE,
          success: false, 
          error: error.message 
        });
      } else {
        results.push({ 
          batchIndex: i/BATCH_SIZE,
          success: true, 
          count: batch.length 
        });
      }
      
      // 배치 간 지연 (필요 시)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const successfulBatches = results.filter(r => r.success);
    const failedBatches = results.filter(r => !r.success);
    
    return {
      success: failedBatches.length === 0,
      totalProcessed: supabaseData.length,
      successCount: successfulBatches.reduce((acc, b) => acc + b.count, 0),
      failedCount: failedBatches.length * BATCH_SIZE,
      batchResults: results
    };
  } catch (error) {
    console.error('MongoDB에서 Supabase로 데이터 전송 오류:', error);
    return {
      success: false, 
      error: error.message
    };
  }
}

/**
 * DLQ(Dead Letter Queue)에 실패한 작업 저장
 * @param {Object} data - 실패한 데이터
 * @param {string} reason - 실패 이유
 * @returns {Promise<Object>} 저장 결과
 */
export async function saveToDLQ(data, reason) {
  const client = initServiceClient() || initSupabase();
  
  try {
    const dlqEntry = {
      payload: JSON.stringify(data),
      error_reason: reason,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    };
    
    const { data: result, error } = await client
      .from('etl_error_queue')
      .insert(dlqEntry);
    
    if (error) throw error;
    
    return { success: true, id: result?.id };
  } catch (error) {
    console.error('DLQ 저장 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supabase에서 타이핑 통계 조회
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Array<Object>>} 조회 결과
 */
export async function getTypingStats(options = {}) {
  const client = initSupabase();
  
  try {
    let query = client
      .from('typing_logs')
      .select('*');
    
    // 필터 적용
    if (options.startDate && options.endDate) {
      query = query.gte('timestamp', options.startDate)
                  .lte('timestamp', options.endDate);
    }
    
    // 정렬 적용
    if (options.orderBy) {
      query = query.order(options.orderBy, { 
        ascending: options.ascending ?? false 
      });
    } else {
      query = query.order('timestamp', { ascending: false });
    }
    
    // 페이지네이션
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      success: true,
      data,
      count
    };
  } catch (error) {
    console.error('Supabase 통계 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 주기적인 ETL 작업 예약 (Edge Function 대신 클라이언트에서 사용 시)
 * @param {Function} fetchMongoDataFn - MongoDB에서 데이터를 가져오는 함수
 * @param {number} intervalHours - 실행 간격 (시간)
 */
export function scheduleETL(fetchMongoDataFn, intervalHours = 168) { // 기본 1주일
  // 마지막 ETL 실행 시간 기록
  let lastETLRun = null;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  // 실행 상태 추적
  let isRunning = false;
  
  // ETL 프로세스
  async function runETL() {
    if (isRunning) {
      console.log('ETL이 이미 실행 중입니다');
      return;
    }
    
    isRunning = true;
    console.log('MongoDB → Supabase ETL 시작');
    
    try {
      // MongoDB에서 데이터 가져오기
      const mongoData = await fetchMongoDataFn();
      
      if (!mongoData || mongoData.length === 0) {
        console.log('전송할 새 데이터가 없습니다');
        lastETLRun = new Date();
        isRunning = false;
        return;
      }
      
      console.log(`MongoDB에서 ${mongoData.length}개 문서 가져옴`);
      
      // Supabase로 전송
      const result = await transferFromMongoDB(mongoData);
      
      if (result.success) {
        console.log(`ETL 완료: ${result.successCount}/${result.totalProcessed} 문서 전송됨`);
      } else {
        console.error('ETL 실패:', result.error);
        
        // 배치 결과 분석
        if (result.batchResults) {
          const failedBatches = result.batchResults.filter(b => !b.success);
          console.error(`${failedBatches.length} 배치 실패`);
        }
      }
    } catch (error) {
      console.error('ETL 프로세스 오류:', error);
    } finally {
      lastETLRun = new Date();
      isRunning = false;
    }
  }
  
  // 주기적 체크 (15분마다)
  setInterval(() => {
    const now = new Date();
    
    // 마지막 실행 후 지정된 간격이 지났는지 확인
    if (!lastETLRun || (now.getTime() - lastETLRun.getTime() >= intervalMs)) {
      console.log('ETL 간격 도달, 실행 시작');
      runETL().catch(console.error);
    }
  }, 15 * 60 * 1000); // 15분마다 확인
  
  // 초기 실행
  setTimeout(() => {
    console.log('초기 ETL 실행');
    runETL().catch(console.error);
  }, 5000); // 5초 후 시작
  
  return {
    runNow: runETL,
    getLastRunTime: () => lastETLRun,
    isRunning: () => isRunning
  };
}

/**
 * 연결 테스트
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export async function testConnection() {
  const client = initSupabase();
  
  try {
    // 간단한 쿼리로 연결 확인
    const { data, error } = await client
      .from('typing_logs')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
    
    console.log('Supabase 연결 성공');
    return true;
  } catch (error) {
    console.error('Supabase 연결 테스트 실패:', error);
    return false;
  }
}

export default {
  initSupabase,
  initServiceClient,
  saveTypingLog,
  saveBatchTypingLogs,
  transferFromMongoDB,
  saveToDLQ,
  getTypingStats,
  scheduleETL,
  testConnection
}; 