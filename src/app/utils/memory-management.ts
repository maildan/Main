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
  // 값 존재 여부 확인 후 변환
  const heapUsedMB = info.heapUsedMB !== undefined 
    ? info.heapUsedMB 
    : info.heap_used_mb || 0;

  // heapTotalMB 대신 heapTotal 사용
  const heapTotalMB = info.heapTotal !== undefined
    ? info.heapTotal / (1024 * 1024)  // 바이트에서 MB로 변환
    : info.heap_total / (1024 * 1024) || 0;

  const percentUsed = info.percentUsed !== undefined
    ? info.percentUsed
    : info.percent_used || 0;

  const rssMB = info.rssMB !== undefined
    ? info.rssMB
    : info.rss_mb || 0;

  // 포맷팅 결과 반환
  return {
    heapUsed: `${heapUsedMB.toFixed(2)} MB`,
    heapTotal: `${heapTotalMB.toFixed(2)} MB`,
    percentUsed: `${percentUsed.toFixed(1)}%`,
    rss: `${rssMB.toFixed(2)} MB`,
    timestamp: new Date(info.timestamp).toLocaleString()
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
  // 타입 안전한 변환을 위해 각 필드 추출 및 변환
  const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const heapUsed = toNumber(nativeInfo.heap_used ?? nativeInfo.heapUsed);
  const heapTotal = toNumber(nativeInfo.heap_total ?? nativeInfo.heapTotal);
  const rss = toNumber(nativeInfo.rss);
  const heapUsedMB = toNumber(nativeInfo.heap_used_mb ?? nativeInfo.heapUsedMB);
  const rssMB = toNumber(nativeInfo.rss_mb ?? nativeInfo.rssMB);
  const percentUsed = toNumber(nativeInfo.percent_used ?? nativeInfo.percentUsed);
  const heapLimit = toNumber(nativeInfo.heap_limit ?? nativeInfo.heapLimit);
  
  // MemoryInfo 필수 필드 포함된 객체 반환
  return {
    timestamp: Date.now(), // timestamp 필수 필드 추가
    heap_used: heapUsed,
    heap_total: heapTotal,
    heap_limit: heapLimit,
    rss: rss,
    heap_used_mb: heapUsedMB,
    rss_mb: rssMB,
    percent_used: percentUsed,
    
    // 선택적 별칭도 추가
    heapUsed: heapUsed,
    heapTotal: heapTotal,
    heapLimit: heapLimit,
    heapUsedMB: heapUsedMB,
    percentUsed: percentUsed,
    rssMB: rssMB
  };
}
