/**
 * 메모리 관리 유틸리티
 * 
 * 애플리케이션 메모리 관리 기능들을 통합하여 제공합니다.
 */

import { MemoryInfo, GCResult, OptimizationResult, OptimizationLevel } from '@/types';
import { requestNativeMemoryInfo, requestNativeGarbageCollection, requestNativeMemoryOptimization } from './native-memory-bridge';
import { cleanAllCaches, suggestGarbageCollection } from './memory/gc-utils';
import { formatBytes } from './memory/format-utils';

/**
 * 메모리 정보 가져오기
 */
export async function getMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    return await requestNativeMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 가비지 컬렉션 수행
 * @param _emergency 긴급 모드 여부
 */
export async function performGarbageCollection(_emergency: boolean = false): Promise<GCResult | null> {
  try {
    return await requestNativeGarbageCollection();
  } catch (error) {
    console.error('가비지 컬렉션 오류:', error);
    return null;
  }
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 */
export async function optimizeMemory(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<OptimizationResult | null> {
  try {
    // 현재 메모리 상태 기록 - 사용 추가
    const memoryBefore = await requestNativeMemoryInfo();
    console.log('최적화 전 메모리 상태:', memoryBefore);
    
    console.log(`메모리 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`);
    
    // 네이티브 모듈 호출
    const result = await requestNativeMemoryOptimization(level, emergency);
    
    if (result) {
      // 속성 이름 호환성 처리 - freed_mb 사용 (인터페이스와 일치)
      const freedMB = result.freed_mb || 0;
      recordOptimization(level, result.success, 'native', freedMB);
    }
    
    // JS 측 추가 정리
    cleanAllCaches();
    suggestGarbageCollection();
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    recordOptimization(level, false, 'native', 0);
    return null;
  }
}

/**
 * 최적화 기록
 * @param level 최적화 레벨
 * @param success 성공 여부
 * @param implementation 구현 ('native' 또는 'js')
 * @param freedMemory 해제된 메모리 (MB)
 */
function recordOptimization(
  level: OptimizationLevel, 
  success: boolean,
  implementation: string,
  freedMemory: number
): void {
  const record = {
    timestamp: Date.now(),
    level,
    success,
    implementation,
    freedMemory
  };
  
  console.log(`메모리 최적화 완료: ${success ? '성공' : '실패'}, ${freedMemory}MB 해제됨`);
  
  // 브라우저 환경에서는 로컬 스토리지에 기록 저장 가능
  if (typeof localStorage !== 'undefined') {
    try {
      // 기존 기록 가져오기
      const existingRecordsJson = localStorage.getItem('memoryOptimizationRecords');
      const records = existingRecordsJson 
        ? JSON.parse(existingRecordsJson) 
        : [];
      
      // 최대 20개까지만 저장
      records.push(record);
      if (records.length > 20) {
        records.shift();
      }
      
      // 저장
      localStorage.setItem('memoryOptimizationRecords', JSON.stringify(records));
    } catch (error) {
      // 저장 오류 무시
      console.warn('최적화 기록 저장 오류:', error);
    }
  }
}

/**
 * 메모리 사용량 문자열 포맷
 * @param info 메모리 정보
 */
export function formatMemoryInfo(info: MemoryInfo): Record<string, string> {
  return {
    heapUsed: formatBytes(info.heapUsed),
    heapTotal: formatBytes(info.heapTotal),
    rss: formatBytes(info.rss),
    percentUsed: `${info.percentUsed.toFixed(1)}%`
  };
}

/**
 * 메모리 상태 평가
 * @param info 메모리 정보
 */
export function assessMemoryState(info: MemoryInfo): {
  status: 'normal' | 'warning' | 'critical';
  color: string;
  message: string;
} {
  const percent = info.percentUsed;
  
  if (percent >= 90) {
    return {
      status: 'critical',
      color: '#ff4d4f',
      message: '메모리 사용량이 매우 높습니다. 최적화가 필요합니다.'
    };
  } else if (percent >= 75) {
    return {
      status: 'warning',
      color: '#faad14',
      message: '메모리 사용량이 높아지고 있습니다.'
    };
  } else {
    return {
      status: 'normal',
      color: '#52c41a',
      message: '메모리 사용량이 정상 범위입니다.'
    };
  }
}

/**
 * 네이티브 메모리 정보를 표준 형식으로 변환
 * @param nativeInfo 네이티브 메모리 정보
 */
export function convertNativeMemoryInfo(nativeInfo: Record<string, unknown>): MemoryInfo {
  // any 타입 사용이 불가피한 경우 (네이티브 모듈 응답 형식이 다양할 수 있음)
  return {
    heapUsed: nativeInfo.heap_used || nativeInfo.heapUsed || 0,
    heapTotal: nativeInfo.heap_total || nativeInfo.heapTotal || 0,
    rss: nativeInfo.rss || 0,
    heapUsedMB: nativeInfo.heap_used_mb || nativeInfo.heapUsedMB || 0,
    rssMB: nativeInfo.rss_mb || nativeInfo.rssMB || 0,
    percentUsed: nativeInfo.percent_used || nativeInfo.percentUsed || 0,
    timestamp: nativeInfo.timestamp || Date.now(),
    
    // 하위 호환성을 위한 snake_case 필드
    heap_used: nativeInfo.heap_used || nativeInfo.heapUsed || 0,
    heap_total: nativeInfo.heap_total || nativeInfo.heapTotal || 0,
    heap_used_mb: nativeInfo.heap_used_mb || nativeInfo.heapUsedMB || 0,
    rss_mb: nativeInfo.rss_mb || nativeInfo.rssMB || 0,
    percent_used: nativeInfo.percent_used || nativeInfo.percentUsed || 0,
    heap_limit: nativeInfo.heap_limit
  };
}
