/**
 * 메모리 사용량 로깅 및 분석 유틸리티
 *
 * 장기적인 메모리 사용 패턴 분석과 최적화 전략 수립에 필요한
 * 데이터를 수집하고 저장합니다.
 */

import { getMemoryInfo } from '../memory-management';
import { getPerformanceHistory } from '../performance-metrics';
import { normalizeMemoryInfo } from './format-utils';
// MemoryEventType을 src/types에서 가져옵니다
import { MemoryEventType, MemoryInfo } from '@/types';

/**
 * 메모리 로거 모듈
 *
 * 메모리 사용량 및 관련 이벤트를 로깅하기 위한 유틸리티
 */

// 로그 레벨 정의
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 로그 항목 인터페이스
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

// 로그 설정 인터페이스
export interface LoggerOptions {
  minLevel?: LogLevel;
  maxLogs?: number;
  printToConsole?: boolean;
  moduleName?: string;
}

// 기본 로거 옵션
const DEFAULT_OPTIONS: LoggerOptions = {
  minLevel: LogLevel.INFO,
  maxLogs: 100,
  printToConsole: true,
  moduleName: 'memory',
};

/**
 * 메모리 로거 클래스
 */
export class MemoryLogger {
  private logs: LogEntry[] = [];
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 로그 기록
   * @param level 로그 레벨
   * @param message 메시지
   * @param data 추가 데이터
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // 설정된 최소 레벨보다 낮은 로그는 무시
    if (level < this.options.minLevel!) {
      return;
    }

    // 로그 항목 생성
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    // 로그 배열에 추가
    this.logs.push(entry);

    // 로그 개수 제한
    if (this.logs.length > this.options.maxLogs!) {
      this.logs.shift();
    }

    // 콘솔 출력 (설정된 경우)
    if (this.options.printToConsole) {
      this.printToConsole(entry);
    }
  }

  /**
   * 콘솔에 로그 출력
   * @param entry 로그 항목
   */
  private printToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = this.options.moduleName ? `[${this.options.moduleName}]` : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`${timestamp} ${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.INFO:
        console.info(`${timestamp} ${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(`${timestamp} ${prefix} ${entry.message}`, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(`${timestamp} ${prefix} ${entry.message}`, entry.data);
        break;
    }
  }

  /**
   * 디버그 로그 기록
   * @param message 메시지
   * @param data 추가 데이터
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 정보 로그 기록
   * @param message 메시지
   * @param data 추가 데이터
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 경고 로그 기록
   * @param message 메시지
   * @param data 추가 데이터
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 오류 로그 기록
   * @param message 메시지
   * @param data 추가 데이터
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 모든 로그 가져오기
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 특정 레벨 이상의 로그만 가져오기
   * @param level 최소 로그 레벨
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(entry => entry.level >= level);
  }

  /**
   * 오류 로그만 가져오기
   */
  getErrorLogs(): LogEntry[] {
    return this.logs.filter(entry => entry.level === LogLevel.ERROR);
  }
}

// 기본 로거 인스턴스
export const memoryLogger = new MemoryLogger();
export const logger = memoryLogger; // 편의를 위한 별칭

// 편의성을 위한 기본 함수 내보내기
export const debug = memoryLogger.debug.bind(memoryLogger);
export const info = memoryLogger.info.bind(memoryLogger);
export const warn = memoryLogger.warn.bind(memoryLogger);
export const error = memoryLogger.error.bind(memoryLogger);

// 메모리 로그 엔트리 인터페이스
export interface MemoryLogEntry {
  timestamp: number;
  info: MemoryInfo;
  eventType: MemoryEventType;
  eventDescription?: string;
  componentId?: string;
  route?: string;
}

// 메모리 사용 통계 인터페이스
export interface MemoryUsageStats {
  averageUsage: number;
  peakUsage: number;
  minUsage: number;
  lastUsage: number;
  usageOverTime: Array<{ timestamp: number; usageMB: number }>;
  optimizationEvents: Array<{ timestamp: number; freedMemory: number }>;
  gcEvents: Array<{ timestamp: number; freedMemory: number }>;
  leakSuspects: Array<{ componentId: string; frequency: number }>;
}

// 누락된 변수와 상수 정의 추가
const memoryLogs: MemoryLogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;
const MEMORY_LOG_DB = 'memory_log_db';
const INDEXEDDB_STORE = 'memory_logs';

/**
 * 메모리 사용량 로깅
 * @param eventType 이벤트 타입
 * @param eventDescription 이벤트 설명 (선택)
 * @param componentId 컴포넌트 ID (선택)
 * @param route 현재 라우트 (선택)
 */
export async function logMemoryUsage(
  eventType: MemoryEventType,
  eventDescription?: string,
  componentId?: string,
  route?: string
): Promise<MemoryLogEntry> {
  // 현재 메모리 정보 가져오기
  const rawMemoryInfo = (await getMemoryInfo()) || {
    heap_used: 0,
    heap_total: 0,
    heap_used_mb: 0,
    heapUsed: 0,
    heapTotal: 0,
    heapUsedMB: 0,
    rss: 0,
    rss_mb: 0,
    rssMB: 0,
    percent_used: 0,
    percentUsed: 0,
    timestamp: Date.now(),
  };

  // 표준화된 MemoryInfo 인터페이스로 변환
  const standardizedInfo = normalizeMemoryInfo(rawMemoryInfo as any);

  // 현재 라우트 가져오기 (route 매개변수가 없는 경우)
  if (!route && typeof window !== 'undefined') {
    route = window.location.pathname;
  }

  // 로그 항목 생성
  const logEntry: MemoryLogEntry = {
    timestamp: Date.now(),
    info: standardizedInfo,
    eventType,
    eventDescription,
    componentId,
    route,
  };

  // 인메모리 로그에 추가
  memoryLogs.push(logEntry);

  // 최대 개수 제한
  if (memoryLogs.length > MAX_LOG_ENTRIES) {
    memoryLogs.shift();
  }

  // IndexedDB에 저장 (백그라운드로 실행)
  saveLogToIndexedDB(logEntry).catch(err => console.error('메모리 로그 저장 중 오류:', err));

  return logEntry;
}

/**
 * 주기적인 메모리 모니터링 시작
 * @param intervalMs 체크 간격 (밀리초)
 * @returns 모니터링 중지 함수
 */
export function startMemoryMonitoring(intervalMs: number = 60000): () => void {
  const intervalId = setInterval(() => {
    logMemoryUsage(MemoryEventType.INFO);
  }, intervalMs);

  return () => clearInterval(intervalId);
}

/**
 * IndexedDB에 로그 저장
 * @param logEntry 로그 항목
 */
async function saveLogToIndexedDB(logEntry: MemoryLogEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    // IndexedDB가 사용 가능한지 확인
    if (!window.indexedDB) {
      reject(new Error('IndexedDB를 지원하지 않는 브라우저입니다'));
      return;
    }

    // 데이터베이스 열기
    const request = window.indexedDB.open(MEMORY_LOG_DB, 1);

    // 데이터베이스 생성/업그레이드 이벤트
    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 객체 저장소가 없으면 생성
      if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
        db.createObjectStore(INDEXEDDB_STORE, { keyPath: 'timestamp' });
      }
    };

    // 오류 처리
    request.onerror = event => {
      reject(new Error(`IndexedDB 오류: ${(event.target as IDBOpenDBRequest).error}`));
    };

    // 성공 처리
    request.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      try {
        // 트랜잭션 시작
        const transaction = db.transaction([INDEXEDDB_STORE], 'readwrite');
        const store = transaction.objectStore(INDEXEDDB_STORE);

        // 로그 항목 저장
        const addRequest = store.add(logEntry);

        addRequest.onsuccess = () => {
          resolve();
        };

        addRequest.onerror = () => {
          reject(new Error(`로그 항목 저장 실패: ${addRequest.error}`));
        };

        // 트랜잭션 완료 이벤트
        transaction.oncomplete = () => {
          db.close();
        };
      } catch (error) {
        reject(error);
      }
    };
  });
}

/**
 * 저장된 메모리 로그 가져오기
 * @param limit 가져올 최대 항목 수
 * @param startTime 시작 시간 (밀리초)
 * @param endTime 종료 시간 (밀리초)
 * @param eventTypes 필터링할 이벤트 타입 배열
 * @returns 로그 항목 배열
 */
export async function getMemoryLogs(
  limit: number = 100,
  startTime?: number,
  endTime?: number,
  eventTypes?: MemoryEventType[]
): Promise<MemoryLogEntry[]> {
  // 시간 기준 필터링
  const _now = Date.now(); // 사용하지 않는 변수에 _ 추가
  const filteredByTime = memoryLogs.filter((log: MemoryLogEntry) => {
    if (startTime && log.timestamp < startTime) return false;
    if (endTime && log.timestamp > endTime) return false;
    return true;
  });

  // 이벤트 타입 기준 필터링
  const filtered = eventTypes
    ? filteredByTime.filter((log: MemoryLogEntry) =>
        eventTypes.includes(log.eventType as MemoryEventType)
      )
    : filteredByTime;

  // 최신 순으로 정렬하고 제한된 개수 반환
  return filtered
    .sort((a: MemoryLogEntry, b: MemoryLogEntry) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * 메모리 사용 통계 분석
 * @param startTime 시작 시간 (밀리초)
 * @param endTime 종료 시간 (밀리초)
 * @returns 메모리 사용 통계
 */
export async function analyzeMemoryUsage(
  startTime: number = Date.now() - 24 * 60 * 60 * 1000, // 기본: 24시간
  endTime: number = Date.now()
): Promise<MemoryUsageStats> {
  // 지정된 기간의 로그 가져오기
  const logs = await getMemoryLogs(1000, startTime, endTime);

  if (logs.length === 0) {
    throw new Error('분석할 메모리 로그가 없습니다');
  }

  // 기본 통계 계산
  const usages = logs.map(log => log.info.heap_used_mb || 0);
  const avgUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
  const peakUsage = Math.max(...usages);
  const minUsage = Math.min(...usages);
  const lastUsage = usages[0]; // 최신 로그가 첫 번째

  // 시간별 사용량
  const usageOverTime = logs
    .map(log => ({
      timestamp: log.timestamp,
      usageMB: log.info.heap_used_mb || 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // 최적화 이벤트 추출
  const optimizationEvents = logs
    .filter(log => log.eventType === MemoryEventType.OPTIMIZATION)
    .map(log => {
      // 최적화 전후 메모리 차이 계산 (이전 로그와 비교)
      const index = logs.indexOf(log);
      const prevLog = logs[index + 1]; // 역순 정렬이므로 다음 인덱스가 이전 로그
      const freedMemory = prevLog
        ? (prevLog.info.heap_used_mb || 0) - (log.info.heap_used_mb || 0)
        : 0;

      return {
        timestamp: log.timestamp,
        freedMemory: Math.max(0, freedMemory), // 음수인 경우 0으로 처리
      };
    });

  // GC 이벤트 추출
  const gcEvents = logs
    .filter(log => log.eventType === MemoryEventType.GC)
    .map(log => {
      // GC 전후 메모리 차이 계산
      const index = logs.indexOf(log);
      const prevLog = logs[index + 1];
      const freedMemory = prevLog
        ? (prevLog.info.heap_used_mb || 0) - (log.info.heap_used_mb || 0)
        : 0;

      return {
        timestamp: log.timestamp,
        freedMemory: Math.max(0, freedMemory),
      };
    });

  // 메모리 누수 의심 컴포넌트 분석
  const componentMounts = logs.filter(
    log => log.eventType === MemoryEventType.INFO && log.componentId
  );

  const componentCounts: Record<string, number> = {};
  for (const log of componentMounts) {
    const id = log.componentId!;
    componentCounts[id] = (componentCounts[id] || 0) + 1;
  }

  // 누수 의심 컴포넌트 (상위 10개)
  const leakSuspects = Object.entries(componentCounts)
    .map(([componentId, frequency]) => ({ componentId, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  return {
    averageUsage: avgUsage,
    peakUsage,
    minUsage,
    lastUsage,
    usageOverTime,
    optimizationEvents,
    gcEvents,
    leakSuspects,
  };
}

/**
 * 메모리 로그 내보내기 (JSON)
 * @returns JSON 문자열
 */
export async function exportMemoryLogs(): Promise<string> {
  const logs = await getMemoryLogs(MAX_LOG_ENTRIES);
  const performanceData = getPerformanceHistory();

  const exportData = {
    logs,
    performanceHistory: performanceData,
    exportTimestamp: Date.now(),
    appVersion: '1.0.0', // 앱 버전
    systemInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 메모리 자동 로그 설정
 * 주요 이벤트에 대한 메모리 로깅을 자동화합니다.
 */
export function setupAutomaticMemoryLogging(): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // 주기적 모니터링 시작
  const stopMonitoring = startMemoryMonitoring(60000); // 1분마다
  cleanupFunctions.push(stopMonitoring);

  // 페이지 탐색 추적
  if (typeof window !== 'undefined') {
    // 페이지 로드 시
    const handleLoad = () => {
      logMemoryUsage(MemoryEventType.INFO, 'Page loaded');
    };
    window.addEventListener('load', handleLoad);
    cleanupFunctions.push(() => window.removeEventListener('load', handleLoad));

    // 페이지 언로드 시
    const handleBeforeUnload = () => {
      logMemoryUsage(MemoryEventType.INFO, 'Page unloaded');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    cleanupFunctions.push(() => window.removeEventListener('beforeunload', handleBeforeUnload));

    // 가시성 변경 시
    const handleVisibilityChange = () => {
      logMemoryUsage(MemoryEventType.INFO, `Visibility changed: ${document.visibilityState}`);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    cleanupFunctions.push(() =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    );
  }

  // 모든 정리 함수를 호출하는 함수 반환
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}
