/**
 * 메모리 정보 관련 유틸리티
 * 메모리 사용량 정보를 가져오는 기능 제공
 */
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

/**
 * 현재 메모리 사용량 정보 얻기 (Chrome 환경)
 * @returns {MemoryInfo | null} 메모리 사용량 정보
 */
export function getMemoryInfo(): MemoryInfo | null {
  try {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const heapUsed = memoryInfo.usedJSHeapSize;
      const heapTotal = memoryInfo.totalJSHeapSize;
      const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 10) / 10;
      
      return {
        timestamp: Date.now(),
        heapUsed,
        heapTotal,
        heapLimit: memoryInfo.jsHeapSizeLimit,
        heapUsedMB,
        percentUsed: Math.round((heapUsed / heapTotal) * 100)
      };
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
    
    // jsHeapSizeLimit은 항상 사용 가능하지 않을 수 있으므로
    // totalJSHeapSize을 기준으로 계산
    return Math.round((memInfo.heapUsed / memInfo.heapTotal) * 100);
  } catch (error) {
    console.error('메모리 사용률 계산 중 오류:', error);
    return 0;
  }
}

/**
 * 메모리 사용량 정보를 가져옵니다.
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
