/**
 * 네이티브 모듈과의 통신 브릿지
 */

import { MemoryInfo, OptimizationResult, OptimizationLevel, GCResult } from '@/types';

/**
 * 최적화 레벨 값을 안전하게 처리하는 함수
 * 유효한 최적화 레벨 범위(0-4) 내의 값으로 변환
 */
function safeOptimizationLevel(level: number): number {
  // 숫자가 아니면 기본값 반환
  if (typeof level !== 'number' || isNaN(level)) {
    return OptimizationLevel.MEDIUM;
  }

  // 범위 제한 (0-4)
  return Math.max(0, Math.min(4, Math.floor(level)));
}

/**
 * 네이티브 메모리 정보 요청
 */
export async function requestNativeMemoryInfo(): Promise<MemoryInfo | null> {
  // 기본적인 브라우저 환경 체크
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 백엔드 API를 통해 메모리 정보 요청
    const response = await fetch('/api/native/memory/info');
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.memoryInfo;
  } catch (error) {
    console.error('네이티브 메모리 정보 요청 오류:', error);
    return null;
  }
}

import {
  optimizeMemory,
  forceGarbageCollection,
  getMemoryInfo as fetchMemoryInfo,
} from './nativeModuleClient';

// 브리지 상태
const bridgeState = {
  isInitialized: false,
  isAvailable: false,
  lastError: null as Error | null,
  lastCheck: 0,
  errorCount: 0,
};

/**
 * 에러 처리 래퍼 함수
 */
async function withErrorHandling<T>(
  operation: () => Promise<T>, // 타입 오류 수정
  fallback: () => Promise<T> | T | null,
  operationName: string
): Promise<T | null> {
  try {
    // 브리지가 초기화되지 않은 경우
    if (!bridgeState.isInitialized) {
      // 브리지 상태 확인
      await checkBridgeAvailability();
    }

    if (!bridgeState.isAvailable) {
      console.warn(`Native bridge not available for ${operationName}`);
      return fallback();
    }

    // 작업 실행
    return await operation();
  } catch (error) {
    // 오류 기록
    bridgeState.errorCount++;
    bridgeState.lastError = error instanceof Error ? error : new Error(String(error));

    console.error(`Native bridge error in ${operationName}:`, error);

    // 폴백 반환
    return fallback();
  }
}

/**
 * 브리지 가용성 확인
 */
async function checkBridgeAvailability(): Promise<boolean> {
  try {
    // 마지막 확인 후 10초 이내면 캐시된 값 반환
    const now = Date.now();
    if (now - bridgeState.lastCheck < 10000 && bridgeState.isInitialized) {
      return bridgeState.isAvailable;
    }

    // 메모리 정보 가져오기 시도로 가용성 확인
    const response = await fetchMemoryInfo();

    bridgeState.isAvailable = response.success;
    bridgeState.isInitialized = true;
    bridgeState.lastCheck = now;

    if (!response.success) {
      bridgeState.lastError = new Error(response.error || 'Unknown error in native bridge');
    } else {
      bridgeState.lastError = null;
    }

    return bridgeState.isAvailable;
  } catch (error) {
    bridgeState.isAvailable = false;
    bridgeState.isInitialized = true;
    bridgeState.lastError = error instanceof Error ? error : new Error(String(error));
    bridgeState.lastCheck = Date.now();
    return false;
  }
}

/**
 * 네이티브 가비지 컬렉션 요청
 */
export async function requestNativeGarbageCollection(): Promise<GCResult | null> {
  return withErrorHandling(
    async () => {
      const response = await forceGarbageCollection();

      if (response.success && response.result) {
        return response.result;
      }

      throw new Error(response.error || '가비지 컬렉션을 수행할 수 없습니다');
    },
    () => ({
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      duration: 0,
      error: bridgeState.lastError?.message || '가비지 컬렉션을 사용할 수 없습니다',
    }),
    '가비지 컬렉션'
  );
}

/**
 * 네이티브 메모리 최적화 요청
 */
export async function requestNativeMemoryOptimization(
  level: number,
  emergency = false
): Promise<OptimizationResult | null> {
  // 올바른 레벨 값 확보
  const safeLevel = safeOptimizationLevel(level);

  return withErrorHandling(
    async () => {
      const response = await optimizeMemory(safeLevel, emergency);

      if (response.success && response.result) {
        return response.result;
      }

      throw new Error(response.error || '메모리 최적화를 수행할 수 없습니다');
    },
    () => ({
      success: false,
      optimizationLevel: safeLevel,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: bridgeState.lastError?.message || '메모리 최적화를 사용할 수 없습니다',
    }),
    '메모리 최적화'
  );
}

/**
 * 네이티브 브리지 상태 확인
 */
export async function checkNativeBridgeStatus(): Promise<{
  available: boolean;
  initialized: boolean;
  lastCheck: number;
  errorCount: number;
  lastError: string | null;
}> {
  await checkBridgeAvailability();

  return {
    available: bridgeState.isAvailable,
    initialized: bridgeState.isInitialized,
    lastCheck: bridgeState.lastCheck,
    errorCount: bridgeState.errorCount,
    lastError: bridgeState.lastError?.message || null,
  };
}

/**
 * 브리지 상태 게터 함수들
 */
export const getNativeBridgeState = () => ({ ...bridgeState });
export const isNativeBridgeAvailable = () => bridgeState.isAvailable;
export const getBridgeErrorCount = () => bridgeState.errorCount;
export const getLastBridgeError = () => bridgeState.lastError;
