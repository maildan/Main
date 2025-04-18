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

// 캐시 정리 함수 - 임시 구현 (미사용 변수에 _ 접두사 추가)
function _cleanAllCaches(): void {
  // 캐시 정리 로직 구현
  console.log('모든 캐시 정리');
}

// 가비지 콜렉션 유도 함수 (미사용 변수에 _ 접두사 추가)
function _suggestGarbageCollection(): void {
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
        optimization_level: level,
        freed_memory: result.freedMemory || result.freed_memory || 0,
        freed_mb: freedMB,
        duration: result.duration
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
function _recordOptimization(
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
    : 0;

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
  // 기본값 생성 (타입 오류 방지)
  const result: MemoryInfo = {
    timestamp: Date.now(),
    heap_used: 0,
    heap_total: 0,
    heap_limit: 0,
    rss: 0,
    heap_used_mb: 0,
    rss_mb: 0,
    percent_used: 0
  };

  // nativeInfo에서 있는 속성만 가져오기
  if (nativeInfo) {
    // 안전한 타입 캐스팅으로 속성 할당
    if (typeof nativeInfo.heap_used === 'number') result.heap_used = nativeInfo.heap_used;
    if (typeof nativeInfo.heapUsed === 'number') result.heapUsed = nativeInfo.heapUsed;

    if (typeof nativeInfo.heap_total === 'number') result.heap_total = nativeInfo.heap_total;
    if (typeof nativeInfo.heapTotal === 'number') result.heapTotal = nativeInfo.heapTotal;

    if (typeof nativeInfo.rss === 'number') result.rss = nativeInfo.rss;

    if (typeof nativeInfo.heap_used_mb === 'number') result.heap_used_mb = nativeInfo.heap_used_mb;
    if (typeof nativeInfo.heapUsedMB === 'number') result.heapUsedMB = nativeInfo.heapUsedMB;

    if (typeof nativeInfo.rss_mb === 'number') result.rss_mb = nativeInfo.rss_mb;
    if (typeof nativeInfo.rssMB === 'number') result.rssMB = nativeInfo.rssMB;

    if (typeof nativeInfo.percent_used === 'number') result.percent_used = nativeInfo.percent_used;
    if (typeof nativeInfo.percentUsed === 'number') result.percentUsed = nativeInfo.percentUsed;

    if (typeof nativeInfo.heap_limit === 'number') result.heap_limit = nativeInfo.heap_limit;
    if (typeof nativeInfo.heapLimit === 'number') result.heapLimit = nativeInfo.heapLimit;

    if (typeof nativeInfo.timestamp === 'number') result.timestamp = nativeInfo.timestamp;
  }

  return result;
}
