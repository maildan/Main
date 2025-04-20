/**
 * 네이티브 모듈과의 통신 브릿지
 */

import { MemoryInfo, OptimizationResult, GCResult } from '@/types';
import { OptimizationLevel } from '@/types/optimization-level';
import { nativeModuleClient } from './nativeModuleClient';

// 최적화 레벨을 안전하게 변환하는 함수
function safeOptimizationLevel(level: number): OptimizationLevel {
  // Ensure the level is within the valid enum range defined in @/types/optimization-level
  // Use AGGRESSIVE as the maximum valid level since EXTREME is commented out
  if (level >= OptimizationLevel.LOW && level <= OptimizationLevel.AGGRESSIVE) {
    return level as OptimizationLevel;
  }
  return OptimizationLevel.MEDIUM; // Default to MEDIUM
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

/**
 * 네이티브 가비지 컬렉션 요청
 */
export async function requestNativeGarbageCollection(): Promise<GCResult | null> {
  try {
    // Directly call the native function
    return await forceGarbageCollectionNative();
  } catch (error) {
    console.error('네이티브 가비지 컬렉션 요청 오류:', error);
    // Return a default error result or null based on expected behavior
    return {
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      duration: 0,
      error: error instanceof Error ? error.message : '가비지 컬렉션을 사용할 수 없습니다'
    };
  }
}

/**
 * 네이티브 메모리 최적화 요청
 */
export async function requestNativeMemoryOptimization(
  level: number,
  _emergency = false // emergency parameter seems unused, marked with underscore
): Promise<OptimizationResult | null> {
  // 올바른 레벨 값 확보
  const safeLevel = safeOptimizationLevel(level);

  try {
    // Directly call the native function
    return await optimizeMemoryNative(safeLevel);
  } catch (error) {
    console.error('네이티브 메모리 최적화 요청 오류:', error);
    // Return a default error result or null based on expected behavior
    return {
      success: false,
      optimizationLevel: safeLevel,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: error instanceof Error ? error.message : '메모리 최적화를 사용할 수 없습니다'
    };
  }
}

/**
 * 네이티브 브리지 상태 확인 - 이 함수는 checkBridgeAvailability 및 bridgeState를 사용하므로 제거하거나 수정해야 합니다.
 * 현재 상태에서는 작동하지 않으므로 주석 처리하거나 제거합니다.
 */
/*
export async function checkNativeBridgeStatus(): Promise<{
  available: boolean;
  initialized: boolean;
  lastCheck: number;
  errorCount: number;
  lastError: string | null;
}> {
  // await checkBridgeAvailability(); // This function is removed or undefined

  return {
    // available: bridgeState.isAvailable, // bridgeState is undefined
    // initialized: bridgeState.isInitialized, // bridgeState is undefined
    // lastCheck: bridgeState.lastCheck, // bridgeState is undefined
    // errorCount: bridgeState.errorCount, // bridgeState is undefined
    // lastError: bridgeState.lastError?.message || null // bridgeState is undefined
    available: false, // Placeholder
    initialized: false, // Placeholder
    lastCheck: 0, // Placeholder
    errorCount: 0, // Placeholder
    lastError: 'Status check unavailable' // Placeholder
  };
}
*/

/**
 * 브리지 상태 게터 함수들 - bridgeState를 사용하므로 제거하거나 수정해야 합니다.
 */
// export const getNativeBridgeState = () => ({ ...bridgeState }); // bridgeState is undefined
// export const isNativeBridgeAvailable = () => bridgeState.isAvailable; // bridgeState is undefined
// export const getBridgeErrorCount = () => bridgeState.errorCount; // bridgeState is undefined
// export const getLastBridgeError = () => bridgeState.lastError; // bridgeState is undefined

// Corrected optimizeMemoryNative
export async function optimizeMemoryNative(level: OptimizationLevel = OptimizationLevel.MEDIUM): Promise<OptimizationResult> {
  if (!nativeModuleClient) {
    console.warn('Native module client not available for memory optimization.');
    // Return an OptimizationResult indicating failure
    return {
      success: false,
      optimizationLevel: level,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: 'Native module client not available'
    };
  }
  try {
    // Assuming nativeModuleClient.optimizeMemory returns OptimizationResult
    // Ensure the level type matches the expected type in nativeModuleClient.optimizeMemory
    return await nativeModuleClient.optimizeMemory(level);
  } catch (error) {
    console.error('Error during native memory optimization:', error);
    // Return an OptimizationResult indicating failure
    return {
      success: false,
      optimizationLevel: level,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: error instanceof Error ? error.message : 'Unknown optimization error'
    };
  }
}

// Corrected forceGarbageCollectionNative
export async function forceGarbageCollectionNative(): Promise<GCResult> {
  if (!nativeModuleClient) {
    console.warn('Native module client not available for garbage collection.');
    // Return a GCResult indicating failure
    return {
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      duration: 0,
      error: 'Native module client not available'
    };
  }
  try {
    // Use requestGarbageCollection instead of forceGarbageCollection
    return await nativeModuleClient.requestGarbageCollection();
  } catch (error) {
    console.error('Error during native garbage collection:', error);
    // Return a GCResult indicating failure
    return {
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      duration: 0,
      error: error instanceof Error ? error.message : 'Unknown GC error'
    };
  }
}

// Corrected getMemoryInfoNative
export async function getMemoryInfoNative(): Promise<MemoryInfo | null> {
  if (!nativeModuleClient) {
    console.warn('Native module client not available for getting memory info.');
    return null;
  }
  try {
    // Assuming nativeModuleClient.getMemoryInfo returns MemoryInfo
    return await nativeModuleClient.getMemoryInfo();
  } catch (error) {
    console.error('Error getting native memory info:', error);
    return null;
  }
}

// Remove the functions that depended on the removed bridgeState and wrappers
// Removed checkBridgeAvailability, withErrorHandling, getNativeBridgeState, isNativeBridgeAvailable, getBridgeErrorCount, getLastBridgeError
