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
    [OptimizationLevel.AGGRESSIVE]: '적극적'
    // NORMAL, CRITICAL, EXTREME은 각각 NONE, AGGRESSIVE와 동일한 값을 가지므로 제거
};

// 최적화 레벨 매핑 - 중복된 속성 문제 해결
// OptimizationLevel.NORMAL, OptimizationLevel.CRITICAL, OptimizationLevel.EXTREME이
// 각각 OptimizationLevel.NONE, OptimizationLevel.AGGRESSIVE와 같은 값이므로
// 시각적으로만 분리하여 주석으로 표시
export const APP_TO_NATIVE_LEVEL_MAP: Record<number, NativeOptimizationLevel> = {
    // 기본 매핑
    [OptimizationLevel.NONE]: NativeOptimizationLevel.Normal,
    [OptimizationLevel.LOW]: NativeOptimizationLevel.Low,
    [OptimizationLevel.MEDIUM]: NativeOptimizationLevel.Medium,
    [OptimizationLevel.HIGH]: NativeOptimizationLevel.High,
    [OptimizationLevel.AGGRESSIVE]: NativeOptimizationLevel.Critical,
    // 아래 별칭들은 중복 속성이므로 주석 처리 (숫자 값이 같으므로 실제로는 위의 매핑과 같음)
    // OptimizationLevel.NORMAL -> OptimizationLevel.NONE과 동일 (값: 0)
    // OptimizationLevel.CRITICAL -> OptimizationLevel.AGGRESSIVE와 동일 (값: 4)
    // OptimizationLevel.EXTREME -> OptimizationLevel.AGGRESSIVE와 동일 (값: 4)
};

export const NATIVE_TO_APP_LEVEL_MAP: Record<NativeOptimizationLevel, OptimizationLevel> = {
    [NativeOptimizationLevel.Normal]: OptimizationLevel.NORMAL,
    [NativeOptimizationLevel.Low]: OptimizationLevel.LOW,
    [NativeOptimizationLevel.Medium]: OptimizationLevel.MEDIUM,
    [NativeOptimizationLevel.High]: OptimizationLevel.HIGH,
    [NativeOptimizationLevel.Critical]: OptimizationLevel.CRITICAL
};