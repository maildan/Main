import { ProcessingMode } from './index';

/**
 * 컴포넌트별 메모리 설정
 */
export interface ComponentMemorySettings {
    optimizeOnUnmount: boolean;
    aggressiveCleanup: boolean;
}

/**
 * 메모리 설정 인터페이스
 */
export interface MemorySettings {
    preferNativeImplementation: boolean;
    enableAutomaticFallback: boolean;
    enableAutomaticOptimization: boolean;
    optimizationThreshold: number; // MB
    optimizationInterval: number; // ms
    aggressiveGC: boolean;
    enableLogging: boolean;
    enablePerformanceMetrics: boolean;
    useMemoryPool: boolean;
    fallbackRetryDelay: number; // ms
    poolCleanupInterval: number; // ms
    processingMode: ProcessingMode;
    componentSpecificSettings: Record<string, ComponentMemorySettings>;
}
