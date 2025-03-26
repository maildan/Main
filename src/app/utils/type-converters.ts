/**
 * 타입 변환 유틸리티
 * Rust와 TypeScript 사이 데이터 구조 변환을 지원합니다.
 */

import { MemoryInfo, OptimizationResult, GCResult } from '@/types';

/**
 * snake_case 키를 가진 객체를 camelCase로 변환
 */
export function snakeToCamel<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item)) as any;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = typeof value === 'object' ? snakeToCamel(value) : value;
  }
  
  return result;
}

/**
 * camelCase 키를 가진 객체를 snake_case로 변환
 */
export function camelToSnake<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnake(item)) as any;
  }

  return Object.keys(obj).reduce((result, key) => {
    // camelCase를 snake_case로 변환
    const snakeKey = key.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
    const value = obj[key];
    
    // 값이 객체이면 재귀적으로 변환
    result[snakeKey] = value !== null && typeof value === 'object' 
      ? camelToSnake(value) 
      : value;
    
    return result;
  }, {} as Record<string, any>);
}

/**
 * 네이티브 메모리 정보를 TS 메모리 정보 객체로 변환
 */
export function convertNativeMemoryInfo(nativeInfo: any): MemoryInfo {
  return {
    heap_used: nativeInfo.heap_used,
    heapUsed: nativeInfo.heap_used,
    heap_total: nativeInfo.heap_total,
    heapTotal: nativeInfo.heap_total,
    heap_limit: nativeInfo.heap_limit,
    heapLimit: nativeInfo.heap_limit,
    heap_used_mb: nativeInfo.heap_used_mb,
    heapUsedMB: nativeInfo.heap_used_mb,  // 호환성 유지
    rss: nativeInfo.rss,
    rss_mb: nativeInfo.rss_mb,
    rssMB: nativeInfo.rss_mb,  // 호환성 유지
    percent_used: nativeInfo.percent_used,
    percentUsed: nativeInfo.percent_used,  // 호환성 유지
    external: nativeInfo.external,
    timestamp: nativeInfo.timestamp || Date.now()
  };
}

/**
 * 네이티브 최적화 결과를 TS 최적화 결과 객체로 변환
 */
export function convertNativeOptimizationResult(nativeResult: any): OptimizationResult {
  // 최적화 결과 기본 구조 생성
  const result: OptimizationResult = {
    success: nativeResult.success,
    optimization_level: nativeResult.optimization_level,
    timestamp: nativeResult.timestamp || Date.now(),
    error: nativeResult.error
  };

  // 선택적 속성 추가
  if (nativeResult.freedMemory || nativeResult.freed_memory) {
    result.freed_memory = nativeResult.freedMemory || nativeResult.freed_memory;
  }

  if (nativeResult.freedMB || nativeResult.freed_mb) {
    result.freed_mb = nativeResult.freedMB || nativeResult.freed_mb;
  }

  if (nativeResult.duration) {
    result.duration = nativeResult.duration;
  }

  // 메모리 정보 추가
  if (nativeResult.memoryBefore || nativeResult.memory_before) {
    const memBefore = nativeResult.memoryBefore || nativeResult.memory_before;
    result.memory_before = memBefore ? convertNativeMemoryInfo(memBefore) : undefined;
  }

  if (nativeResult.memoryAfter || nativeResult.memory_after) {
    const memAfter = nativeResult.memoryAfter || nativeResult.memory_after;
    result.memory_after = memAfter ? convertNativeMemoryInfo(memAfter) : undefined;
  }

  return result;
}

/**
 * 네이티브 GC 결과를 TS GC 결과 객체로 변환
 */
export function convertNativeGCResult(nativeResult: any): GCResult {
  // GC 결과 기본 구조 생성
  const result: GCResult = {
    success: nativeResult.success,
    freedMemory: nativeResult.freedMemory || nativeResult.freed_memory || 0,
    timestamp: nativeResult.timestamp || Date.now(),
    error: nativeResult.error
  };

  // 선택적 속성 추가
  if (nativeResult.freedMB || nativeResult.freed_mb) {
    result.freedMB = nativeResult.freedMB || nativeResult.freed_mb;
  }

  // 'duration' 속성이 GCResult 타입에 없기 때문에 제거

  return result;
}
