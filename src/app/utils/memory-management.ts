/**
 * 메모리 관리 유틸리티
 *
 * 애플리케이션 메모리 관리 기능들을 통합하여 제공합니다.
 */

import { MemoryInfo, GCResult, OptimizationResult, OptimizationLevel } from '@/types';
import {
  requestNativeMemoryInfo,
  requestNativeGarbageCollection,
  requestNativeMemoryOptimization,
} from './native-memory-bridge';

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
export async function performGarbageCollection(
  _emergency: boolean = false
): Promise<GCResult | null> {
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
      // 속성 이름 호환성 처리 - 일관된 속성 사용
      const freedMB = result.freedMB || result.freed_mb || 0;

      // 모든 필수 속성 지정 (타입 충돌 해결)
      return {
        success: result.success,
        optimizationLevel: level,
        timestamp: result.timestamp,
        freedMemory: result.freedMemory || result.freed_memory || 0,
        freedMB: freedMB,
        optimization_level: level, // snake_case 유지
        freed_memory: result.freedMemory || result.freed_memory || 0, // snake_case 유지
        freed_mb: freedMB, // snake_case 유지
        duration: result.duration,
      };
    }

    return null;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
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
      const records = existingRecordsJson ? JSON.parse(existingRecordsJson) : [];

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
export function formatMemoryInfo(info: MemoryInfo | null): Record<string, string> {
  if (!info) return {};

  const heapUsedMB =
    info.heapUsedMB !== undefined
      ? info.heapUsedMB
      : info.heapUsed
        ? Math.round((info.heapUsed / (1024 * 1024)) * 10) / 10
        : 0;

  const heapTotalMB =
    info.heapTotal !== undefined
      ? Math.round((info.heapTotal / (1024 * 1024)) * 10) / 10
      : 0;

  const percent =
    info.percentUsed !== undefined
      ? info.percentUsed
      : info.heapTotal && info.heapUsed
        ? (info.heapUsed / info.heapTotal) * 100
        : 0;

  return {
    heapUsed: `${heapUsedMB.toFixed(1)} MB`,
    heapTotal: `${heapTotalMB.toFixed(1)} MB`,
    percentUsed: `${Math.round(percent * 10) / 10}%`,
    timestamp: new Date(info.timestamp || Date.now()).toLocaleString(),
  };
}

/**
 * 메모리 상태 평가
 * @param info 메모리 정보
 */
export function evaluateMemoryStatus(info: MemoryInfo | null): {
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
      needsOptimization: false,
    };
  }

  const percent =
    info.percentUsed !== undefined
      ? info.percentUsed
      : info.heapTotal && info.heapUsed
        ? (info.heapUsed / info.heapTotal) * 100
        : 0;

  if (percent > 90) {
    return {
      status: 'critical',
      message: '메모리 사용량이 매우 높음 (최적화 필요)',
      percentUsed: percent,
      needsOptimization: true,
    };
  } else if (percent > 75) {
    return {
      status: 'warning',
      message: '메모리 사용량이 높음',
      percentUsed: percent,
      needsOptimization: true,
    };
  } else if (percent > 60) {
    return {
      status: 'normal',
      message: '메모리 사용량이 정상',
      percentUsed: percent,
      needsOptimization: false,
    };
  } else {
    return {
      status: 'good',
      message: '메모리 사용량이 낮음',
      percentUsed: percent,
      needsOptimization: false,
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
  };
}

/**
 * 네이티브 메모리 정보를 앱 메모리 정보로 변환
 */
export function convertNativeMemoryInfo(nativeInfo: Record<string, unknown>): MemoryInfo {
  if (!nativeInfo) {
    return createEmptyMemoryInfo();
  }

  const heapUsed = (nativeInfo.heap_used as number) || (nativeInfo.heapUsed as number) || 0;
  const heapTotal = (nativeInfo.heap_total as number) || (nativeInfo.heapTotal as number) || 0;
  const rss = (nativeInfo.rss as number) || 0;
  const heapUsedMB = (nativeInfo.heap_used_mb as number) || (nativeInfo.heapUsedMB as number) || 0;
  const rssMB = (nativeInfo.rss_mb as number) || (nativeInfo.rssMB as number) || 0;
  const percentUsed = (nativeInfo.percent_used as number) || (nativeInfo.percentUsed as number) || 0;

  return {
    timestamp: (nativeInfo.timestamp as number) || Date.now(),
    heapUsed: heapUsed,
    heapTotal: heapTotal,
    rss: rss,
    heapUsedMB: heapUsedMB,
    rssMB: rssMB,
    percentUsed: percentUsed,
  };
}
