/**
 * 메모리 관련 유틸리티 통합 내보내기
 */

// 메모리 포맷 유틸리티
export * from './format-utils';

// 메모리 최적화 유틸리티
export * from './optimization-utils';

// 메모리 캐시 유틸리티
export * from './cache-utils';

// 가비지 컬렉션 유틸리티
export * from './gc-utils';

// 메모리 정보 유틸리티
export * from './memory-info';

// 메모리 훅
export * from './hooks';

// 메모리 로깅
export * from './logger';

// 메모리 타입 확장
export * from './types-extended';

// 가비지 컬렉션 관련 모듈
export * from './gc/garbage-collector';
export * from './gc/optimization-controller';
export * from './gc/resource-optimizer';
export * from './gc/event-optimizer';
export * from './gc/dom-cleanup';
export * from './gc/emergency-recovery';

// 타입 정의
export * from './types';
export * from './gc-types';