/**
 * 메모리 정보 유틸리티
 *
 * 브라우저 및 시스템 메모리 정보를 제공합니다.
 */
import { MemoryInfo } from '@/types';
import { requestNativeMemoryInfo } from '../native-memory-bridge';
import { bytesToMB } from './format-utils';

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

    const heapUsed = memory.usedJSHeapSize;
    const heapTotal = memory.totalJSHeapSize;
    const percentUsed = (heapUsed / heapTotal) * 100;

    // RSS 추정 (정확한 값을 얻을 수 없으므로 힙 크기의 1.5배로 추정)
    const rss = Math.round(heapTotal * 1.5);

    return {
      timestamp: Date.now(),
      heapUsed,
      heapTotal,
      rss,
      heapUsedMB: heapUsed / (1024 * 1024),
      rssMB: rss / (1024 * 1024),
      percentUsed,
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
  const estimatedTotalHeap = 100 * 1024 * 1024; // 100MB
  const estimatedRss = Math.round(estimatedTotalHeap * 1.5);

  return {
    timestamp: Date.now(),
    heapUsed: estimatedHeapUsed,
    heapTotal: estimatedTotalHeap,
    rss: estimatedRss,
    heapUsedMB: Math.round((estimatedHeapUsed / (1024 * 1024)) * 10) / 10,
    rssMB: Math.round((estimatedRss / (1024 * 1024)) * 10) / 10,
    percentUsed: 50,
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

  const usedMB = (info.heapUsedMB ?? 0).toFixed(1);
  const totalMB = (info.heapTotal ? bytesToMB(info.heapTotal) : 0).toFixed(1);
  const percent = (info.percentUsed ?? 0).toFixed(1);

  return `Memory: ${usedMB}MB / ${totalMB}MB (${percent}%)`;
}

/**
 * 메모리 상태 평가
 */
export function assessMemoryState(memoryInfo: MemoryInfo): 'normal' | 'warning' | 'critical' {
  const percentUsed = memoryInfo.percentUsed ?? 0;

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
    timestamp: info.timestamp || Date.now(),
    heapUsed: info.heapUsed || info.heap_used || 0,
    heapTotal: info.heapTotal || info.heap_total || 0,
    rss: info.rss || 0,
    heapUsedMB: info.heapUsedMB || info.heap_used_mb || 0,
    rssMB: info.rssMB || info.rss_mb || 0,
    percentUsed: info.percentUsed || info.percent_used || 0,
  };
}

export function formatMemoryUsage(info: MemoryInfo | null): string {
  if (!info) return 'N/A';

  const usedMB = (info.heapUsedMB ?? 0).toFixed(1);
  const totalMB = (info.heapTotal ? bytesToMB(info.heapTotal) : 0).toFixed(1);
  const percent = (info.percentUsed ?? 0).toFixed(1);

  return `사용량: ${usedMB} MB / ${totalMB} MB (${percent}%)`;
}

export function getMemoryStatus(info: MemoryInfo | null): 'normal' | 'warning' | 'critical' {
  if (!info) return 'normal';

  const percentUsed = info.percentUsed ?? 0;
  if (percentUsed > 85) {
    return 'critical';
  } else if (percentUsed > 70) {
    return 'warning';
  }

  return 'normal';
}
