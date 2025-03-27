/**
 * 메모리 관련 포맷팅 유틸리티
 */

import { formatBytes, calculatePercentage } from '../common-utils';
import type { MemoryInfo } from '../../../types/memory-types';

/**
 * 메모리 사용량 정보를 포맷팅합니다.
 * @param memoryInfo - 메모리 정보 객체
 * @returns 포맷팅된 메모리 정보 문자열
 */
export function formatMemoryInfo(memoryInfo: MemoryInfo): string {
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
 * 메모리 정보 포맷 변환 유틸리티
 * 
 * API 응답과 내부 타입 간의 변환을 표준화하여 일관성 있는 데이터 처리를 지원합니다.
 */

import { MemoryInfo } from '@/types';

/**
 * 메모리 정보 표준화 함수
 * 다양한 형태의 메모리 정보를 일관된 포맷으로 변환
 * 
 * @param memoryInfo 메모리 정보 객체
 * @returns 표준화된 메모리 정보
 */
export function normalizeMemoryInfo(memoryInfo: Record<string, unknown>): MemoryInfo {
  // 기본값 설정
  const defaultMemoryInfo = createDefaultMemoryInfo();
  
  // memoryInfo가 없는 경우 기본값 반환
  if (!memoryInfo) return defaultMemoryInfo;
  
  // 구조 분해 할당으로 필요한 속성 추출 및 기본값 설정
  const {
    heap_used = 0,
    heap_total = 0,
    heap_limit = 0,
    heap_used_mb = 0,
    heapUsed = 0,
    heapTotal = 0,
    heapLimit = 0,
    heapUsedMB = 0,
    percent_used = 0,
    percentUsed = 0,
    rss = 0,
    rss_mb = 0,
    rssMB = 0,
    timestamp = Date.now()
  } = memoryInfo as {
    heap_used?: number;
    heap_total?: number;
    heap_limit?: number;
    heap_used_mb?: number;
    heapUsed?: number;
    heapTotal?: number;
    heapLimit?: number;
    heapUsedMB?: number;
    percent_used?: number;
    percentUsed?: number;
    rss?: number;
    rss_mb?: number;
    rssMB?: number;
    timestamp?: number;
  };
  
  // 표준화된 객체 반환
  return {
    heap_used: heap_used || heapUsed || 0,
    heap_total: heap_total || heapTotal || 0,
    heap_limit: heap_limit || heapLimit || 0,
    heap_used_mb: typeof heap_used_mb === 'number' ? heap_used_mb : 
                  typeof heapUsedMB === 'number' ? heapUsedMB : 
                  (heap_used ? heap_used / (1024 * 1024) : 0),
    percent_used: typeof percent_used === 'number' ? percent_used : 
                  typeof percentUsed === 'number' ? percentUsed : 
                  (heap_total > 0 ? ((heap_used || 0) / heap_total) * 100 : 0),
    rss: rss || 0,
    rss_mb: typeof rss_mb === 'number' ? rss_mb : 
            typeof rssMB === 'number' ? rssMB : 
            (rss ? rss / (1024 * 1024) : 0),
    timestamp: timestamp || Date.now()
  };
}

/**
 * 기본 메모리 정보 생성
 * 메모리 정보를 얻을 수 없을 때 기본값 제공
 * 
 * @returns 기본 메모리 정보
 */
export function createDefaultMemoryInfo(): MemoryInfo {
  const timestamp = Date.now();
  
  return {
    heap_used: 0,
    heap_total: 0,
    heap_limit: 0,
    heap_used_mb: 0,
    percent_used: 0,
    rss: 0,
    rss_mb: 0,
    timestamp,
  };
}

/**
 * 메모리 정보 객체 생성
 * Partial<MemoryInfo> 타입의 데이터를 MemoryInfo 객체로 변환
 * 
 * @param data Partial<MemoryInfo> 타입의 데이터
 * @returns MemoryInfo 객체
 */
export function createMemoryInfoObject(data: Partial<MemoryInfo>): MemoryInfo {
  return {
    heap_used: data.heap_used || 0,
    heap_total: data.heap_total || 0,
    heap_limit: data.heap_limit || 0,
    heap_used_mb: data.heap_used_mb || 0,
    percent_used: data.percent_used || 0,
    rss: data.rss || 0,
    rss_mb: data.rss_mb || 0,
    timestamp: data.timestamp || Date.now()
  };
}
