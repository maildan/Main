/**
 * 메모리 최적화 레벨 정의 (enum으로 변경하여 값으로 사용 가능)
 */
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4,
  // 이전 코드와 호환되도록 별칭 추가
  NORMAL = 0,
  CRITICAL = 4,
  // EXTREME 추가 (CRITICAL과 동일한 값 사용)
  EXTREME = 4,
}

// 네이티브 모듈을 위한 최적화 레벨 enum
export enum NativeOptimizationLevel {
  Normal = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

// 최적화 레벨 설명 (객체 생성 함수로 변경하여 중복 키 문제 해결)
export const OPTIMIZATION_LEVEL_DESCRIPTIONS: Record<number, string> = {};
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.NONE] = '없음';
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.LOW] = '낮음';
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.MEDIUM] = '중간';
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.HIGH] = '높음';
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.AGGRESSIVE] = '적극적';
// NORMAL은 NONE과 값이 같으므로 이미 설정됨
// CRITICAL은 AGGRESSIVE와 값이 같으므로 이미 설정됨
OPTIMIZATION_LEVEL_DESCRIPTIONS[OptimizationLevel.EXTREME] = '매우 적극적';

// 최적화 레벨 매핑 (객체 생성 함수로 변경하여 중복 키 문제 해결)
export const APP_TO_NATIVE_LEVEL_MAP: Record<number, NativeOptimizationLevel> = {};
APP_TO_NATIVE_LEVEL_MAP[OptimizationLevel.NORMAL] = NativeOptimizationLevel.Normal;
APP_TO_NATIVE_LEVEL_MAP[OptimizationLevel.LOW] = NativeOptimizationLevel.Low;
APP_TO_NATIVE_LEVEL_MAP[OptimizationLevel.MEDIUM] = NativeOptimizationLevel.Medium;
APP_TO_NATIVE_LEVEL_MAP[OptimizationLevel.HIGH] = NativeOptimizationLevel.High;
APP_TO_NATIVE_LEVEL_MAP[OptimizationLevel.CRITICAL] = NativeOptimizationLevel.Critical;
// NONE은 NORMAL과 값이 같으므로 이미 설정됨
// AGGRESSIVE는 CRITICAL과 값이 같으므로 이미 설정됨
// EXTREME은 CRITICAL과 값이 같으므로 이미 설정됨

export const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, OptimizationLevel> = {
  [NativeOptimizationLevel.Normal]: OptimizationLevel.NORMAL,
  [NativeOptimizationLevel.Low]: OptimizationLevel.LOW,
  [NativeOptimizationLevel.Medium]: OptimizationLevel.MEDIUM,
  [NativeOptimizationLevel.High]: OptimizationLevel.HIGH,
  [NativeOptimizationLevel.Critical]: OptimizationLevel.CRITICAL,
};
