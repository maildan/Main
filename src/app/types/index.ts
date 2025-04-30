/**
 * 메모리 정보 타입
 */
export interface MemoryInfo {
    heapUsed?: number;
    heapTotal?: number;
    percentUsed?: number;
    rss?: number;
    external?: number;
    [key: string]: any;
}

/**
 * 최적화 결과 타입
 */
export interface OptimizationResult {
    success: boolean;
    message?: string;
    reduction?: number;
    [key: string]: any;
}

/**
 * 타이핑 데이터 타입
 */
export interface TypingData {
    keyCount: number;
    typingTime: number;
    accuracy: number;
}

/**
 * 최적화 레벨 enum
 */
export enum OptimizationLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    AGGRESSIVE = 4
}