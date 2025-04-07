/**
 * 메모리 정보 수집 및 처리 유틸리티
 */

import { MemoryInfo } from '@/types';
import { requestNativeMemoryInfo } from '../native-memory-bridge';

/**
 * 현재 메모리 사용량 정보를 가져옵니다.
 * @returns Promise<MemoryInfo | null> 메모리 정보 또는 null
 */
export async function getMemoryUsage(): Promise<MemoryInfo | null> {
  try {
    // 네이티브 모듈에서 메모리 정보 가져오기 시도
    const nativeInfo = await requestNativeMemoryInfo();

    if (nativeInfo) {
      return formatMemoryInfo(nativeInfo);
    }

    // 네이티브 정보가 없으면 브라우저 API 사용
    return getBrowserMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);

    // 오류 시 브라우저 API 시도
    return getBrowserMemoryInfo();
  }
}

/**
 * 브라우저 API를 사용하여 메모리 정보 가져오기
 * @returns MemoryInfo | null
 */
function getBrowserMemoryInfo(): MemoryInfo | null {
  // 브라우저 환경이 아니면 null 반환
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return null;
  }

  try {
    // Chrome의 performance.memory API 사용 시도
    const memoryInfo = (performance as any).memory;

    if (!memoryInfo) {
      return createEmptyMemoryInfo();
    }

    const heapUsed = memoryInfo.usedJSHeapSize || 0;
    const heapTotal = memoryInfo.totalJSHeapSize || 0;
    const heapLimit = memoryInfo.jsHeapSizeLimit || 0;

    return {
      heap_used: heapUsed,
      heapUsed,
      heap_total: heapTotal,
      heapTotal,
      heap_limit: heapLimit,
      heapLimit,
      rss: 0, // 브라우저에서는 이 정보를 가져올 수 없음
      external: 0,
      array_buffers: 0,
      heap_used_mb: heapUsed / (1024 * 1024),
      heapUsedMB: heapUsed / (1024 * 1024),
      rss_mb: 0,
      rssMB: 0,
      percent_used: heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0,
      percentUsed: heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0,
      timestamp: Date.now()
    };
  } catch (error) {
    console.warn('브라우저 메모리 정보 가져오기 오류:', error);
    return createEmptyMemoryInfo();
  }
}

/**
 * 메모리 정보 가져오기 (별칭 - getMemoryUsage)
 */
export const getMemoryInfo = getMemoryUsage;

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
export function formatMemoryInfo(info: any): MemoryInfo {
  if (!info) return createEmptyMemoryInfo();

  // snake_case와 camelCase 필드 모두 처리
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
 * 메모리 상태 평가
 * @param info 메모리 정보
 */
export function assessMemoryState(info: MemoryInfo | null): {
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  needsOptimization: boolean;
} {
  if (!info) {
    return {
      level: 'medium',
      message: '메모리 정보를 가져올 수 없음',
      needsOptimization: false
    };
  }

  const percent = info.percent_used || 0;

  if (percent > 90) {
    return {
      level: 'critical',
      message: '메모리 사용량이 매우 높음 (최적화 필요)',
      needsOptimization: true
    };
  } else if (percent > 75) {
    return {
      level: 'high',
      message: '메모리 사용량이 높음 (최적화 권장)',
      needsOptimization: true
    };
  } else if (percent > 60) {
    return {
      level: 'medium',
      message: '메모리 사용량이 보통',
      needsOptimization: false
    };
  } else {
    return {
      level: 'low',
      message: '메모리 사용량이 낮음',
      needsOptimization: false
    };
  }
}

/**
 * 네이티브 메모리 정보를 표준 형식으로 변환
 * @param nativeInfo 네이티브 메모리 정보
 */
export function convertNativeMemoryInfo(nativeInfo: Record<string, unknown>): MemoryInfo {
  // 기본값 생성
  const result: MemoryInfo = {
    timestamp: Date.now(),
    heap_used: 0,
    heap_total: 0,
    heap_limit: 0,
    rss: 0,
    heap_used_mb: 0,
    rss_mb: 0,
    percent_used: 0
  };

  // nativeInfo에서 있는 속성만 가져오기
  if (nativeInfo) {
    // 안전한 타입 캐스팅으로 속성 할당
    if (typeof nativeInfo.heap_used === 'number') result.heap_used = nativeInfo.heap_used;
    if (typeof nativeInfo.heapUsed === 'number') result.heapUsed = nativeInfo.heapUsed;

    if (typeof nativeInfo.heap_total === 'number') result.heap_total = nativeInfo.heap_total;
    if (typeof nativeInfo.heapTotal === 'number') result.heapTotal = nativeInfo.heapTotal;

    if (typeof nativeInfo.rss === 'number') result.rss = nativeInfo.rss;

    if (typeof nativeInfo.heap_used_mb === 'number') result.heap_used_mb = nativeInfo.heap_used_mb;
    if (typeof nativeInfo.heapUsedMB === 'number') result.heapUsedMB = nativeInfo.heapUsedMB;

    if (typeof nativeInfo.rss_mb === 'number') result.rss_mb = nativeInfo.rss_mb;
    if (typeof nativeInfo.rssMB === 'number') result.rssMB = nativeInfo.rssMB;

    if (typeof nativeInfo.percent_used === 'number') result.percent_used = nativeInfo.percent_used;
    if (typeof nativeInfo.percentUsed === 'number') result.percentUsed = nativeInfo.percentUsed;

    if (typeof nativeInfo.heap_limit === 'number') result.heap_limit = nativeInfo.heap_limit;
    if (typeof nativeInfo.timestamp === 'number') result.timestamp = nativeInfo.timestamp;
  }

  return result;
}
