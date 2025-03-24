/**
 * 공통 유틸리티 함수 및 모듈
 */

// 기본 유틸리티 함수 내보내기
export * from './date-utils';
export * from './string-utils';
export * from './math-utils';
export * from './format-utils';
export * from './localStorage';

// 스토리지 유틸리티 - 올바른 경로 지정
export { 
  getLocalStorage, 
  setLocalStorage,
  clearLocalStorage
} from './storage-utils';

// 메모리 최적화 및 관리
export * from './memory-optimizer';
export * from './memory-settings-manager';
export * from './performance-optimizer';
export * from './nativeModuleClient';

// TypeScript 문법 오류 수정 - 모듈 경로 수정 및 문자열 종결
export * from './memory/gpu-accelerator';
export * from './enum-converters';
export * from './performance-metrics';
export * from './performance-optimizer';

// 타입 정의
export type { 
  MemoryInfo, 
  OptimizationResult 
} from '@/types';
