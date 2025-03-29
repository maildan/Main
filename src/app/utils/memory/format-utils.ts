/**
 * 메모리 포맷팅 유틸리티
 */
import { MemoryUsageInfo } from './types';

// 고유한 이름으로 변경하여 중복 방지
export interface MemoryInfoFormat {
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  rss: number;
  rssMB: number;
  percentUsed: number;
  timestamp: number;
}

/**
 * 바이트 단위 포맷팅
 * @param bytes 바이트 수
 * @param decimals 소수점 자릿수
 * @returns 포맷팅된 문자열
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 메모리 정보 포맷팅 (고유한 이름으로 변경)
 * @param memoryInfo 메모리 정보 객체
 * @returns 포맷팅된 메모리 정보
 */
export function formatMemoryData(memoryInfo: Partial<MemoryInfoFormat>): string {
  if (!memoryInfo) return 'No memory data';
  
  const heapUsedMB = memoryInfo.heapUsedMB ?? 
    (memoryInfo.heapUsed ? memoryInfo.heapUsed / (1024 * 1024) : 0);
  
  const heapTotalMB = memoryInfo.heapTotal ? memoryInfo.heapTotal / (1024 * 1024) : 0;
  
  return `Used: ${heapUsedMB.toFixed(2)} MB / Total: ${heapTotalMB.toFixed(2)} MB (${memoryInfo.percentUsed?.toFixed(1) || 0}%)`;
}

/**
 * 네이티브 메모리 정보를 앱 형식으로 변환
 * @param nativeInfo 네이티브 메모리 정보
 * @returns 변환된 메모리 정보
 */
export function convertNativeMemoryInfo(nativeInfo: any): MemoryInfoFormat {
  if (!nativeInfo) {
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapUsedMB: 0,
      rss: 0,
      rssMB: 0,
      percentUsed: 0,
      timestamp: Date.now()
    };
  }

  // 네이티브(snake_case)에서 camelCase로 속성 이름 변환
  return {
    heapUsed: nativeInfo.heap_used || 0,
    heapTotal: nativeInfo.heap_total || 0,
    heapUsedMB: nativeInfo.heap_used_mb || 0,
    rss: nativeInfo.rss || 0,
    rssMB: nativeInfo.rss_mb || 0,
    percentUsed: nativeInfo.percent_used || 0,
    timestamp: nativeInfo.timestamp || Date.now()
  };
}
