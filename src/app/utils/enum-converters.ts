/**
 * 최적화 레벨 열거형 변환 유틸리티
 */
import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';

// 열거형 값 매핑 테이블 (더 안전한 방식)
const APP_TO_NATIVE_LEVEL_MAP: Record<AppOptimizationLevel, NativeOptimizationLevel> = {
  [AppOptimizationLevel.NONE]: NativeOptimizationLevel.Normal,
  [AppOptimizationLevel.LOW]: NativeOptimizationLevel.Low,
  [AppOptimizationLevel.MEDIUM]: NativeOptimizationLevel.Medium,
  [AppOptimizationLevel.HIGH]: NativeOptimizationLevel.High,
  [AppOptimizationLevel.EXTREME]: NativeOptimizationLevel.Critical
};

const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, AppOptimizationLevel> = {
  [NativeOptimizationLevel.Normal]: AppOptimizationLevel.NONE,
  [NativeOptimizationLevel.Low]: AppOptimizationLevel.LOW,
  [NativeOptimizationLevel.Medium]: AppOptimizationLevel.MEDIUM,
  [NativeOptimizationLevel.High]: AppOptimizationLevel.HIGH,
  [NativeOptimizationLevel.Critical]: AppOptimizationLevel.EXTREME
};

/**
 * 애플리케이션 OptimizationLevel을 네이티브 OptimizationLevel로 변환
 */
export function toNativeOptimizationLevel(level: AppOptimizationLevel): NativeOptimizationLevel {
  // 매핑 테이블에서 바로 조회 (더 안전하고 직관적임)
  const nativeLevel = APP_TO_NATIVE_LEVEL_MAP[level];
  
  // 매핑 테이블에 없는 경우 기본값 반환
  if (nativeLevel === undefined) {
    console.warn(`알 수 없는 최적화 레벨 (${level}), 기본값 사용`);
    return NativeOptimizationLevel.Medium;
  }
  
  return nativeLevel;
}

/**
 * 네이티브 OptimizationLevel을 애플리케이션 OptimizationLevel로 변환
 */
export function toAppOptimizationLevel(level: NativeOptimizationLevel): AppOptimizationLevel {
  // 매핑 테이블에서 바로 조회 (더 안전하고 직관적임)
  const appLevel = NATIVE_TO_APP_LEVEL_MAP[level];
  
  // 매핑 테이블에 없는 경우 기본값 반환
  if (appLevel === undefined) {
    console.warn(`알 수 없는 네이티브 최적화 레벨 (${level}), 기본값 사용`);
    return AppOptimizationLevel.MEDIUM;
  }
  
  return appLevel;
}

/**
 * 숫자를 적절한 최적화 레벨로 안전하게 변환
 */
export function safeOptimizationLevel(level: number): AppOptimizationLevel {
  switch (level) {
    case 0: return AppOptimizationLevel.NONE as AppOptimizationLevel;
    case 1: return AppOptimizationLevel.LOW as AppOptimizationLevel;
    case 2: return AppOptimizationLevel.MEDIUM as AppOptimizationLevel;
    case 3: return AppOptimizationLevel.HIGH as AppOptimizationLevel;
    case 4: return AppOptimizationLevel.EXTREME as AppOptimizationLevel;
    default:
      console.warn(`유효하지 않은 최적화 레벨 (${level}), 기본값 사용`);
      return AppOptimizationLevel.MEDIUM as AppOptimizationLevel;
  }
}

/**
 * 타입 변환 유틸리티 - 네이티브 메모리 정보를 앱 메모리 정보로 변환
 */
export function convertNativeMemoryInfo(nativeInfo: any): any {
  if (!nativeInfo) return null;
  
  return {
    timestamp: nativeInfo.timestamp || Date.now(),
    heap_used: nativeInfo.heap_used,
    heapUsed: nativeInfo.heap_used,
    heap_total: nativeInfo.heap_total,
    heapTotal: nativeInfo.heap_total,
    heap_used_mb: nativeInfo.heap_used_mb,
    heapUsedMB: nativeInfo.heap_used_mb,
    rss: nativeInfo.rss,
    rss_mb: nativeInfo.rss_mb,
    rssMB: nativeInfo.rss_mb,
    percent_used: nativeInfo.percent_used,
    percentUsed: nativeInfo.percent_used,
    heap_limit: nativeInfo.heap_limit,
    heapLimit: nativeInfo.heap_limit
  };
}

/**
 * 타입 변환 유틸리티 - 네이티브 GC 결과를 앱 GC 결과로 변환
 */
export function convertNativeGCResult(nativeResult: any): any {
  if (!nativeResult) return null;
  
  return {
    success: nativeResult.success,
    timestamp: nativeResult.timestamp || Date.now(),
    freedMemory: nativeResult.freed_memory,
    freed_memory: nativeResult.freed_memory,
    freedMB: nativeResult.freed_mb,
    freed_mb: nativeResult.freed_mb,
    error: nativeResult.error
  };
}
