/**
 * 타입 변환 유틸리티
 * Rust와 TypeScript 사이 데이터 구조 변환을 지원합니다.
 */

import { MemoryInfo, OptimizationResult, GCResult } from './memory/types';

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

  return Object.keys(obj).reduce((result, key) => {
    // snake_case를 camelCase로 변환
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = obj[key];
    
    // 값이 객체이면 재귀적으로 변환
    result[camelKey] = value !== null && typeof value === 'object' 
      ? snakeToCamel(value) 
      : value;
    
    return result;
  }, {} as Record<string, any>);
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
  if (!nativeInfo) {
    return {
      heap_used: 0,
      heapUsed: 0,
      heap_total: 0,
      heapTotal: 0,
      heap_used_mb: 0,
      heapUsedMB: 0,
      rss: 0,
      rss_mb: 0,
      rssMB: 0,
      percent_used: 0,
      percentUsed: 0,
      timestamp: Date.now()
    };
  }

  // snake_case 형식 유지하면서 호환성 속성 추가
  return {
    heap_used: nativeInfo.heap_used,
    heapUsed: nativeInfo.heap_used,  // 호환성 유지
    heap_total: nativeInfo.heap_total,
    heapTotal: nativeInfo.heap_total,  // 호환성 유지
    heap_used_mb: nativeInfo.heap_used_mb,
    heapUsedMB: nativeInfo.heap_used_mb,  // 호환성 유지
    rss: nativeInfo.rss,
    rss_mb: nativeInfo.rss_mb,
    rssMB: nativeInfo.rss_mb,  // 호환성 유지
    percent_used: nativeInfo.percent_used,
    percentUsed: nativeInfo.percent_used,  // 호환성 유지
    heap_limit: nativeInfo.heap_limit,
    timestamp: nativeInfo.timestamp || Date.now()
  };
}

/**
 * 네이티브 최적화 결과를 TS 최적화 결과 객체로 변환
 */
export function convertNativeOptimizationResult(nativeResult: any): OptimizationResult {
  if (!nativeResult) {
    return {
      success: false,
      optimization_level: 0,
      timestamp: Date.now(),
      error: "결과 없음"
    };
  }

  const result: OptimizationResult = {
    success: nativeResult.success,
    optimization_level: nativeResult.optimization_level,
    timestamp: nativeResult.timestamp || Date.now()
  };

  if (nativeResult.freed_memory) {
    result.freed_memory = nativeResult.freed_memory;
    result.freedMemory = nativeResult.freed_memory;  // 호환성 유지
  }

  if (nativeResult.freed_mb) {
    result.freed_mb = nativeResult.freed_mb;
    result.freedMB = nativeResult.freed_mb;  // 호환성 유지
  }

  if (nativeResult.duration) {
    result.duration = nativeResult.duration;
  }

  if (nativeResult.memory_before) {
    result.memory_before = convertNativeMemoryInfo(nativeResult.memory_before);
  }

  if (nativeResult.memory_after) {
    result.memory_after = convertNativeMemoryInfo(nativeResult.memory_after);
  }

  if (nativeResult.error) {
    result.error = nativeResult.error;
  }

  return result;
}

/**
 * 네이티브 GC 결과를 TS GC 결과 객체로 변환
 */
export function convertNativeGCResult(nativeResult: any): GCResult {
  if (!nativeResult) {
    return {
      success: false,
      freed_memory: 0,
      freedMemory: 0,
      freed_mb: 0,
      freedMB: 0,
      duration: 0,
      timestamp: Date.now()
    };
  }

  return {
    success: nativeResult.success,
    freed_memory: nativeResult.freed_memory,
    freedMemory: nativeResult.freed_memory,  // 호환성 유지
    freed_mb: nativeResult.freed_mb,
    freedMB: nativeResult.freed_mb,  // 호환성 유지
    duration: nativeResult.duration,
    timestamp: nativeResult.timestamp || Date.now(),
    error: nativeResult.error
  };
}
