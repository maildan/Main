/**
 * 로그 저장 및 관리 유틸리티
 * 
 * 애플리케이션 내의 대화 로그와 에러 로그를 저장하고 관리하는 기능 제공
 */

import { formatBytes, getCurrentTimestamp } from './common-utils';
import { logger } from './memory/logger';

/**
 * 로그 타입 정의
 */
export enum LogType {
  CONVERSATION = 'conversation', // 사용자와 AI 간 대화 로그
  ERROR = 'error',               // 에러 로그
  PERFORMANCE = 'performance',   // 성능 관련 로그
  MEMORY = 'memory',             // 메모리 관련 로그
  SYSTEM = 'system'              // 시스템 관련 로그
}

/**
 * 로그 데이터 인터페이스
 */
export interface LogEntry {
  id?: string;           // 로그 고유 ID (저장 시 자동 생성)
  type: LogType;         // 로그 타입
  timestamp: number;     // 로그 생성 시간 (밀리초 타임스탬프)
  content: string;       // 로그 내용
  metadata?: any;        // 추가 메타데이터 (JSON 직렬화 가능한 객체)
  tags?: string[];       // 로그 태그 (검색 및 필터링용)
  sessionId?: string;    // 세션 ID
}

/**
 * 로그 검색 옵션 인터페이스
 */
export interface LogSearchOptions {
  type?: LogType | LogType[];    // 검색할 로그 타입
  startTime?: number;            // 검색 시작 시간
  endTime?: number;              // 검색 종료 시간
  tags?: string[];               // 검색할 태그
  query?: string;                // 검색 쿼리 (로그 내용에서 검색)
  limit?: number;                // 검색 결과 제한
  offset?: number;               // 검색 결과 오프셋
  sessionId?: string;            // 세션 ID로 검색
}

/**
 * 로그를 저장합니다.
 * 
 * @param logEntry - 저장할 로그 데이터
 * @returns 저장된 로그 엔트리 (ID 포함)
 */
export async function saveLog(logEntry: Omit<LogEntry, 'id'>): Promise<LogEntry> {
  try {
    // 로그 ID 생성 (타임스탬프 + 랜덤 문자열)
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    const log: LogEntry = {
      ...logEntry,
      id,
      timestamp: logEntry.timestamp || getCurrentTimestamp()
    };
    
    // 로그 API 엔드포인트로 저장 요청
    const response = await fetch('/api/logs/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });
    
    if (!response.ok) {
      throw new Error(`로그 저장 실패: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    logger.debug(`로그 저장 완료 (ID: ${id}, 타입: ${logEntry.type})`);
    return result.data;
  } catch (error) {
    logger.error('로그 저장 중 오류 발생:', error);
    
    // API 호출 실패시 로컬 스토리지에 임시 저장
    try {
      const storageKey = `log_${Date.now()}`;
      localStorage.setItem(storageKey, JSON.stringify(logEntry));
    } catch (storageError) {
      logger.error('로그의 로컬 스토리지 백업 저장 실패:', storageError);
    }
    
    throw error;
  }
}

/**
 * 로그를 검색합니다.
 * 
 * @param options - 검색 옵션
 * @returns 검색된 로그 엔트리 배열
 */
export async function searchLogs(options: LogSearchOptions = {}): Promise<LogEntry[]> {
  try {
    const queryParams = new URLSearchParams();
    
    // 검색 옵션을 쿼리 파라미터로 변환
    if (options.type) {
      if (Array.isArray(options.type)) {
        options.type.forEach(t => queryParams.append('type', t));
      } else {
        queryParams.set('type', options.type);
      }
    }
    
    if (options.startTime) queryParams.set('startTime', options.startTime.toString());
    if (options.endTime) queryParams.set('endTime', options.endTime.toString());
    if (options.query) queryParams.set('query', options.query);
    if (options.limit) queryParams.set('limit', options.limit.toString());
    if (options.offset) queryParams.set('offset', options.offset.toString());
    if (options.sessionId) queryParams.set('sessionId', options.sessionId);
    
    if (options.tags && options.tags.length > 0) {
      options.tags.forEach(tag => queryParams.append('tag', tag));
    }
    
    // 로그 검색 API 호출
    const response = await fetch(`/api/logs/search?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`로그 검색 실패: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    logger.debug(`로그 검색 완료 (결과 수: ${result.data.length})`);
    return result.data;
  } catch (error) {
    logger.error('로그 검색 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 대화 로그를 저장합니다.
 * 
 * @param userMessage - 사용자 메시지
 * @param aiResponse - AI 응답
 * @param metadata - 추가 메타데이터
 * @returns 저장된 로그 엔트리
 */
export async function saveConversationLog(
  userMessage: string,
  aiResponse: string,
  metadata: any = {}
): Promise<LogEntry> {
  const now = getCurrentTimestamp();
  const sessionId = metadata.sessionId || localStorage.getItem('sessionId') || `session_${now}`;
  
  // 세션 ID가 없으면 새로 생성하고 저장
  if (!localStorage.getItem('sessionId')) {
    localStorage.setItem('sessionId', sessionId);
  }
  
  const logEntry: Omit<LogEntry, 'id'> = {
    type: LogType.CONVERSATION,
    timestamp: now,
    content: JSON.stringify({
      userMessage,
      aiResponse,
      timestamp: now
    }),
    metadata: {
      ...metadata,
      messageSize: {
        user: new Blob([userMessage]).size,
        ai: new Blob([aiResponse]).size
      },
      messageSizeFormatted: {
        user: formatBytes(new Blob([userMessage]).size),
        ai: formatBytes(new Blob([aiResponse]).size)
      }
    },
    tags: ['conversation', 'ai', ...(metadata.tags || [])],
    sessionId
  };
  
  return saveLog(logEntry);
}

/**
 * 에러 로그를 저장합니다.
 * 
 * @param error - 에러 객체 또는 에러 메시지
 * @param metadata - 추가 메타데이터
 * @returns 저장된 로그 엔트리
 */
export async function saveErrorLog(
  error: Error | string,
  metadata: any = {}
): Promise<LogEntry> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const logEntry: Omit<LogEntry, 'id'> = {
    type: LogType.ERROR,
    timestamp: getCurrentTimestamp(),
    content: errorMessage,
    metadata: {
      ...metadata,
      stack: errorStack,
      browserInfo: typeof navigator !== 'undefined' ? {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      } : undefined
    },
    tags: ['error', ...(metadata.tags || [])],
    sessionId: metadata.sessionId || localStorage.getItem('sessionId')
  };
  
  return saveLog(logEntry);
}

/**
 * 메모리 로그를 저장합니다.
 * 
 * @param memoryInfo - 메모리 정보
 * @returns 저장된 로그 엔트리
 */
export async function saveMemoryLog(memoryInfo: any): Promise<LogEntry> {
  const logEntry: Omit<LogEntry, 'id'> = {
    type: LogType.MEMORY,
    timestamp: getCurrentTimestamp(),
    content: JSON.stringify(memoryInfo),
    metadata: {
      heapUsed: memoryInfo.heapUsed,
      heapTotal: memoryInfo.heapTotal,
      percentUsed: memoryInfo.percentUsed
    },
    tags: ['memory', 'performance'],
    sessionId: localStorage.getItem('sessionId')
  };
  
  return saveLog(logEntry);
}

/**
 * 성능 로그를 저장합니다.
 * 
 * @param metric - 성능 메트릭 이름
 * @param value - 성능 값
 * @param unit - 값의 단위 (ms, MB 등)
 * @param metadata - 추가 메타데이터
 * @returns 저장된 로그 엔트리
 */
export async function savePerformanceLog(
  metric: string,
  value: number,
  unit: string = 'ms',
  metadata: any = {}
): Promise<LogEntry> {
  const logEntry: Omit<LogEntry, 'id'> = {
    type: LogType.PERFORMANCE,
    timestamp: getCurrentTimestamp(),
    content: `${metric}: ${value}${unit}`,
    metadata: {
      ...metadata,
      metric,
      value,
      unit
    },
    tags: ['performance', metric, ...(metadata.tags || [])],
    sessionId: localStorage.getItem('sessionId')
  };
  
  return saveLog(logEntry);
}

/**
 * 시스템 로그를 저장합니다.
 * 
 * @param message - 시스템 메시지
 * @param metadata - 추가 메타데이터
 * @returns 저장된 로그 엔트리
 */
export async function saveSystemLog(
  message: string,
  metadata: any = {}
): Promise<LogEntry> {
  const logEntry: Omit<LogEntry, 'id'> = {
    type: LogType.SYSTEM,
    timestamp: getCurrentTimestamp(),
    content: message,
    metadata: {
      ...metadata,
      systemInfo: typeof navigator !== 'undefined' ? {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      } : undefined
    },
    tags: ['system', ...(metadata.tags || [])],
    sessionId: metadata.sessionId || localStorage.getItem('sessionId')
  };
  
  return saveLog(logEntry);
}

/**
 * 로컬 저장소의 로그를 모두 서버로 동기화합니다.
 */
export async function syncLocalLogs(): Promise<void> {
  try {
    // 로컬 스토리지에서 로그로 시작하는 키 모두 가져오기
    const logKeys = Object.keys(localStorage).filter(key => key.startsWith('log_'));
    
    if (logKeys.length === 0) {
      logger.debug('동기화할 로컬 로그가 없습니다.');
      return;
    }
    
    logger.info(`${logKeys.length}개의 로컬 로그 동기화 시작`);
    
    // 각 로그 동기화
    for (const key of logKeys) {
      try {
        const logJson = localStorage.getItem(key);
        if (!logJson) continue;
        
        const log = JSON.parse(logJson);
        await saveLog(log);
        
        // 성공적으로 동기화된 로그는 로컬 스토리지에서 제거
        localStorage.removeItem(key);
      } catch (error) {
        logger.error(`로그 동기화 중 오류 (${key}):`, error);
      }
    }
    
    logger.info('로컬 로그 동기화 완료');
  } catch (error) {
    logger.error('로그 동기화 중 오류 발생:', error);
    throw error;
  }
}
