/**
 * 통합 메모리 관리 시스템
 * 
 * 이 모듈은 네이티브 모듈과 JavaScript 구현을 통합하고,
 * 자동 폴백 메커니즘 및 설정 기반 최적화를 제공합니다.
 */

import { OptimizationLevel, MemoryInfo, OptimizationResult, GCResult } from '@/types';
import { requestNativeMemoryOptimization, requestNativeGarbageCollection, requestNativeMemoryInfo } from './native-memory-bridge';
import { internalOptimizeMemory } from './memory/optimizer';
import { requestGC } from './memory/gc-utils';
import { getMemoryInfo } from './memory/memory-info';
import { loadMemorySettings, MemorySettings } from '../settings/memory-settings';
import { logMemoryUsage, MemoryEventType } from './memory/logger';
import { benchmarkMemoryOptimization } from './performance-metrics';
import { getNativeModuleStatus } from './nativeModuleClient';
import { normalizeMemoryInfo, createDefaultMemoryInfo } from './memory/format-utils';
import { toNativeOptimizationLevel } from './enum-converters';

// 모듈 상태 관리
interface MemoryManagerState {
  nativeAvailable: boolean;
  recentFailures: {
    timestamp: number;
    operation: string;
    error: string;
  }[];
  inFallbackMode: boolean;
  lastNativeCheck: number;
  optimizationHistory: {
    timestamp: number;
    level: OptimizationLevel;
    success: boolean;
    freedMemory?: number;
    implementation: 'native' | 'js';
  }[];
  monitoringActive: boolean;
  monitoringInterval: NodeJS.Timeout | null;
}

// 모듈 상태 초기화
const state: MemoryManagerState = {
  nativeAvailable: false,
  recentFailures: [],
  inFallbackMode: false,
  lastNativeCheck: 0,
  optimizationHistory: [],
  monitoringActive: false,
  monitoringInterval: null
};

// 최대 기록할 실패 수
const MAX_FAILURE_RECORDS = 10;
// 최대 기록할 최적화 이력 수
const MAX_OPTIMIZATION_HISTORY = 50;

/**
 * 메모리 매니저 초기화
 * 네이티브 모듈 상태 확인 및 설정 로드
 */
export async function initializeMemoryManager(): Promise<boolean> {
  try {
    // 네이티브 모듈 상태 확인
    const { available, fallbackMode } = await getNativeModuleStatus();
    
    state.nativeAvailable = available;
    state.inFallbackMode = fallbackMode;
    state.lastNativeCheck = Date.now();
    
    // 설정 로드
    const settings = loadMemorySettings();
    
    // 자동 모니터링 설정 적용
    if (settings.enableAutomaticOptimization) {
      startMemoryMonitoring(settings);
    }
    
    // 성능 측정 설정에 따라 초기 벤치마크 실행
    if (settings.enablePerformanceMetrics && available) {
      setTimeout(() => {
        benchmarkMemoryOptimization(OptimizationLevel.LOW, false)
          .catch(err => console.error('초기 벤치마크 오류:', err));
      }, 5000);
    }
    
    // 초기화 성공 로깅
    logMemoryUsage(
      MemoryEventType.CUSTOM, 
      `메모리 매니저 초기화 완료 (네이티브: ${available}, 폴백 모드: ${fallbackMode})`
    );
    
    return true;
  } catch (error) {
    console.error('메모리 매니저 초기화 오류:', error);
    return false;
  }
}

/**
 * 네이티브 모듈 사용 가능 여부 확인
 * 필요 시 상태 새로고침
 */
export async function checkNativeAvailability(forceCheck: boolean = false): Promise<boolean> {
  const now = Date.now();
  
  // 마지막 확인 후 5분이 지났거나 강제 확인인 경우
  if (forceCheck || now - state.lastNativeCheck > 300000) {
    try {
      const { available, fallbackMode } = await getNativeModuleStatus();
      
      state.nativeAvailable = available;
      state.inFallbackMode = fallbackMode;
      state.lastNativeCheck = now;
      
      return available;
    } catch (error) {
      console.error('네이티브 모듈 확인 오류:', error);
      state.nativeAvailable = false;
      state.inFallbackMode = true;
      state.lastNativeCheck = now;
      return false;
    }
  }
  
  return state.nativeAvailable;
}

/**
 * 실패 기록 추가
 */
function recordFailure(operation: string, error: string): void {
  state.recentFailures.unshift({
    timestamp: Date.now(),
    operation,
    error
  });
  
  // 최대 개수 유지
  if (state.recentFailures.length > MAX_FAILURE_RECORDS) {
    state.recentFailures.pop();
  }
}

/**
 * 최적화 이력 추가
 */
function recordOptimization(
  level: OptimizationLevel,
  success: boolean,
  implementation: 'native' | 'js',
  freedMemory?: number
): void {
  state.optimizationHistory.unshift({
    timestamp: Date.now(),
    level,
    success,
    freedMemory,
    implementation
  });
  
  // 최대 개수 유지
  if (state.optimizationHistory.length > MAX_OPTIMIZATION_HISTORY) {
    state.optimizationHistory.pop();
  }
}

/**
 * 자동 폴백 기능이 있는 메모리 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 * @returns Promise<OptimizationResult> 최적화 결과
 */
export async function optimizeMemoryWithFallback(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<OptimizationResult> {
  // 설정 로드
  const settings = loadMemorySettings();
  
  // 메모리 최적화 로깅
  await logMemoryUsage(
    MemoryEventType.OPTIMIZATION,
    `메모리 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`
  );
  
  // 최적화 전 메모리 상태
  const memoryBeforeRaw = await getMemoryInfo() || createDefaultMemoryInfo();
  const memoryBefore = normalizeMemoryInfo(memoryBeforeRaw);
  
  // 설정에 따라 네이티브 또는 JS 구현 선택
  let useNative = settings.preferNativeImplementation && !state.inFallbackMode;
  
  // 네이티브 모듈 강제 체크
  if (useNative) {
    useNative = await checkNativeAvailability(true);
  }
  
  let optimizationResult: OptimizationResult | null = null;
  let error: string | undefined;
  
  try {
    // 네이티브 구현 시도
    if (useNative) {
      try {
        // 네이티브 레벨로 변환하여 전달
        const nativeLevel = toNativeOptimizationLevel(level);
        optimizationResult = await requestNativeMemoryOptimization(nativeLevel, emergency);
        
        if (optimizationResult) {
          // 성공 기록
          recordOptimization(
            level, 
            true, 
            'native', 
            optimizationResult.freed_mb
          );
          
          return optimizationResult;
        }
      } catch (err) {
        // 네이티브 실패 시 기록
        const errMsg = err instanceof Error ? err.message : String(err);
        error = errMsg;
        recordFailure('memory_optimization', errMsg);
        
        // 자동 폴백이 활성화된 경우
        if (settings.enableAutomaticFallback) {
          console.warn('네이티브 메모리 최적화 실패, 자동 폴백 활성화:', err);
          state.inFallbackMode = true;
          
          // 일정 시간 후 네이티브 모듈 재시도 설정
          setTimeout(() => {
            state.inFallbackMode = false;
            console.log('네이티브 모듈 폴백 모드 해제, 다음 요청 시 재시도');
          }, settings.fallbackRetryDelay);
        }
      }
    }
    
    // 네이티브 실패 시 JS 구현 사용
    if (!optimizationResult) {
      console.log('JavaScript 메모리 최적화 실행 중...');
      
      // JS 구현 실행
      const jsSuccess = await internalOptimizeMemory(emergency);
      
      // 최적화 후 메모리 상태 확인
      const memoryAfterRaw = await getMemoryInfo() || createDefaultMemoryInfo();
      const memoryAfter = normalizeMemoryInfo(memoryAfterRaw);
      
      // 해제된 메모리 계산 (표준화된 속성 사용)
      const freedMemory = Math.max(0, memoryBefore.heapUsedMB - memoryAfter.heapUsedMB);
      
      // 결과 생성
      optimizationResult = {
        success: jsSuccess,
        optimization_level: level,
        memory_before: memoryBefore,
        memory_after: memoryAfter,
        freed_memory: freedMemory * 1024 * 1024, // 바이트 단위
        freed_mb: freedMemory,
        duration: 0, // 측정 안 됨
        timestamp: Date.now(),
        error
      };
      
      // 결과 기록
      recordOptimization(level, jsSuccess, 'js', freedMemory);
    }
    
    // 최적화 완료 로깅
    await logMemoryUsage(
      MemoryEventType.OPTIMIZATION,
      `메모리 최적화 완료 (구현: ${useNative ? 'native' : 'js'}, 해제: ${optimizationResult?.freed_mb || 0}MB)`
    );
    
    return optimizationResult;
  } catch (finalError) {
    // 모든 시도 실패 시
    console.error('메모리 최적화 실패:', finalError);
    
    // 최종 오류 로깅
    await logMemoryUsage(
      MemoryEventType.ERROR,
      `메모리 최적화 실패: ${finalError}`
    );
    
    // 실패 결과 반환
    return {
      success: false,
      optimization_level: level,
      timestamp: Date.now(),
      error: finalError instanceof Error ? finalError.message : String(finalError)
    };
  }
}

/**
 * 자동 폴백 기능이 있는 가비지 컬렉션 수행
 * @param emergency 긴급 모드 여부
 * @returns Promise<GCResult> GC 결과
 */
export async function collectGarbageWithFallback(emergency: boolean = false): Promise<GCResult> {
  // 설정 로드
  const settings = loadMemorySettings();
  
  // GC 실행 로깅
  await logMemoryUsage(
    MemoryEventType.GARBAGE_COLLECTION,
    `가비지 컬렉션 실행 (긴급: ${emergency})`
  );
  
  // GC 전 메모리 상태
  const memoryBeforeRaw = await getMemoryInfo() || createDefaultMemoryInfo();
  const memoryBefore = normalizeMemoryInfo(memoryBeforeRaw);
  
  // 설정에 따라 네이티브 또는 JS 구현 선택
  let useNative = settings.preferNativeImplementation && !state.inFallbackMode;
  
  // 네이티브 모듈 강제 체크
  if (useNative) {
    useNative = await checkNativeAvailability();
  }
  
  let gcResult: GCResult | null = null;
  
  try {
    // 네이티브 구현 시도
    if (useNative) {
      try {
        gcResult = await requestNativeGarbageCollection();
        
        if (gcResult) {
          return gcResult;
        }
      } catch (err) {
        // 네이티브 실패 시 기록
        const errMsg = err instanceof Error ? err.message : String(err);
        recordFailure('garbage_collection', errMsg);
        
        // 자동 폴백이 활성화된 경우
        if (settings.enableAutomaticFallback) {
          console.warn('네이티브 GC 실패, 자동 폴백 활성화:', err);
          state.inFallbackMode = true;
          
          // 일정 시간 후 네이티브 모듈 재시도 설정
          setTimeout(() => {
            state.inFallbackMode = false;
          }, settings.fallbackRetryDelay);
        }
      }
    }
    
    // 네이티브 실패 시 JS 구현 사용
    if (!gcResult) {
      console.log('JavaScript GC 실행 중...');
      
      // JS 구현 실행
      const jsGcResult = await requestGC(emergency);
      
      // 결과 변환 (타입 호환성 보장)
      gcResult = {
        success: jsGcResult.success,
        memoryBefore: jsGcResult.memoryBefore ? normalizeMemoryInfo(jsGcResult.memoryBefore) : undefined,
        memoryAfter: jsGcResult.memoryAfter ? normalizeMemoryInfo(jsGcResult.memoryAfter) : undefined,
        freedMemory: jsGcResult.freedMemory,
        freedMB: jsGcResult.freedMB,
        timestamp: jsGcResult.timestamp,
        error: jsGcResult.error
      };
      
      // memoryAfter가 없는 경우 추가
      if (!gcResult.memoryAfter) {
        // 메모리 상태 업데이트
        const memoryAfterRaw = await getMemoryInfo() || createDefaultMemoryInfo();
        const memoryAfter = normalizeMemoryInfo(memoryAfterRaw);
        
        // 해제된 메모리 계산 (표준화된 속성 사용)
        const freedMemory = Math.max(0, memoryBefore.heapUsedMB - memoryAfter.heapUsedMB);
        
        // 결과 업데이트
        gcResult.memoryAfter = memoryAfter;
        gcResult.freedMemory = freedMemory * 1024 * 1024;
        gcResult.freedMB = freedMemory;
      }
    }
    
    // GC 완료 로깅
    await logMemoryUsage(
      MemoryEventType.GARBAGE_COLLECTION,
      `가비지 컬렉션 완료 (구현: ${useNative ? 'native' : 'js'}, 해제: ${gcResult?.freedMB || 0}MB)`
    );
    
    // null 체크 후 반환
    if (gcResult) {
      return gcResult;
    }
    
    // 결과가 없는 경우 기본 결과 생성
    return {
      success: false,
      timestamp: Date.now(),
      error: '가비지 컬렉션 결과를 얻을 수 없습니다'
    };
  } catch (error) {
    // 모든 시도 실패 시
    console.error('가비지 컬렉션 실패:', error);
    
    // 오류 로깅
    await logMemoryUsage(
      MemoryEventType.ERROR,
      `가비지 컬렉션 실패: ${error}`
    );
    
    // 실패 결과 반환
    return {
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 메모리 정보 가져오기 (자동 폴백)
 * @returns Promise<MemoryInfo> 메모리 정보
 */
export async function getMemoryInfoWithFallback(): Promise<MemoryInfo> {
  // 설정 로드
  const settings = loadMemorySettings();
  
  // 설정에 따라 네이티브 또는 JS 구현 선택
  let useNative = settings.preferNativeImplementation && !state.inFallbackMode;
  
  // 네이티브 모듈 체크
  if (useNative) {
    useNative = await checkNativeAvailability();
  }
  
  try {
    // 네이티브 구현 시도
    if (useNative) {
      try {
        const nativeInfo = await requestNativeMemoryInfo();
        if (nativeInfo) {
          return nativeInfo;
        }
      } catch (err) {
        // 네이티브 실패 시 기록
        const errMsg = err instanceof Error ? err.message : String(err);
        recordFailure('memory_info', errMsg);
        
        // 자동 폴백이 활성화된 경우
        if (settings.enableAutomaticFallback) {
          state.inFallbackMode = true;
          setTimeout(() => {
            state.inFallbackMode = false;
          }, settings.fallbackRetryDelay);
        }
      }
    }
    
    // 네이티브 실패 시 JS 구현 사용
    const jsMemInfo = await getMemoryInfo();
    
    // 타입 변환 및 반환
    return normalizeMemoryInfo(jsMemInfo);
    
    // 가져오기 실패 시 기본값 반환
    return createDefaultMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 실패:', error);
    
    // 기본 메모리 정보 반환
    return createDefaultMemoryInfo();
  }
}

/**
 * 자동 메모리 모니터링 시작
 * @param settings 메모리 설정
 */
export function startMemoryMonitoring(settings?: MemorySettings): () => void {
  // 이미 모니터링 중인 경우 중지
  stopMemoryMonitoring();
  
  // 설정 로드
  const config = settings || loadMemorySettings();
  
  // 활성화되지 않은 경우 중단
  if (!config.enableAutomaticOptimization) {
    return () => {};
  }
  
  state.monitoringActive = true;
  
  // 주기적 메모리 체크 및 최적화
  state.monitoringInterval = setInterval(async () => {
    try {
      // 최신 설정 다시 로드 (설정이 변경되었을 수 있음)
      const latestSettings = loadMemorySettings();
      
      // 메모리 정보 가져오기
      const memoryInfo = await getMemoryInfoWithFallback();
      
      // 임계값 초과 시 최적화 수행
      if (memoryInfo.heap_used_mb > latestSettings.optimizationThreshold) {
        console.log(`메모리 임계값 초과: ${memoryInfo.heap_used_mb}MB > ${latestSettings.optimizationThreshold}MB`);
        
        // 최적화 레벨 결정
        let level = OptimizationLevel.MEDIUM;
        if (memoryInfo.percent_used > 90) {
          level = OptimizationLevel.EXTREME;
        } else if (memoryInfo.percent_used > 80) {
          level = OptimizationLevel.HIGH;
        }
        
        // 최적화 수행
        await optimizeMemoryWithFallback(level, level === OptimizationLevel.EXTREME);
      }
    } catch (error) {
      console.error('자동 메모리 모니터링 오류:', error);
    }
  }, config.optimizationInterval);
  
  // 정리 함수 반환
  return stopMemoryMonitoring;
}

/**
 * 메모리 모니터링 중지
 */
export function stopMemoryMonitoring(): void {
  if (state.monitoringInterval) {
    clearInterval(state.monitoringInterval);
    state.monitoringInterval = null;
  }
  
  state.monitoringActive = false;
}

/**
 * 메모리 관리 상태 가져오기
 * @returns MemoryManagerState 현재 상태
 */
export function getMemoryManagerState(): Readonly<MemoryManagerState> {
  return { ...state };
}

/**
 * 모듈 폴백 모드 수동 설정
 * @param enabled 폴백 모드 활성화 여부
 */
export function setFallbackMode(enabled: boolean): void {
  state.inFallbackMode = enabled;
}

/**
 * 컴포넌트 언마운트 시 메모리 최적화 수행
 * @param componentId 컴포넌트 ID
 */
export async function optimizeOnComponentUnmount(componentId: string): Promise<void> {
  const settings = loadMemorySettings();
  const componentSettings = settings.componentSpecificSettings[componentId];
  
  // 컴포넌트 설정이 없거나 언마운트 시 최적화가 비활성화된 경우
  if (!componentSettings || !componentSettings.optimizeOnUnmount) {
    return;
  }
  
  // 메모리 사용량 로깅
  await logMemoryUsage(
    MemoryEventType.COMPONENT_UNMOUNT,
    `컴포넌트 언마운트 후 최적화`,
    componentId
  );
  
  // 선택적으로 적극적 정리 수행
  await optimizeMemoryWithFallback(
    OptimizationLevel.LOW,
    componentSettings.aggressiveCleanup
  );
}
