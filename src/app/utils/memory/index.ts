/**
 * 메모리 관련 유틸리티 통합 모듈
 */

// 메모리 정보 및 포맷 관련
export {
    getMemoryInfo,
    getMemoryUsage,
    convertNativeMemoryInfo,
    assessMemoryState
} from './memory-info';

// 명시적인 export로 모호성 해결
export { formatMemoryInfo as formatMemoryDetails } from './memory-info';
export { formatMemoryInfo as formatBytes } from './format-utils';

// GC 관련 유틸리티
export {
    cleanupResources,
    createMemoryInfo,
    getMemoryUsagePercentage,
} from './utils';

// 명시적인 export로 모호성 해결
export {
    clearBrowserCaches as clearBrowserCacheStorage,
    clearStorageCaches as clearAllStorageCaches,
    requestGC as requestGarbageCollect,
    suggestGarbageCollection as triggerGarbageCollection
} from './gc/optimization-controller';

export {
    clearBrowserCaches,
    clearStorageCaches,
    requestGC,
    suggestGarbageCollection
} from './gc-utils';

// 최적화 유틸리티 내보내기
export { configureAutoOptimization } from './optimization-utils';

// 직접 구현된 최적화 기능들 내보내기
export { cleanupCache } from './cache-optimizer';
export { optimizeEvents } from './event-optimizer';
export { optimizeResources } from './resource-optimizer';
export { emergencyRecovery } from './emergency-recovery';

// 타입 내보내기 - 명시적으로 이름 변경하여 모호성 해결
export { OptimizationLevel as MemoryOptimizationLevel } from '@/types';
export type { ExtendedGCResult as EnhancedGCResult } from './types-extended';
export * from './types';

// 최적화 컨트롤러 내보내기
export { default as optimizationController } from './gc/optimization-controller';

// 메모리 모니터링 및 관리 유틸리티 내보내기
export * from './hooks';
export * from './logger';