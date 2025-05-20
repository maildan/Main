/**
 * 메모리 관련 포맷 유틸리티
 */

import { MemoryInfo } from '@/types';

// 기본 메모리 정보 인터페이스 (파일에서만 사용)
interface OriginalMemoryInfo {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external?: number;
}

/**
 * 바이트 단위를 적절한 단위로 포맷팅
 * @param bytes 바이트 값
 * @param decimals 소수점 자릿수
 * @returns 포맷팅된 문자열
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 메모리 사용량을 퍼센트로 포맷팅
 * @param percent 메모리 사용 백분율
 */
export function formatMemoryPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

/**
 * 메모리 크기를 MB 단위로 포맷팅
 * @param bytes 바이트 수
 */
export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/**
 * 퍼센트 계산
 * @param value - 현재 값
 * @param total - 전체 값
 * @returns 백분율 값
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 10) / 10;
}

/**
 * 메모리 사용량 정보를 포맷팅합니다.
 * @param memoryInfo - 메모리 정보 객체
 * @returns 포맷팅된 메모리 정보 문자열
 */
export function formatMemoryInfo(memoryInfo: OriginalMemoryInfo): string {
  if (!memoryInfo) return 'No memory information available';

  const { heapUsed, heapTotal, rss } = memoryInfo;
  const usedPercent = calculatePercentage(heapUsed, heapTotal);

  return `Memory Usage: ${formatBytes(heapUsed)} / ${formatBytes(heapTotal)} (${usedPercent}%)
RSS: ${formatBytes(rss)}`;
}

/**
 * 메모리 사용량을 MB 단위로 변환합니다.
 * @param bytes - 바이트 단위의 메모리 크기
 * @returns MB 단위의 메모리 크기
 */
export function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

/**
 * 메모리 정보 표준화 함수
 * 다양한 형태의 메모리 정보를 일관된 포맷으로 변환
 * 
 * @param info 메모리 정보 객체
 * @returns 표준화된 메모리 정보
 */
export function normalizeMemoryInfo(info: Partial<MemoryInfo>): MemoryInfo {
  return {
    heapUsed: info.heapUsed || 0,
    heapTotal: info.heapTotal || 0,
    heapLimit: info.heapLimit || 0,
    heapUsedMB: info.heapUsedMB || 0,
    percentUsed: info.percentUsed || 0,
    rss: info.rss || 0,
    rssMB: info.rssMB || 0,
    external: info.external || 0,
    timestamp: info.timestamp || Date.now(),
  };
}

export default {
  formatBytes
};
