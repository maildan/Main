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
    // 네이티브 모듈의 네이밍 규칙 사용 (snake_case)
    heap_used: heap_used || heapUsed || 0,
    heap_total: heap_total || heapTotal || 0,
    heap_limit: heap_limit || heapLimit || 0,
    heap_used_mb: heap_used_mb || heapUsedMB || 
      (heap_used ? heap_used / (1024 * 1024) : 0),
    percent_used: percent_used || percentUsed || 
      (heap_total > 0 ? (heap_used / heap_total) * 100 : 0),
    rss: rss || 0,
    rss_mb: rss_mb || rssMB || (rss ? rss / (1024 * 1024) : 0),
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
    
    // MemoryInfo 타입에 없는 속성은 제거
  };
}

/**
 * 메모리 정보 포맷 함수
 * 메모리 정보를 문자열로 포맷
 * 
 * @param info 메모리 정보 객체
 * @returns 포맷된 메모리 정보 문자열
 */
export function formatMemoryInfo(info: MemoryInfo): string {
  if (!info) return 'Memory info not available';
  
  // 프로퍼티 이름 일치시키기
  return `Memory usage: ${info.heap_used_mb.toFixed(2)}MB / ${(info.heap_total / (1024 * 1024)).toFixed(2)}MB (${info.percent_used.toFixed(1)}%)`;
}

/**
 * 메모리 정보 객체 생성
 * Partial<MemoryInfo> 타입의 데이터를 MemoryInfo 객체로 변환
 * 
 * @param data Partial<MemoryInfo> 타입의 데이터
 * @returns MemoryInfo 객체
 */
export function createMemoryInfoObject(data: Partial<MemoryInfo>): MemoryInfo {
  // 명시적으로 올바른 프로퍼티 이름 사용
  return {
    heap_used: data.heap_used || 0,
    heap_total: data.heap_total || 0,
    heap_used_mb: data.heap_used_mb || 0,
    percent_used: data.percent_used || 0,
    timestamp: data.timestamp || Date.now(),
    // 선택적 속성은 존재할 때만 추가
    ...(data.rss && { rss: data.rss }),
    ...(data.rss_mb && { rss_mb: data.rss_mb })
  };
}
