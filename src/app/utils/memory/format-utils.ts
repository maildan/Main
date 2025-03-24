/**
 * 메모리 정보 포맷 변환 유틸리티
 * 
 * API 응답과 내부 타입 간의 변환을 표준화하여 일관성 있는 데이터 처리를 지원합니다.
 */

import { MemoryInfo } from '@/types';

/**
 * 다양한 소스의 메모리 정보를 표준화된 MemoryInfo 객체로 변환
 * Rust(snake_case)와 JS(camelCase) 간의 속성명 차이 처리
 */
export function normalizeMemoryInfo(data: any): MemoryInfo {
  if (!data) {
    return createDefaultMemoryInfo();
  }

  // 두 명명 규칙을 모두 지원하도록 표준화된 객체 생성
  const heapUsed = data.heap_used ?? data.heapUsed ?? 0;
  const heapTotal = data.heap_total ?? data.heapTotal ?? 0;
  const heapUsedMB = data.heap_used_mb ?? data.heapUsedMB ?? (heapUsed / (1024 * 1024));
  const rssMB = data.rss_mb ?? data.rssMB ?? 0;
  const percentUsed = data.percent_used ?? data.percentUsed ?? 0;

  return {
    // snake_case 속성
    heap_used: heapUsed,
    heap_total: heapTotal,
    heap_limit: data.heap_limit ?? data.heapLimit,
    rss: data.rss ?? 0,
    external: data.external,
    heap_used_mb: heapUsedMB,
    rss_mb: rssMB,
    percent_used: percentUsed,
    
    // camelCase 속성
    heapUsed: heapUsed,
    heapTotal: heapTotal,
    heapLimit: data.heap_limit ?? data.heapLimit,
    heapUsedMB: heapUsedMB,
    rssMB: rssMB,
    percentUsed: percentUsed,
    
    // 공통 속성
    timestamp: data.timestamp ?? Date.now(),
    error: data.error,
    unavailable: data.unavailable
  };
}

/**
 * 기본 메모리 정보 객체 생성
 */
export function createDefaultMemoryInfo(): MemoryInfo {
  const now = Date.now();
  return {
    // snake_case 속성
    heap_used: 0,
    heap_total: 0,
    heap_used_mb: 0,
    rss: 0,
    rss_mb: 0,
    percent_used: 0,
    
    // camelCase 속성
    heapUsed: 0,
    heapTotal: 0,
    heapUsedMB: 0,
    rssMB: 0,
    percentUsed: 0,
    
    // 공통 속성
    timestamp: now,
    unavailable: true
  };
}
