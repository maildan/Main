/**
 * 메모리 정보 유틸리티
 *
 * 브라우저 및 시스템 메모리 정보를 제공합니다.
 */
import { MemoryInfo } from '@/types';
import { requestNativeMemoryInfo } from '../native-memory-bridge';

// 브라우저 메모리 성능 API를 위한 타입 확장
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * 현재 메모리 사용량 가져오기
 */
export async function getMemoryUsage(): Promise<MemoryInfo | null> {
  try {
    // 브라우저에서 사용 가능한 메모리 API 사용
    if (typeof window === 'undefined' || !performance || !(performance as any).memory) {
      return createEstimatedMemoryInfo();
    }

    const memory = (performance as any).memory as PerformanceMemory;

    if (!memory) {
      throw new Error('브라우저 메모리 API를 사용할 수 없습니다.');
    }

    const heap_used = memory.usedJSHeapSize;
    const heap_total = memory.totalJSHeapSize;
    const heap_limit = memory.jsHeapSizeLimit;
    const percent_used = (heap_used / heap_total) * 100;

    // RSS 추정 (정확한 값을 얻을 수 없으므로 힙 크기의 1.5배로 추정)
    const rss = Math.round(heap_total * 1.5);

    return {
      heap_used,
      heap_total,
      heap_limit,
      heap_used_mb: heap_used / (1024 * 1024),
      percent_used,
      rss,
      rss_mb: rss / (1024 * 1024),
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('메모리 정보 가져오기 오류:', err);
    return createEstimatedMemoryInfo();
  }
}

/**
 * 추정 메모리 정보 생성
 * 브라우저가 메모리 API를 지원하지 않을 때 호출됩니다.
 */
function createEstimatedMemoryInfo(): MemoryInfo {
  // 추정치로 기본값 제공
  const estimatedHeapUsed = 50 * 1024 * 1024; // 50MB
  const estimatedHeapTotal = 100 * 1024 * 1024; // 100MB
  const estimatedHeapLimit = estimatedHeapTotal * 2;
  const estimatedRss = Math.round(estimatedHeapTotal * 1.5);

  return {
    heap_used: estimatedHeapUsed,
    heap_total: estimatedHeapTotal,
    heap_limit: estimatedHeapLimit,
    heap_used_mb: Math.round((estimatedHeapUsed / (1024 * 1024)) * 10) / 10,
    rss: estimatedRss,
    rss_mb: Math.round((estimatedRss / (1024 * 1024)) * 10) / 10,
    percent_used: 50,
    timestamp: Date.now(),
  };
}

/**
 * 네이티브 모듈을 통한 메모리 정보 가져오기
 */
export async function getNativeMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    // 네이티브 모듈 연동 함수 호출
    if (
      typeof window !== 'undefined' &&
      window.__memoryOptimizer &&
      typeof window.__memoryOptimizer.checkMemoryUsage === 'function'
    ) {
      const nativeMemoryInfo = window.__memoryOptimizer.checkMemoryUsage();
      if (nativeMemoryInfo) {
        return normalizeMemoryInfo(nativeMemoryInfo);
      }
    }

    // API를 통해 가져오기
    try {
      const memoryInfo = await requestNativeMemoryInfo();
      if (memoryInfo) {
        return memoryInfo;
      }
    } catch (apiError) {
      console.debug('API를 통한 메모리 정보 가져오기 실패:', apiError);
    }

    // 네이티브 모듈 사용 불가능한 경우 브라우저 정보 반환
    return getMemoryUsage();
  } catch (error) {
    console.error('네이티브 메모리 정보 가져오기 오류:', error);
    return getMemoryUsage();
  }
}

/**
 * 메모리 정보 가져오기 (MemoryMonitor 컴포넌트와의 호환성을 위한 함수)
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  // 네이티브 브리지를 통한 요청 시도
  try {
    if (
      typeof window !== 'undefined' &&
      window.__memoryOptimizer &&
      typeof window.__memoryOptimizer.checkMemoryUsage === 'function'
    ) {
      const nativeMemoryInfo = window.__memoryOptimizer.checkMemoryUsage();
      if (nativeMemoryInfo) {
        // nativeMemoryInfo가 MemoryInfo 타입인지 확인하고, 아니라면 변환
        return normalizeMemoryInfo(nativeMemoryInfo);
      }
    }
  } catch (e) {
    console.error('Native memory info request failed:', e);
  }

  // 실패 시 브라우저 메모리 정보 반환
  const memoryInfo = await getMemoryUsage();
  return memoryInfo || createEstimatedMemoryInfo();
}

/**
 * 메모리 정보 포맷팅 함수
 */
export function formatMemoryInfo(info: MemoryInfo): string {
  if (!info) return 'Memory info not available';

  const usedMB = info.heap_used_mb.toFixed(1);
  const totalMB = (info.heap_total / (1024 * 1024)).toFixed(1);
  const percent = info.percent_used.toFixed(1);

  return `Memory: ${usedMB}MB / ${totalMB}MB (${percent}%)`;
}

/**
 * 메모리 상태 평가
 */
export function assessMemoryState(memoryInfo: MemoryInfo): 'normal' | 'warning' | 'critical' {
  const percentUsed = memoryInfo.percent_used;

  if (percentUsed > 85) {
    return 'critical';
  } else if (percentUsed > 70) {
    return 'warning';
  }

  return 'normal';
}

/**
 * 메모리 정보 정규화 (필드 이름 통일)
 */
export function normalizeMemoryInfo(info: any): MemoryInfo {
  if (!info) {
    return createEstimatedMemoryInfo();
  }

  // 기존 키가 없는 경우 대체값 제공
  return {
    heap_used: info.heapUsed || info.heap_used || 0,
    heapUsed: info.heapUsed || info.heap_used || 0,
    heap_total: info.heapTotal || info.heap_total || 0,
    heapTotal: info.heapTotal || info.heap_total || 0,
    heap_used_mb: info.heapUsedMB || info.heap_used_mb || 0,
    heapUsedMB: info.heapUsedMB || info.heap_used_mb || 0,
    rss: info.rss || 0,
    rss_mb: info.rssMB || info.rss_mb || 0,
    rssMB: info.rssMB || info.rss_mb || 0,
    percent_used: info.percentUsed || info.percent_used || 0,
    percentUsed: info.percentUsed || info.percent_used || 0,
    heap_limit: info.heapLimit || info.heap_limit || 0,
    timestamp: info.timestamp || Date.now(),
  };
}
