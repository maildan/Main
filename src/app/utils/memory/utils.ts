/**
 * 메모리 유틸리티 함수 모음
 */

// 잘못된 임포트 수정
import { requestGC } from './gc-utils'; // suggestGC 대신 requestGC 사용
import { clearWidgetCache } from './gc/resource-optimizer'; // clearImageCaches를 올바른 함수명으로 수정
import { clearUnusedImages } from './gc/dom-cleanup';
import { MemoryInfo } from '@/types';

/**
 * 메모리 관련 리소스 정리
 * @returns 정리 완료 여부
 */
export function cleanupResources(): boolean {
  try {
    // 이미지 캐시 정리 (함수명 수정)
    clearWidgetCache();

    // 사용하지 않는 이미지 정리
    clearUnusedImages();

    // 가비지 컬렉션 제안 (함수 수정)
    requestGC();

    return true;
  } catch (error) {
    console.error('리소스 정리 중 오류 발생:', error);
    return false;
  }
}

/**
 * 메모리 정보 객체 생성
 * @returns 기본 메모리 정보 객체
 */
export function createMemoryInfo(): MemoryInfo {
  return {
    timestamp: Date.now(),
    heap_used: 0,
    heap_total: 0,
    heap_limit: 0,
    rss: 0,
    heap_used_mb: 0,
    rss_mb: 0,
    percent_used: 0
  };
}

/**
 * 메모리 사용 비율 계산
 * @param memoryInfo 메모리 정보 객체
 * @returns 메모리 사용 비율 (0-100)
 */
export function getMemoryUsagePercentage(memoryInfo?: MemoryInfo | null): number {
  if (!memoryInfo) {
    return 0;
  }

  return memoryInfo.percent_used ||
    (memoryInfo.heap_used && memoryInfo.heap_total ?
      (memoryInfo.heap_used / memoryInfo.heap_total) * 100 : 0);
}

/**
 * 주기적인 모니터링 설정
 * @param callback 모니터링 콜백
 * @param interval 체크 간격 (ms)
 * @returns 모니터링 중지 함수
 */
export function setupPeriodicMonitoring(
  callback: () => void,
  interval: number = 30000
): () => void {
  if (typeof window === 'undefined') {
    return () => { };
  }

  const timerId = setInterval(callback, interval);

  return () => {
    clearInterval(timerId);
  };
}

/**
 * 사용 가능한 메모리 체크 
 * @param requiredMB 필요한 메모리 (MB)
 * @returns 메모리가 충분한지 여부
 */
export function hasEnoughMemory(requiredMB: number): boolean {
  if (typeof performance === 'undefined' ||
    !(performance as any).memory) {
    return true; // 메모리 정보를 알 수 없는 경우 기본적으로 true 반환
  }

  try {
    const memoryInfo = (performance as any).memory;
    const usedHeapSizeMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
    const totalHeapSizeMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
    const availableMB = totalHeapSizeMB - usedHeapSizeMB;

    return availableMB >= requiredMB;
  } catch (error) {
    console.warn('메모리 정보 조회 오류:', error);
    return true; // 오류 발생 시 기본적으로 true 반환
  }
}
