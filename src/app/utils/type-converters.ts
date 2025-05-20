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

  return Object.keys(obj).reduce(
    (result, key) => {
      // camelCase를 snake_case로 변환
      const snakeKey = key.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
      const value = obj[key];

      // 값이 객체이면 재귀적으로 변환
      result[snakeKey] = value !== null && typeof value === 'object' ? camelToSnake(value) : value;

      return result;
    },
    {} as Record<string, any>
  );
}

/**
 * 네이티브 메모리 정보를 TS 메모리 정보 객체로 변환
 * MemoryInfo 타입 호환성 문제 해결을 위한 수정
 */
export function convertNativeMemoryInfo(nativeInfo: any): MemoryInfo {
  // null 병합 연산자로 undefined 값 처리
  return {
    heapUsed: nativeInfo.heap_used ?? 0,
    heapTotal: nativeInfo.heap_total ?? 0,
    heapLimit: nativeInfo.heap_limit ?? 0,
    heapUsedMB: nativeInfo.heap_used_mb ?? 0,
    rss: nativeInfo.rss ?? 0,
    rssMB: nativeInfo.rss_mb ?? 0,
    percentUsed: nativeInfo.percent_used ?? 0,
    external: nativeInfo.external ?? 0,
    timestamp: nativeInfo.timestamp || Date.now(),
  };
}

/**
 * 네이티브 최적화 결과를 TS 최적화 결과 객체로 변환
 */
export function convertNativeOptimizationResult(nativeResult: any): OptimizationResult {
  // 최적화 결과 기본 구조 생성 - OptimizationResult 타입에 맞게 필요한 속성 추가
  const result: OptimizationResult = {
    success: nativeResult.success,
    optimizationLevel: nativeResult.optimization_level || nativeResult.optimizationLevel || 0,
    timestamp: nativeResult.timestamp || Date.now(),
    freedMemory: nativeResult.freedMemory || nativeResult.freed_memory || 0,
    error: nativeResult.error,
    // 선택적 필드 지정 (기본값 0 제공)
    freedMB: nativeResult.freedMB || nativeResult.freed_mb || 0,
    duration: nativeResult.duration,
    // 하위 호환성을 위한 snake_case 버전
    optimization_level: nativeResult.optimization_level || nativeResult.optimizationLevel || 0,
    freed_memory: nativeResult.freedMemory || nativeResult.freed_memory || 0,
    freed_mb: nativeResult.freedMB || nativeResult.freed_mb || 0,
  };

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
    error: nativeResult.error,
    freedMB: nativeResult.freedMB || nativeResult.freed_mb || 0,
    duration: nativeResult.duration || 0,
  };

  return result;
}
