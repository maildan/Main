/**
 * 메모리 최적화 관련 확장 타입 정의
 * 모든 메모리 관련 타입의 중앙 집중화 및 재사용성 증가
 */
import { MemoryInfo, GCResult, ExtendedGCResult } from './types';

/**
 * 메모리 최적화 유틸리티 인터페이스
 * window.__memoryOptimizer의 타입 정의
 */
export interface MemoryOptimizerUtility {
  // 메모리 최적화 기본 기능
  optimizeMemory?: (aggressive: boolean) => void;
  optimizeImageResources?: () => Promise<boolean>;
  getMemoryInfo?: () => MemoryInfo | null;
  suggestGarbageCollection?: () => void;
  getMemoryUsagePercentage?: () => number;
  
  // GC 컨트롤러 기능
  requestGC?: (emergency?: boolean) => Promise<GCResult>;
  determineOptimizationLevel?: (memoryInfo: MemoryInfo) => number;
  
  // 메모리 풀 기능
  acquireFromPool?: (type: string) => any;
  releaseToPool?: (obj: any) => void;
  
  // 새 모듈화 기능
  performOptimizationByLevel?: (level: number, emergency?: boolean) => Promise<void>;
  clearImageCaches?: () => void;
  cleanupDOMReferences?: () => void;
  clearStorageCaches?: () => void;
  emergencyMemoryRecovery?: () => Promise<void>;
  
  // 기타 확장성을 위한 인덱스 시그니처
  [key: string]: any;
}

/**
 * 최적화 수준 설명 인터페이스
 */
export interface OptimizationLevelDescriptions {
  [key: number]: string;
}

/**
 * 캐시 항목 인터페이스
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires?: number;
}

/**
 * 메모리 리소스 해제 핸들러 인터페이스
 */
export interface MemoryReleaseHandler {
  release: () => void;
  priority: 'low' | 'medium' | 'high';
}

// HTML 요소 확장을 위한 타입 정의
export interface HTMLElementWithEventHandlers extends HTMLElement {
  _eventHandlers?: Record<string, Array<{
    handler: EventListener;
    removed?: boolean;
  }>>;
}

// 메모리 풀 항목 인터페이스
export interface MemoryPoolItem {
  id: string;
  inUse: boolean;
  lastReleased?: number;
  data: any;
}

// 메모리 풀 인터페이스
export interface MemoryPool {
  [type: string]: MemoryPoolItem[];
}

// 전역 선언은 global.d.ts로 이동
