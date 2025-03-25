/**
 * 유틸리티 함수 모음
 */

// Storage utilities
export * from './localStorage';

// Format utilities
export * from './date-utils';
export * from './string-utils';
export * from './math-utils';
export * from './format-utils';

// Memory management
export * from './memory/memory-info';
export * from './memory/types';
export * from './memory/hooks';

// GPU utilities - 명시적으로 이름 변경하여 충돌 방지
export * from './gpu-acceleration';
export * from './gpu-detection';

// 충돌 해결을 위해 별칭 사용
import * as gpuBridge from './gpu-settings-bridge';
import * as gpuSettings from './gpu-settings';
export { gpuBridge, gpuSettings };

// Specific utility functions
// nativeModuleClient.ts에서 named export 사용으로 변경
export * from './nativeModuleClient';
export * from './system-monitor';
export * from './type-converters';

// GPU namespace export
export * as gpu from './gpu/functions';
