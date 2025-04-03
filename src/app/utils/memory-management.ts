/**
 * 메모리 관리 유틸리티
 * 
 * 애플리케이션 메모리 관리 기능들을 통합하여 제공합니다.
 */

import { MemoryInfo, GCResult, OptimizationResult, OptimizationLevel } from '@/types';
import { requestNativeMemoryInfo, requestNativeGarbageCollection, requestNativeMemoryOptimization } from './native-memory-bridge';

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

// 안쓰이는 변수 _formatBytes로 이름 변경
const _formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 캐시 정리 함수 - 임시 구현
function cleanAllCaches(): void {
  // 캐시 정리 로직 구현
  console.log('모든 캐시 정리');
}

// 가비지 콜렉션 유도 함수
function suggestGarbageCollection(): void {
  if (typeof window !== 'undefined' && (window as any).gc) {
    (window as any).gc();
  }
  console.log('가비지 콜렉션 제안');
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
    // 현재 메모리 상태 기록
    const memoryBefore = await requestNativeMemoryInfo();
    console.log('최적화 전 메모리 상태:', memoryBefore);

    console.log(`메모리 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`);

    // 네이티브 모듈 호출 - 숫자로 변환하여 전달
    const result = await requestNativeMemoryOptimization(Number(level), emergency);

    if (result) {
      // 속성 이름 호환성 처리 - freedMB 사용 (freed_mb가 아님)
      const freedMB = result.freedMB || result.freed_mb || 0;
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
  try {
    // 최적화 기록 로직
    if (typeof localStorage !== 'undefined') {
      const record = {
        timestamp: Date.now(),
        level,
        success,
        implementation,
        freedMemory,
      };

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
    }
  } catch (e) {
    // 저장 오류 무시
    console.warn('최적화 기록 저장 오류:', e);
  }
}

/**
 * 메모리 사용량 문자열 포맷
 * @param info 메모리 정보
 */
export function formatMemoryInfo(info: MemoryInfo): Record<string, string> {
  if (!info) return {};

  const heapUsedMB = info.heapUsed !== undefined
    ? Math.round(info.heapUsed / (1024 * 1024) * 10) / 10
    : info.heapUsedMB || 0;

  const heapTotalMB = info.heapTotal !== undefined
    ? Math.round(info.heapTotal / (1024 * 1024) * 10) / 10
    : info.heapTotalMB || 0;

  const percent = info.percentUsed !== undefined
    ? info.percentUsed
    : (info.heapTotal && info.heapUsed) ? (info.heapUsed / info.heapTotal) * 100 : 0;

  return {
    heapUsed: `${heapUsedMB} MB`,
    heapTotal: `${heapTotalMB} MB`,
    percentUsed: `${Math.round(percent * 10) / 10}%`,
    timestamp: new Date(info.timestamp || Date.now()).toLocaleString()
  };
}

/**
 * 메모리 상태 평가
 * @param info 메모리 정보
 */
export function evaluateMemoryStatus(info: MemoryInfo): {
  status: string;
  message: string;
  percentUsed: number;
  needsOptimization: boolean;
} {
  if (!info) {
    return {
      status: 'unknown',
      message: '메모리 정보를 가져올 수 없음',
      percentUsed: 0,
      needsOptimization: false
    };
  }

  const percent = info.percentUsed !== undefined
    ? info.percentUsed
    : (info.heapTotal && info.heapUsed) ? (info.heapUsed / info.heapTotal) * 100 : 0;

  if (percent > 90) {
    return {
      status: 'critical',
      message: '메모리 사용량이 매우 높음 (최적화 필요)',
      percentUsed: percent,
      needsOptimization: true
    };
  } else if (percent > 75) {
    return {
      status: 'warning',
      message: '메모리 사용량이 높음',
      percentUsed: percent,
      needsOptimization: true
    };
  } else if (percent > 60) {
    return {
      status: 'normal',
      message: '메모리 사용량이 정상',
      percentUsed: percent,
      needsOptimization: false
    };
  } else {
    return {
      status: 'good',
      message: '메모리 사용량이 낮음',
      percentUsed: percent,
      needsOptimization: false
    };
  }
}

/**
 * 빈 메모리 정보 객체 생성
 */
export function createEmptyMemoryInfo(): MemoryInfo {
  return {
    // camelCase 속성들
    heapUsed: 0,
    heapTotal: 0,
    rss: 0,
    heapUsedMB: 0,
    rssMB: 0,
    percentUsed: 0,
    timestamp: Date.now(),

    // snake_case 속성들 (Rust 호환)
    heap_used: 0,
    heap_total: 0,
    heap_used_mb: 0,
    rss_mb: 0,
    percent_used: 0,
    heap_limit: 0
  };
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
