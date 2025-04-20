/**
 * 최적화 수준별 구현
 * Rust 네이티브 모듈을 호출하는 래퍼 함수들
 */
import { requestNativeMemoryOptimization } from '@/app/utils/native-memory-bridge';
import { OptimizationLevel } from '@/types/native-module';
import { getMemoryInfo } from '../memory-info';
import { logMemoryUsage } from '../logger';
import { MemoryEventType } from '@/types';

/**
 * 가벼운 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function lightOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Low, false);
  } catch (error) {
    console.error('가벼운 메모리 최적화 중 오류:', error);
  }
}

/**
 * 중간 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function mediumOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Medium, false);
  } catch (error) {
    console.error('중간 수준 메모리 최적화 중 오류:', error);
  }
}

/**
 * 높은 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function highOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.High, false);
  } catch (error) {
    console.error('높은 수준 메모리 최적화 중 오류:', error);
  }
}

/**
 * 적극적인 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function aggressiveOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Critical, true);
  } catch (error) {
    console.error('적극적인 메모리 최적화 중 오류:', error);
  }
}

/**
 * 메모리 최적화 레벨 관리 및 보고
 */

// 최적화 레벨 설명 (타입 수정)
export const OPTIMIZATION_LEVEL_DESCRIPTIONS: Record<OptimizationLevel, string> = {
  [OptimizationLevel.Normal]: '일반',
  [OptimizationLevel.Low]: '낮음',
  [OptimizationLevel.Medium]: '중간',
  [OptimizationLevel.High]: '높음',
  [OptimizationLevel.Critical]: '치명적',
};

// 레벨별 임계값 (메모리 사용률 %)
export const OPTIMIZATION_THRESHOLDS = {
  LEVEL_0: 50,  // 50% 미만
  LEVEL_1: 70,  // 50-70%
  LEVEL_2: 80,  // 70-80%
  LEVEL_3: 90,  // 80-90%
  LEVEL_4: 95   // 90% 이상 (위험)
};

// 최적화 히스토리
const optimizationHistory: Array<{
  timestamp: number;
  level: number;
  memoryBefore: number;
  memoryAfter: number;
}> = [];

/**
 * 현재 메모리 상태에 따른 최적화 레벨 추천
 */
export async function recommendOptimizationLevel(): Promise<number> {
  const memoryInfo = await getMemoryInfo();

  if (!memoryInfo) {
    return 0; // 정보를 얻을 수 없는 경우 기본값
  }

  const memoryUsagePercent = memoryInfo.percentUsed || 0;

  if (memoryUsagePercent > OPTIMIZATION_THRESHOLDS.LEVEL_4) {
    return 4;
  } else if (memoryUsagePercent > OPTIMIZATION_THRESHOLDS.LEVEL_3) {
    return 3;
  } else if (memoryUsagePercent > OPTIMIZATION_THRESHOLDS.LEVEL_2) {
    return 2;
  } else if (memoryUsagePercent > OPTIMIZATION_THRESHOLDS.LEVEL_1) {
    return 1;
  }

  return 0;
}

/**
 * 최적화 후 메모리 사용량 보고
 */
export async function reportMemoryUsage(level: number): Promise<void> {
  try {
    const memoryInfo = await getMemoryInfo();

    if (!memoryInfo) {
      return;
    }

    const heapUsedMB = memoryInfo.heapUsedMB || 0;
    const percentUsed = memoryInfo.percentUsed || 0;

    const message = `메모리 최적화 (레벨 ${level}) 완료: ${heapUsedMB.toFixed(2)}MB (${percentUsed.toFixed(1)}%)`;

    // 로그 기록
    await logMemoryUsage(
      MemoryEventType.OPTIMIZATION,
      message
    );

    // 콘솔 로깅
    console.log(message);

    // 내역 저장
    recordOptimization(level, heapUsedMB);
  } catch (error) {
    console.error('메모리 사용량 보고 오류:', error);
  }
}

/**
 * 최적화 내역 기록
 */
function recordOptimization(level: number, currentMemory: number): void {
  const lastEntry = optimizationHistory[optimizationHistory.length - 1];

  optimizationHistory.push({
    timestamp: Date.now(),
    level,
    memoryBefore: lastEntry?.memoryAfter || currentMemory,
    memoryAfter: currentMemory
  });

  // 최대 100개 항목 유지
  if (optimizationHistory.length > 100) {
    optimizationHistory.shift();
  }
}

/**
 * 최적화 내역 가져오기
 */
export function getOptimizationHistory() {
  return [...optimizationHistory];
}

/**
 * 특정 최적화 레벨에 필요한 작업 설명
 */
export function getOptimizationActions(level: number): string[] {
  switch (level) {
    case 0:
      return [
        '기본 상태 유지',
        '일반적인 가비지 컬렉션 허용'
      ];
    case 1:
      return [
        '비필수 캐시 정리',
        '사용하지 않는 이미지 언로드',
        '비활성 이벤트 리스너 정리'
      ];
    case 2:
      return [
        '모든 레벨 1 작업 포함',
        'DOM 참조 정리',
        '비표시 요소 정리',
        '메모리 풀 최적화'
      ];
    case 3:
      return [
        '모든 레벨 2 작업 포함',
        '애니메이션 및 타이머 일시 중지',
        '대용량 객체 참조 해제',
        '인메모리 캐시 축소'
      ];
    case 4:
      return [
        '모든 레벨 3 작업 포함',
        '비필수 모듈 언로드',
        'GPU 가속화 비활성화',
        '백그라운드 작업 중지',
        '인메모리 DB 압축'
      ];
    default:
      return ['알 수 없는 최적화 레벨'];
  }
}

export function getOptimizationLevelName(level: OptimizationLevel): string {
  switch (level) {
    case OptimizationLevel.Normal:
      return OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.Normal];
    case OptimizationLevel.Low:
      return OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.Low];
    case OptimizationLevel.Medium:
      return OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.Medium];
    case OptimizationLevel.High:
      return OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.High];
    case OptimizationLevel.Critical:
      return OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.Critical];
    default:
      return '알 수 없음';
  }
}
