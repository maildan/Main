/**
 * 메모리 정보 유틸리티
 * 
 * 브라우저 및 시스템 메모리 정보를 제공합니다.
 */
import { MemoryInfo } from '@/types';
import { requestNativeMemoryInfo } from '../native-memory-bridge';

/**
 * 현재 메모리 사용량 가져오기
 */
export async function getMemoryUsage(): Promise<MemoryInfo | null> {
  try {
    // 브라우저에서 사용 가능한 메모리 API 사용
    if (typeof window === 'undefined' || !performance || !performance.memory) {
      return createEstimatedMemoryInfo();
    }
    
    const { 
      usedJSHeapSize, 
      totalJSHeapSize, 
      jsHeapSizeLimit 
    } = performance.memory as MemoryInfo;
    
    const heap_used = usedJSHeapSize;
    const heap_total = totalJSHeapSize;
    const heap_limit = jsHeapSizeLimit;
    const percent_used = (heap_used / heap_total) * 100;
    
    // RSS 추정 (정확한 값을 얻을 수 없으므로 힙 크기의 1.5배로 추정)
    const rss = Math.round(heap_total * 1.5);
    
    return {
      heap_used,
      heapUsed: heap_used,
      heap_total,
      heapTotal: heap_total,
      heap_used_mb: Math.round(heap_used / (1024 * 1024) * 10) / 10,
      heapUsedMB: Math.round(heap_used / (1024 * 1024) * 10) / 10,
      rss,
      rss_mb: Math.round(rss / (1024 * 1024) * 10) / 10,
      rssMB: Math.round(rss / (1024 * 1024) * 10) / 10,
      percent_used: Math.round(percent_used * 10) / 10,
      percentUsed: Math.round(percent_used * 10) / 10,
      heap_limit: heap_limit,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return createEstimatedMemoryInfo();
  }
}

/**
 * 추정 메모리 정보 생성
 * 브라우저가 메모리 API를 지원하지 않을 때 호출됩니다.
 */
function createEstimatedMemoryInfo(): MemoryInfo {
  // 기본값으로 추정된 값 반환
  const estimatedHeapTotal = 128 * 1024 * 1024; // 128MB
  const estimatedHeapUsed = estimatedHeapTotal * 0.6; // 60% 사용
  
  return {
    heap_used: estimatedHeapUsed,
    heapUsed: estimatedHeapUsed,
    heap_total: estimatedHeapTotal,
    heapTotal: estimatedHeapTotal,
    heap_used_mb: Math.round(estimatedHeapUsed / (1024 * 1024) * 10) / 10,
    heapUsedMB: Math.round(estimatedHeapUsed / (1024 * 1024) * 10) / 10,
    rss: estimatedHeapTotal * 1.5,
    rss_mb: Math.round(estimatedHeapTotal * 1.5 / (1024 * 1024) * 10) / 10,
    rssMB: Math.round(estimatedHeapTotal * 1.5 / (1024 * 1024) * 10) / 10,
    percent_used: 60,
    percentUsed: 60,
    heap_limit: estimatedHeapTotal * 2,
    timestamp: Date.now()
  };
}

/**
 * 네이티브 모듈을 통한 메모리 정보 가져오기
 */
export async function getNativeMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    // 네이티브 모듈 연동 함수 호출
    if (typeof window !== 'undefined' && window.__memoryOptimizer?.getMemoryInfo) {
      return await window.__memoryOptimizer.getMemoryInfo();
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
 * 내부적으로 getMemoryUsage를 사용합니다.
 */
export async function getMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    // 브라우저 환경에서는 getMemoryUsage 사용
    if (typeof window !== 'undefined') {
      return await getMemoryUsage();
    }
    
    // 서버 환경에서는 네이티브 모듈에서 직접 요청
    return await requestNativeMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}
