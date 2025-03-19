import { MemoryUsageInfo } from '../../../types/app-types';
import { MemoryInfo } from './types';

/**
 * 사용 가능한 전체 메모리 용량 추정 (Chrome 환경)
 * @returns {number} 메모리 크기 (MB)
 */
export function estimateTotalMemory(): number {
  try {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      return Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
    }
    // 브라우저에서 메모리 정보를 지원하지 않을 경우 기본값
    return 2048; // 2GB를 기본값으로 가정
  } catch (error) {
    console.error('메모리 용량 추정 중 오류:', error);
    return 1024;
  }
}

// 메모리 정보 캐싱
let cachedMemoryInfo: MemoryUsageInfo | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 1000; // 1초 동안 캐시 유지

/**
 * 현재 메모리 사용량 정보 얻기 (Chrome 환경)
 * 최적화를 위해 짧은 시간 내 반복 호출 시 캐싱된 결과 사용
 * @param {boolean} bypassCache 캐시를 무시하고 항상 새 정보 가져올지 여부
 * @returns {MemoryUsageInfo | null} 메모리 사용량 정보
 */
export function getMemoryInfo(bypassCache = false): MemoryUsageInfo | null {
  const now = Date.now();
  
  // 캐시된 정보 반환 (1초 이내 & 캐시 무시 옵션이 없는 경우)
  if (!bypassCache && cachedMemoryInfo && now - lastCacheTime < CACHE_DURATION) {
    return cachedMemoryInfo;
  }
  
  try {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const heapUsed = memoryInfo.usedJSHeapSize;
      const heapTotal = memoryInfo.totalJSHeapSize;
      const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 10) / 10;
      const percentUsed = Math.round((heapUsed / heapTotal) * 100);
      
      // 결과 캐싱
      cachedMemoryInfo = {
        heapUsed,
        heapTotal,
        heapUsedMB,
        percentUsed,
        timestamp: now
      };
      
      lastCacheTime = now;
      return cachedMemoryInfo;
    }
    return null;
  } catch (error) {
    console.error('메모리 정보 획득 중 오류:', error);
    return null;
  }
}

/**
 * 현재 메모리 사용량 상태를 백분율로 계산
 * @returns {number} 사용 비율 (0-100%)
 */
export function getMemoryUsagePercentage(): number {
  try {
    const memInfo = getMemoryInfo();
    if (!memInfo) return 0;
    
    return memInfo.percentUsed || Math.round((memInfo.heapUsed / memInfo.heapTotal) * 100);
  } catch (error) {
    console.error('메모리 사용률 계산 중 오류:', error);
    return 0;
  }
}

/**
 * 메모리 사용량 정보를 가져옵니다. (Promise 기반)
 * @returns Promise<MemoryInfo>
 */
export async function getMemoryUsage(): Promise<MemoryInfo> {
  try {
    // Electron API 사용 가능한 경우
    if (window.electronAPI && typeof window.electronAPI.getMemoryUsage === 'function') {
      return await window.electronAPI.getMemoryUsage();
    }
    
    // 일반 브라우저 환경에서는 performance API 사용
    if (window.performance && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      
      return {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
        heapUsedMB: Math.round(memory.usedJSHeapSize / (1024 * 1024) * 10) / 10,
        percentUsed: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    
    // 정보를 가져올 수 없는 경우 기본값 반환
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      unavailable: true
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      error: String(error)
    };
  }
}
