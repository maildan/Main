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
    EXTREME = 4
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
export const OPTIMIZATION_LEVEL_DESCRIPTIONS: Record<OptimizationLevel, string> = {
    [OptimizationLevel.NONE]: '없음',
    [OptimizationLevel.LOW]: '낮음',
    [OptimizationLevel.MEDIUM]: '중간',
    [OptimizationLevel.HIGH]: '높음',
    [OptimizationLevel.AGGRESSIVE]: '적극적',
    [OptimizationLevel.NORMAL]: '없음',
    [OptimizationLevel.CRITICAL]: '적극적',
    [OptimizationLevel.EXTREME]: '매우 적극적'
};

// 최적화 레벨 매핑
export const APP_TO_NATIVE_LEVEL_MAP: Record<OptimizationLevel, NativeOptimizationLevel> = {
    [OptimizationLevel.NORMAL]: NativeOptimizationLevel.Normal,
    [OptimizationLevel.LOW]: NativeOptimizationLevel.Low,
    [OptimizationLevel.MEDIUM]: NativeOptimizationLevel.Medium,
    [OptimizationLevel.HIGH]: NativeOptimizationLevel.High,
    [OptimizationLevel.CRITICAL]: NativeOptimizationLevel.Critical,
    [OptimizationLevel.NONE]: NativeOptimizationLevel.Normal,
    [OptimizationLevel.AGGRESSIVE]: NativeOptimizationLevel.Critical,
    [OptimizationLevel.EXTREME]: NativeOptimizationLevel.Critical
};

export const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, OptimizationLevel> = {
    [NativeOptimizationLevel.Normal]: OptimizationLevel.NORMAL,
    [NativeOptimizationLevel.Low]: OptimizationLevel.LOW,
    [NativeOptimizationLevel.Medium]: OptimizationLevel.MEDIUM,
    [NativeOptimizationLevel.High]: OptimizationLevel.HIGH,
    [NativeOptimizationLevel.Critical]: OptimizationLevel.CRITICAL
};