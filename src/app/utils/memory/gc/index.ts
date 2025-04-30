/**
 * 메모리 가비지 컬렉션 유틸리티 모음
 * 이 파일은 다양한 GC 관련 모듈을 통합하여 내보냅니다.
 */

// 명시적 내보내기로 모호성 해결
export { cleanupCache, cleanupLowPriorityCache, cleanupAllCache } from './cache-optimizer';
export { cleanupDom } from './dom-cleanup';
export { optimizeResources } from './resource-optimizer';
export { emergencyRecovery } from './emergency-recovery';

// 모호성 해결을 위해 별칭 사용
import { clearImageResizeCache as cacheImageResize } from './cache-optimizer';
export { cacheImageResize as clearImageResizeCache };

// 타입 정의들 - 사실 types 모듈이 없음 (주석으로 변경)
// import { 
//   _MemoryInfo, 
//   _OptimizationResult,
//   _GCResult,
// } from './types';

// 예시 코드는 주석으로 변경
// 예시: try { ... } catch (_e) { /* 에러 무시 */ }
// 예시: function example(_emergency: boolean = false) { /* 비상 상황 처리 */ }
// 예시: const _defaultRequestGC = () => { /* GC 요청 기본 함수 */ }

/**
 * 캐시 최적화 및 메모리 관리를 위한 유틸리티 기능들을 제공합니다.
 * - cleanupCache: 일반적인 캐시 정리
 * - cleanupDom: DOM 요소 정리
 * - optimizeResources: 리소스 최적화
 * - emergencyRecovery: 긴급 복구 (메모리 부족 상황)
 */

 
const _gcUtils = {
  version: '1.0.0',
  description: '메모리 최적화 유틸리티'
};