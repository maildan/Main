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
export function normalizeMemoryInfo(memoryInfo: any): MemoryInfo {
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
  } = memoryInfo;
  
  // 일관된 포맷으로 변환
  return {
    // 네이티브 모듈 및 JS 구현 속성 통합
    heap_used: heap_used || heapUsed || 0,
    heap_total: heap_total || heapTotal || 0,
    heap_limit: heap_limit || heapLimit || 0,
    heap_used_mb: heap_used_mb || heapUsedMB || 
      (heap_used ? heap_used / (1024 * 1024) : 0),
    percent_used: percent_used || percentUsed || 
      (heap_total > 0 ? (heap_used / heap_total) * 100 : 0),
    rss: rss || 0,
    rss_mb: rss_mb || (rss ? rss / (1024 * 1024) : 0),
    timestamp: timestamp || Date.now(),
    
    // 앱 호환성을 위한 별칭 속성
    heapUsed: heap_used || heapUsed || 0,
    heapTotal: heap_total || heapTotal || 0,
    heapLimit: heap_limit || heapLimit || 0,
    heapUsedMB: heap_used_mb || heapUsedMB || 
      (heap_used ? heap_used / (1024 * 1024) : 0),
    percentUsed: percent_used || percentUsed || 
      (heap_total > 0 ? (heap_used / heap_total) * 100 : 0),
    // rssMB 속성 추가 - MemoryInfo 타입에 맞게 추가
    rssMB: rssMB || rss_mb || (rss ? rss / (1024 * 1024) : 0),
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
    
    // 앱 호환성을 위한 별칭 속성
    heapUsed: 0,
    heapTotal: 0,
    heapLimit: 0,
    heapUsedMB: 0,
    percentUsed: 0,
    // rssMB 속성 추가
    rssMB: 0,
  };
}
