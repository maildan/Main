/**
 * 가비지 컬렉션 관련 타입 정의
 * 메모리 최적화 모듈에서 사용되는 공통 타입
 */
import { GCResult } from './types';
import { MemoryInfo } from '@/types';

/**
 * 최적화 레벨 타입
 * 0: 정상 - 최적화 필요 없음
 * 0.5: 관찰 - 경량 최적화
 * 1: 주의 - 중간 수준 최적화
 * 2: 경고 - 고수준 최적화
 * 3: 위험 - 최대 수준 최적화
 */
export type OptimizationLevel = 0 | 0.5 | 1 | 2 | 3;

/**
 * 캐시 최적화 설정
 */
export interface CacheOptimizationOptions {
  includeIndexedDB?: boolean;
  includeAppCache?: boolean;
  includeLocalStorage?: boolean;
  includeSessionStorage?: boolean;
  includeServiceWorker?: boolean;
}

/**
 * DOM 최적화 설정
 */
export interface DOMOptimizationOptions {
  cleanupHiddenElements?: boolean;
  unloadOffscreenImages?: boolean;
  optimizeOffscreenElements?: boolean;
  removeUnusedEventListeners?: boolean;
}

/**
 * 이벤트 최적화 설정
 */
export interface EventOptimizationOptions {
  whitelistedEvents?: string[];
  cleanupThreshold?: number; // 밀리초 단위의 비활성 임계값
}

/**
 * 리소스 최적화 설정
 */
export interface ResourceOptimizationOptions {
  unloadIframes?: boolean;
  pauseMedia?: boolean;
  offscreenBufferSize?: number; // 뷰포트 외부 여백 크기 (픽셀)
}

/**
 * 메모리 최적화 요청 옵션
 */
export interface MemoryOptimizationRequest {
  level: OptimizationLevel;
  emergency?: boolean;
  cacheOptions?: CacheOptimizationOptions;
  domOptions?: DOMOptimizationOptions;
  eventOptions?: EventOptimizationOptions;
  resourceOptions?: ResourceOptimizationOptions;
}

/**
 * 메모리 최적화 응답
 */
export interface MemoryOptimizationResponse {
  success: boolean;
  optimizationLevel: OptimizationLevel;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
  duration?: number;
  timestamp: number;
  error?: string;
}

/**
 * GC 결과 확장 인터페이스
 */
export interface DetailedGCResult extends GCResult {
  optimizationLevel?: OptimizationLevel;
  totalFreed?: number; // 총 해제된 메모리 (바이트)
  durationMs?: number; // 소요된 시간 (밀리초)
  actions?: string[]; // 수행된 작업 목록
}
