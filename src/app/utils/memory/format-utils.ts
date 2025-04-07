/**
 * 메모리 관련 포맷 유틸리티
 */

import { MemoryInfo } from '@/types';

/**
 * 메모리 정보 표준화
 * @param info 원본 메모리 정보
 * @returns 표준화된 메모리 정보
 */
export function normalizeMemoryInfo(info: any): MemoryInfo {
  if (!info) {
    return createEmptyMemoryInfo();
  }

  // snake_case와 camelCase 속성 처리
  const heapUsed = info.heap_used !== undefined ? info.heap_used : (info.heapUsed || 0);
  const heapTotal = info.heap_total !== undefined ? info.heap_total : (info.heapTotal || 0);
  const heapLimit = info.heap_limit !== undefined ? info.heap_limit : (info.heapLimit || 0);
  const rss = info.rss || 0;

  // MB 단위 계산
  const heapUsedMB = info.heap_used_mb !== undefined ?
    info.heap_used_mb : (info.heapUsedMB !== undefined ?
      info.heapUsedMB : heapUsed / (1024 * 1024));

  const rssMB = info.rss_mb !== undefined ?
    info.rss_mb : (info.rssMB !== undefined ?
      info.rssMB : rss / (1024 * 1024));

  // 백분율 계산
  const percentUsed = info.percent_used !== undefined ?
    info.percent_used : (info.percentUsed !== undefined ?
      info.percentUsed : (heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0));

  return {
    heap_used: heapUsed,
    heapUsed: heapUsed,
    heap_total: heapTotal,
    heapTotal: heapTotal,
    heap_limit: heapLimit,
    heapLimit: heapLimit,
    rss: rss,
    heap_used_mb: heapUsedMB,
    heapUsedMB: heapUsedMB,
    rss_mb: rssMB,
    rssMB: rssMB,
    percent_used: percentUsed,
    percentUsed: percentUsed,
    timestamp: info.timestamp || Date.now()
  };
}

/**
 * 바이트 단위 포맷팅
 * @param bytes 바이트 단위 크기
 * @param decimals 소수점 자릿수
 * @returns 포맷팅된 문자열
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 시간 단위 포맷팅 (밀리초 -> 가독성 있는 형식)
 * @param ms 밀리초
 * @returns 포맷팅된 시간 문자열
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * 백분율 포맷팅
 * @param value 백분율 값 (0-100)
 * @param decimals 소수점 자릿수
 * @returns 포맷팅된 백분율 문자열
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 타임스탬프를 날짜 문자열로 변환
 * @param timestamp 타임스탬프 (밀리초)
 * @returns 포맷팅된 날짜 문자열
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * 빈 메모리 정보 객체 생성
 */
function createEmptyMemoryInfo(): MemoryInfo {
  return {
    heap_used: 0,
    heapUsed: 0,
    heap_total: 0,
    heapTotal: 0,
    heap_limit: 0,
    heapLimit: 0,
    rss: 0,
    heap_used_mb: 0,
    heapUsedMB: 0,
    rss_mb: 0,
    rssMB: 0,
    percent_used: 0,
    percentUsed: 0,
    timestamp: Date.now()
  };
}

/**
 * 메모리 정보 포맷팅
 * @param info 메모리 정보
 */
export function formatMemoryInfo(info: MemoryInfo): Record<string, string> {
  if (!info) return {};

  const heapUsedMB = info.heapUsedMB || info.heap_used_mb || 0;
  const heapTotalMB = info.heapTotal
    ? Math.round(info.heapTotal / (1024 * 1024) * 10) / 10
    : (info.heap_total ? Math.round(info.heap_total / (1024 * 1024) * 10) / 10 : 0);

  const percent = info.percentUsed || info.percent_used || 0;

  return {
    heapUsed: `${heapUsedMB.toFixed(1)} MB`,
    heapTotal: `${heapTotalMB.toFixed(1)} MB`,
    percentUsed: `${percent.toFixed(1)}%`,
    timestamp: formatTimestamp(info.timestamp)
  };
}
