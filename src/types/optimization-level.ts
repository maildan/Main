/**
 * 메모리 최적화 레벨 정의 (enum으로 변경하여 값으로 사용 가능)
 */
export enum OptimizationLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    AGGRESSIVE = 4,
    // 이전 코드와 호환되도록 별칭 추가 - 중복 오류 방지를 위해 주석 처리
    // NORMAL = 0,
    // CRITICAL = 4,
    // EXTREME = 4 // EXTREME도 AGGRESSIVE/CRITICAL과 값이 중복되어 주석 처리
}

// 네이티브 모듈을 위한 최적화 레벨 enum
export enum NativeOptimizationLevel {
    Normal = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

// 최적화 레벨 설명
export const OPTIMIZATION_LEVEL_DESCRIPTIONS: Record<string, string> = {
    [OptimizationLevel.NONE.toString()]: '없음',
    [OptimizationLevel.LOW.toString()]: '낮음',
    [OptimizationLevel.MEDIUM.toString()]: '중간',
    [OptimizationLevel.HIGH.toString()]: '높음',
    [OptimizationLevel.AGGRESSIVE.toString()]: '적극적',
    // [OptimizationLevel.EXTREME.toString()]: '매우 적극적' // EXTREME 주석 처리로 인해 함께 주석 처리
};

// 최적화 레벨 매핑 - 문자열 키로 변환하여 중복 방지
export const APP_TO_NATIVE_LEVEL_MAP: Record<string, NativeOptimizationLevel> = {
    // 각 고유 값마다 하나의 매핑만 유지
    [OptimizationLevel.NONE.toString()]: NativeOptimizationLevel.Normal,
    [OptimizationLevel.LOW.toString()]: NativeOptimizationLevel.Low,
    [OptimizationLevel.MEDIUM.toString()]: NativeOptimizationLevel.Medium,
    [OptimizationLevel.HIGH.toString()]: NativeOptimizationLevel.High,
    [OptimizationLevel.AGGRESSIVE.toString()]: NativeOptimizationLevel.Critical,
    // [OptimizationLevel.EXTREME.toString()]: NativeOptimizationLevel.Critical // EXTREME 주석 처리로 인해 함께 주석 처리
};

export const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, OptimizationLevel> = {
    [NativeOptimizationLevel.Normal]: OptimizationLevel.NONE,
    [NativeOptimizationLevel.Low]: OptimizationLevel.LOW,
    [NativeOptimizationLevel.Medium]: OptimizationLevel.MEDIUM,
    [NativeOptimizationLevel.High]: OptimizationLevel.HIGH,
    [NativeOptimizationLevel.Critical]: OptimizationLevel.AGGRESSIVE
};