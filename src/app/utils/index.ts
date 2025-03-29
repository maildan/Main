/**
 * 유틸리티 통합 내보내기
 */

// 선택적 명시적 내보내기로 모호함 해결
export { formatDate } from './date-utils';
export { truncate as truncateText, stripHtml as sanitizeHtml } from './string-utils'; // 'sanitizeText' 대신 실제 함수인 'stripHtml' 사용

// 명시적 이름 지정으로 중복 방지
export { formatBytes as formatBytesSize } from './common-utils';

// 메모리 관련 유틸리티 
// 'cleanupDom', 'cleanupCache', 'optimizeResources' 함수는 'memory/index.ts'에서 가져옵니다
// 이렇게 하면 'memory/optimization-utils'의 문제를 피할 수 있습니다
export { 
  cleanupDom, 
  cleanupCache, 
  optimizeResources 
} from './memory';

// 중복되는 내보내기를 별칭으로 지정
export { 
  convertNativeMemoryInfo as convertMemoryInfo 
} from './memory';

// window-utils 대체 구현
export const setupFullscreenListeners = () => {};
export const exitFullscreen = () => {};

// 타입 정의 영역 추가
import { MemoryInfo } from '@/types';

// 메모리 옵티마이저 인터페이스 정의
interface MemoryOptimizer {
  suggestGarbageCollection: () => void;
  requestGC: (emergency?: boolean) => Promise<any>;
  clearBrowserCaches: () => Promise<boolean>;
  clearStorageCaches: () => boolean;
  checkMemoryUsage: () => Record<string, any> | null;
  forceGC: () => boolean;
  getMemoryUsagePercentage: () => Promise<number>;
  getMemoryInfo: () => Promise<Partial<MemoryInfo>>;
  optimizeMemory: (aggressive?: boolean) => Promise<any>;
}

/**
 * 메모리 옵티마이저 초기화
 */
export function setupMemoryOptimizer() {
  if (typeof window === 'undefined') return;
  
  // 추가 구현 필요 시 여기에 코드 추가
}

// 메모리 정보 얻기 함수
export async function getMemoryInfo() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    if (window.__memoryOptimizer?.getMemoryInfo) {
      return await window.__memoryOptimizer.getMemoryInfo();
    }
    
    // 브라우저 기본 메모리 정보 가져오기
    const memoryInfo = {} as Partial<MemoryInfo>;
    
    // performance.memory가 있는 경우 (Chrome)
    if (performance && (performance as any).memory) {
      const memoryUsage = (performance as any).memory as Record<string, number>;
      
      // 안전한 타입 변환을 위해 unknown을 거쳐서 변환
      memoryInfo.heapUsed = (memoryUsage as unknown as Record<string, number>).usedJSHeapSize;
      memoryInfo.heapTotal = (memoryUsage as unknown as Record<string, number>).totalJSHeapSize;
      memoryInfo.heapLimit = (memoryUsage as unknown as Record<string, number>).jsHeapSizeLimit;
    }
    
    // MB 단위 계산
    if (memoryInfo.heapUsed !== undefined) {
      memoryInfo.heapUsedMB = memoryInfo.heapUsed / (1024 * 1024);
    }
    
    // 사용 비율 계산
    if (memoryInfo.heapUsed !== undefined && memoryInfo.heapTotal !== undefined) {
      memoryInfo.percentUsed = (memoryInfo.heapUsed / memoryInfo.heapTotal) * 100;
    }
    
    return memoryInfo;
  } catch (error) {
    console.error('메모리 정보 얻기 실패:', error);
    return null;
  }
}

// 메모리 사용량 백분율 가져오기
export async function getMemoryUsagePercentage(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  
  try {
    if (window.__memoryOptimizer?.getMemoryUsagePercentage) {
      const result = await window.__memoryOptimizer.getMemoryUsagePercentage();
      return result || 0; // undefined일 경우 0 반환
    }
    
    const memInfo = await getMemoryInfo();
    return memInfo && memInfo.percentUsed !== undefined ? memInfo.percentUsed : 0;
  } catch (error) {
    console.error('메모리 사용량 백분율 가져오기 실패:', error);
    return 0;
  }
}

// 메모리 최적화 수행
export async function optimizeMemory(aggressive = false) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window is not defined' };
  }
  
  try {
    if (window.__memoryOptimizer?.optimizeMemory) {
      return await window.__memoryOptimizer.optimizeMemory(aggressive);
    }
    
    // 기본 최적화 수행
    await requestIdleCallback();
    return { success: true };
  } catch (error) {
    console.error('메모리 최적화 실패:', error);
    return { success: false, error: String(error) };
  }
}

// requestIdleCallback polyfill
function requestIdleCallback(timeout = 1000): Promise<void> {
  return new Promise(resolve => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => resolve(), { timeout });
    } else {
      setTimeout(resolve, 100);
    }
  });
}

// 캐시 정리 도우미 함수들
export function clearObjectUrlCache() {
  if (typeof window === 'undefined') return false;
  
  try {
    if (window.__objectUrls) {
      window.__objectUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // 무시
        }
      });
      window.__objectUrls.clear();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Object URL 캐시 정리 실패:', err);
    return false;
  }
}

export function clearImageCache() {
  if (typeof window === 'undefined') return false;
  
  try {
    if (window.__imageResizeCache) {
      window.__imageResizeCache = new Map();
      return true;
    }
    return false;
  } catch (err) {
    console.error('이미지 캐시 정리 실패:', err);
    return false;
  }
}

export function getMemoryUsage(): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    if (performance && (performance as any).memory) {
      const memUsage = (performance as any).memory;
      
      if (memUsage) {
        return {
          totalJSHeapSize: memUsage.totalJSHeapSize,
          usedJSHeapSize: memUsage.usedJSHeapSize,
          jsHeapSizeLimit: memUsage.jsHeapSizeLimit,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('메모리 사용량 가져오기 실패:', e);
    return null;
  }
}
