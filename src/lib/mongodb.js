/**
 * MongoDB Atlas 연결 및 데이터 관리 모듈
 * 기능:
 * - MongoDB Atlas에 연결
 * - 3초마다 데이터 전송
 * - Change Stream을 이용한 데이터 변경 모니터링
 * - 장애 복구 메커니즘 (재시도, 토큰 저장 등)
 */

import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB 연결 정보
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/';
const DB_NAME = process.env.MONGO_DB_NAME || 'loop_typing_data';


// 몽고디비 접속 옵션 설정 (최신 서버 API 사용)
const mongoOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10, // 최대 연결 풀 크기
  connectTimeoutMS: 5000, // 연결 타임아웃
  writeConcern: { w: 'majority', j: true }, // 다수 노드에 기록 보장
};

// MongoDB 클라이언트 인스턴스
let client = null;
let db = null;
let isConnected = false;

// Change Stream을 위한 Resume Token 저장
let resumeToken = null;

/**
 * MongoDB 연결 함수
 * @returns {Promise<MongoClient>} MongoDB 클라이언트
 */
export async function connectToMongoDB() {
  if (client && isConnected) {
    return client;
  }

  try {
    console.log('MongoDB 연결 시도 중...');
    client = new MongoClient(MONGODB_URI, mongoOptions);
    await client.connect();
    
    // Ping 명령으로 연결 확인
    await client.db('admin').command({ ping: 1 });
    console.log('MongoDB 연결 성공!');
    
    db = client.db(DB_NAME);
    isConnected = true;
    
    // 필요한 인덱스 생성
    await setupIndexes();
    
    return client;
  } catch (error) {
    console.error('MongoDB 연결 오류:', error);
    isConnected = false;
    throw error;
  }
}

/**
 * MongoDB 연결 종료
 */
export async function disconnectFromMongoDB() {
  if (client) {
    try {
      await client.close();
      isConnected = false;
      console.log('MongoDB 연결 종료');
    } catch (error) {
      console.error('MongoDB 연결 종료 오류:', error);
    }
  }
}

/**
 * 필요한 인덱스 설정
 */
async function setupIndexes() {
  try {
    // 타이핑 로그 컬렉션의 타임스탬프 인덱스
    await db.collection('typing_logs').createIndex({ timestamp: 1 });
    
    // TTL 인덱스 (30일 후 자동 삭제)
    await db.collection('typing_logs').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 }
    );
    
    console.log('MongoDB 인덱스 설정 완료');
  } catch (error) {
    console.error('MongoDB 인덱스 설정 오류:', error);
  }
}

/**
 * 타이핑 로그 저장
 * @param {Object} logData - 저장할 로그 데이터
 * @returns {Promise<Object>} 저장된 문서
 */
export async function saveTypingLog(logData) {
  if (!isConnected) {
    await connectToMongoDB();
  }

  try {
    // 타임스탬프 및 생성일 추가
    const document = {
      ...logData,
      timestamp: new Date(logData.timestamp || Date.now()),
      createdAt: new Date(),
      idempotencyKey: logData.idempotencyKey || generateIdempotencyKey()
    };

    // 중복 방지를 위한 upsert 작업 (idempotencyKey 기반)
    const result = await db.collection('typing_logs').updateOne(
      { idempotencyKey: document.idempotencyKey },
      { $setOnInsert: document },
      { upsert: true }
    );

    console.log(`MongoDB 로그 저장 결과: 매치=${result.matchedCount}, 수정=${result.modifiedCount}, 삽입=${result.upsertedCount}`);
    
    return {
      success: true,
      id: result.upsertedId || document.idempotencyKey,
      isNewRecord: result.upsertedCount > 0
    };
  } catch (error) {
    console.error('MongoDB 로그 저장 오류:', error);
    throw error;
  }
}

/**
 * 배치 작업으로 여러 로그 저장
 * @param {Array<Object>} logsData - 저장할 로그 데이터 배열
 * @returns {Promise<Object>} 저장 결과
 */
export async function saveBatchTypingLogs(logsData) {
  if (!isConnected) {
    await connectToMongoDB();
  }

  if (!Array.isArray(logsData) || logsData.length === 0) {
    return { success: false, error: '유효한 로그 데이터가 필요합니다' };
  }

  try {
    // 각 로그에 타임스탬프 및 생성일 추가
    const documents = logsData.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp || Date.now()),
      createdAt: new Date(),
      idempotencyKey: log.idempotencyKey || generateIdempotencyKey()
    }));

    // 배치 삽입
    const result = await db.collection('typing_logs').insertMany(documents, {
      ordered: false // 일부 실패해도 나머지 진행
    });

    return {
      success: true,
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds
    };
  } catch (error) {
    // 일부 삽입 실패 확인
    if (error.hasWriteErrors && error.result) {
      return {
        success: true,
        insertedCount: error.result.nInserted,
        failedCount: error.writeErrors.length,
        error: '일부 로그 삽입 실패'
      };
    }

    console.error('MongoDB 배치 로그 저장 오류:', error);
    throw error;
  }
}

/**
 * Change Stream 모니터링 시작
 * @param {Function} onChange - 변경 이벤트 핸들러
 * @returns {Object} Change Stream 객체
 */
export async function startChangeStream(onChange) {
  if (!isConnected) {
    await connectToMongoDB();
  }

  try {
    // 변경 이벤트 필터링 파이프라인
    const pipeline = [
      { $match: { operationType: { $in: ['insert', 'update', 'delete', 'replace'] } } }
    ];

    // 이전 Resume Token으로 복구
    const options = resumeToken ? { resumeAfter: resumeToken } : {};
    
    const collection = db.collection('typing_logs');
    const changeStream = collection.watch(pipeline, options);

    // 변경 이벤트 리스너
    changeStream.on('change', (change) => {
      // Resume Token 저장
      resumeToken = change._id;
      
      // 콜백 호출
      if (typeof onChange === 'function') {
        onChange(change);
      }
    });

    // 오류 처리
    changeStream.on('error', (error) => {
      console.error('MongoDB Change Stream 오류:', error);
      
      // 일정 시간 후 재시도
      setTimeout(() => {
        console.log('Change Stream 재연결 시도...');
        startChangeStream(onChange).catch(console.error);
      }, 5000);
    });

    console.log('MongoDB Change Stream 시작됨');
    return changeStream;
  } catch (error) {
    console.error('MongoDB Change Stream 시작 오류:', error);
    throw error;
  }
}

/**
 * 고유 멱등성 키 생성
 * @returns {string} 멱등성 키
 */
function generateIdempotencyKey() {
  return new ObjectId().toString() + '-' + Date.now();
}

/**
 * 타이핑 통계 조회
 * @param {Object} query - 쿼리 조건
 * @param {Object} options - 조회 옵션
 * @returns {Promise<Array<Object>>} 조회 결과
 */
export async function getTypingStats(query = {}, options = {}) {
  if (!isConnected) {
    await connectToMongoDB();
  }

  try {
    return await db.collection('typing_logs')
      .find(query)
      .sort(options.sort || { timestamp: -1 })
      .limit(options.limit || 100)
      .toArray();
  } catch (error) {
    console.error('MongoDB 통계 조회 오류:', error);
    throw error;
  }
}

/**
 * 기간별 통계 집계
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} 집계 결과
 */
export async function getAggregatedStats(startDate, endDate) {
  if (!isConnected) {
    await connectToMongoDB();
  }

  try {
    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalKeyCount: { $sum: '$keyCount' },
          totalTypingTime: { $sum: '$typingTime' },
          totalDocs: { $sum: 1 },
          avgKeyCount: { $avg: '$keyCount' },
          avgTypingTime: { $avg: '$typingTime' }
        }
      }
    ];

    const results = await db.collection('typing_logs').aggregate(pipeline).toArray();
    return results[0] || {
      totalKeyCount: 0,
      totalTypingTime: 0,
      totalDocs: 0,
      avgKeyCount: 0,
      avgTypingTime: 0
    };
  } catch (error) {
    console.error('MongoDB 집계 통계 조회 오류:', error);
    throw error;
  }
}

// 주기적인 재연결 및 상태 확인
export function setupHealthCheck(intervalMs = 60000) {
  setInterval(async () => {
    if (!isConnected) {
      try {
        await connectToMongoDB();
      } catch (error) {
        console.error('MongoDB 재연결 오류:', error);
      }
    }
  }, intervalMs);
}

export default {
  connectToMongoDB,
  disconnectFromMongoDB,
  saveTypingLog,
  saveBatchTypingLogs,
  startChangeStream,
  getTypingStats,
  getAggregatedStats,
  setupHealthCheck
}; 