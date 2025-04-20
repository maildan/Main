'use client';

/**
 * 메모리 관련 React 훅 통합 모듈
 * 
 * 네이티브 모듈과 기존 JavaScript 최적화 기능을 통합하여 사용하는
 * React 훅을 제공합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/app/hooks/useToast';
import type { MemoryInfo, MemorySettings, OptimizationResult } from '@/types';
import { ProcessingMode } from '@/types';
// formatBytes 함수 import 경로 수정
import { formatBytes } from '@/app/utils/format-utils';
import { OptimizationLevel } from '@/types/optimization-level';
// import { useInterval } from './useInterval'; // Module not found, commenting out
import { nativeModuleClient } from '../nativeModuleClient';

export interface UseMemoryOptions {
  autoFetch?: boolean;
  interval?: number;
  autoOptimize?: boolean;
  threshold?: number;
  optimizationLevel?: OptimizationLevel;
}

/**
 * 메모리 정보 및 최적화를 위한 훅
 */
export function useMemory(options: UseMemoryOptions = {}) {
  const {
    autoFetch = true,
    interval = 5000,
    autoOptimize = false,
    threshold = 150, // 기본 150MB
    optimizationLevel = OptimizationLevel.MEDIUM,
  } = options;

  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();

  const fetchMemoryInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nativeModuleClient.getMemoryInfo();
      if (data) {
        setMemoryInfo(data);
        setLastUpdate(Date.now());

        if (autoOptimize && data.heap_used_mb > threshold && !optimizing) {
          addToast(`메모리 사용량(${data.heap_used_mb.toFixed(1)}MB)이 임계값(${threshold}MB)을 초과하여 최적화를 시도합니다.`, 'warning');
          runOptimization();
        }
      } else {
        setError('Failed to fetch memory info (null returned)');
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred while fetching memory info');
    } finally {
      setLoading(false);
    }
  }, [autoOptimize, threshold, optimizing, addToast]);

  const runOptimization = useCallback(async () => {
    if (optimizing) return;
    setOptimizing(true);
    try {
      const result = await nativeModuleClient.optimizeMemory(optimizationLevel);
      if (result.success) {
        addToast('메모리 최적화가 완료되었습니다.', 'success');
        fetchMemoryInfo();
      } else {
        addToast(`메모리 최적화 실패: ${result.error || '알 수 없는 오류'}`, 'error');
      }
    } catch (err: any) {
      addToast(`메모리 최적화 중 오류 발생: ${err.message || '알 수 없는 오류'}`, 'error');
    } finally {
      setOptimizing(false);
    }
  }, [optimizing, optimizationLevel, addToast, fetchMemoryInfo]);

  useEffect(() => {
    fetchMemoryInfo();
    let intervalId: NodeJS.Timeout | null = null;
    if (autoFetch && interval > 0) {
      intervalId = setInterval(fetchMemoryInfo, interval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoFetch, interval, fetchMemoryInfo]);

  return {
    memoryInfo,
    loading,
    error,
    optimizing,
    lastUpdate,
    fetchMemoryInfo,
    runOptimization,
  };
}

/**
 * 메모리 설정 관리를 위한 훅
 */
export function useMemorySettings() {
  const [settings, setSettings] = useState<MemorySettings>({
    // 필수 필드 추가
    enableAutoOptimization: true,
    autoOptimizationInterval: 120000,
    memoryThreshold: 200,
    aggressiveCleanup: false,
    optimizeOnUnmount: true,
    releaseResourcesOnHide: true,
    enableNativeOptimization: true,
    cacheLifetime: 3600000,
    maxCacheSize: 50,
    debugMode: false,

    // 기존에 있던 필드
    preferNativeImplementation: true,
    enableAutomaticFallback: true,
    enableAutomaticOptimization: false,
    optimizationThreshold: 200,
    optimizationInterval: 30000,
    aggressiveGC: false,
    enableLogging: false,
    enablePerformanceMetrics: true,
    useMemoryPool: true,
    fallbackRetryDelay: 300000,
    poolCleanupInterval: 180000,
    processingMode: ProcessingMode.AUTO,
    componentSpecificSettings: {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 설정 로드
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // localStorage에서 설정 로드
      const savedSettings = localStorage.getItem('memorySettings');

      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // 설정 저장
  const saveSettings = useCallback((newSettings: Partial<MemorySettings>) => {
    try {
      setLoading(true);

      // 기존 설정과 병합
      const updatedSettings = { ...settings, ...newSettings };

      // localStorage에 저장
      localStorage.setItem('memorySettings', JSON.stringify(updatedSettings));

      // 상태 업데이트
      setSettings(updatedSettings);
      setError(null);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // 초기화
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    loadSettings
  };
}

/**
 * 메모리 사용량 로깅을 위한 훅
 */
export function useMemoryLogging(interval = 60000) {
  useEffect(() => {
    const logMemoryUsage = () => {
      // 로그 기록 로직 (예시)
      console.log('Logging memory usage at interval:', interval);
    };
    const id = setInterval(logMemoryUsage, interval);
    return () => clearInterval(id);
  }, [interval]);
}

/**
 * 메모리 사용량이 높을 때 자동 최적화를 수행하는 훅
 */
export function useAutoMemoryOptimization(options: {
  thresholdRatio?: number;
  checkInterval?: number;
  optimizationLevel?: OptimizationLevel;
  onOptimize?: (result: OptimizationResult) => void;
  onError?: (error: Error) => void;
} = {}) {
  const {
    thresholdRatio = 0.8,
    checkInterval = 60000, // Default: 1 minute
    optimizationLevel = OptimizationLevel.MEDIUM, // Correct enum case
    onOptimize,
    onError
  } = options;

  const { optimize, isOptimizing } = useMemoryOptimization();
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndOptimize = useCallback(async () => {
    if (isOptimizing) return;

    try {
      const memoryInfo = await nativeModuleClient.getMemoryInfo();
      if (!memoryInfo) return;

      const usageRatio = memoryInfo.percent_used !== undefined ? memoryInfo.percent_used / 100 : 0;
      console.debug(`Memory Usage Ratio: ${usageRatio.toFixed(2)}, Threshold: ${thresholdRatio}`);

      if (usageRatio > thresholdRatio) {
        console.warn(`Memory usage (${(usageRatio * 100).toFixed(1)}%) exceeds threshold (${(thresholdRatio * 100).toFixed(1)}%). Optimizing...`);
        const result = await optimize(optimizationLevel);
        if (onOptimize) {
          onOptimize(result);
        }
      }
    } catch (err: any) {
      console.error('Error during auto memory check/optimize:', err);
      if (onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [isOptimizing, thresholdRatio, optimizationLevel, optimize, onOptimize, onError]);

  useEffect(() => {
    let id: NodeJS.Timeout | null = null;
    if (checkInterval > 0) {
      id = setInterval(checkAndOptimize, checkInterval);
      intervalIdRef.current = id;
    } else if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [checkInterval, checkAndOptimize]);

  return { isOptimizing };
}

/**
 * 포맷된 메모리 정보를 제공하는 훅
 */
export function useFormattedMemoryInfo(options: {
  autoFetch?: boolean;
  interval?: number;
} = {}) {
  const {
    autoFetch = true,
    interval = 30000
  } = options;

  const { memoryInfo, loading, error, fetchMemoryInfo } =
    useMemory({ autoFetch, interval });

  // 포맷된 메모리 정보 - undefined 처리 추가
  const formattedInfo = memoryInfo ? {
    heapUsed: formatBytes(memoryInfo.heapUsed ?? 0),
    heapTotal: formatBytes(memoryInfo.heapTotal ?? 0),
    rss: formatBytes(memoryInfo.rss ?? 0),
    percentUsed: `${memoryInfo.percentUsed?.toFixed(1) ?? '0'}%`,
    heapUsedMB: `${memoryInfo.heapUsedMB?.toFixed(2) ?? '0'} MB`,
    rssMB: `${memoryInfo.rssMB?.toFixed(2) ?? '0'} MB`,
    timestamp: new Date(memoryInfo.timestamp).toLocaleTimeString()
  } : null;

  return {
    memoryInfo,
    formattedInfo,
    loading,
    error,
    fetchMemoryInfo
  };
}

/**
 * 임계값에 따른 메모리 상태를 제공하는 훅
 */
export function useMemoryStatus(thresholds: {
  warning?: number;
  critical?: number;
} = {}) {
  const { warning = 70, critical = 85 } = thresholds;

  const { memoryInfo, loading, error, fetchMemoryInfo } =
    useMemory({ autoFetch: true });

  // 메모리 상태 결정 - null 체크 및 옵셔널 체이닝 추가
  const status = memoryInfo
    ? ((memoryInfo.percentUsed ?? 0) >= critical
      ? 'critical'
      : (memoryInfo.percentUsed ?? 0) >= warning
        ? 'warning'
        : 'normal')
    : 'unknown';

  return {
    memoryInfo,
    status,
    loading,
    error,
    fetchMemoryInfo,
    isNormal: status === 'normal',
    isWarning: status === 'warning',
    isCritical: status === 'critical'
  };
}

/**
 * 지정된 간격으로 콜백 함수를 실행하는 훅
 */
export function useIntervalEffect(
  callback: () => void,
  interval: number,
  dependencies: any[] = []
): void {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback, ...dependencies]); // 의존성 배열 포함

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (interval !== null) {
      const id = setInterval(tick, interval);
      return () => clearInterval(id);
    }
    return undefined; // 명시적 반환
  }, [interval]);
}

/**
 * 메모리 사용량 정보를 주기적으로 가져오는 훅
 */
interface MemoryUsageResult {
  memoryInfo: MemoryInfo | null;
  fetchMemoryInfo: () => Promise<void>;
  loading: boolean;
}
export function useMemoryUsage(pollInterval = 5000): MemoryUsageResult {
  const { memoryInfo, loading, fetchMemoryInfo } = useMemory({ autoFetch: true, interval: pollInterval });

  // 이제 memoryInfo는 이미 올바른 타입이므로 performance.memory 관련 코드는 불필요
  // useEffect(() => { ... }, [fetchMemoryInfo]); // 초기 로드 관리

  return { memoryInfo, loading, fetchMemoryInfo };
}

/**
 * 메모리 최적화 훅 (Single declaration)
 */
export function useMemoryOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastResult, setLastResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(async (level: OptimizationLevel = OptimizationLevel.MEDIUM) => {
    setIsOptimizing(true);
    setError(null);
    try {
      const result = await nativeModuleClient.optimizeMemory(level);
      setLastResult(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || '메모리 최적화 실패';
      setError(errorMessage);
      console.error(errorMessage, err);
      return { success: false, optimizationLevel: level, timestamp: Date.now(), freedMemory: 0, error: errorMessage } as OptimizationResult;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return { optimize, isOptimizing, lastResult, error };
}

/**
 * 컴포넌트 언마운트 시 또는 의존성 변경 시 리소스 정리 함수 실행 훅
 */
export function useResourceCleanup(cleanupFunctions: (() => void)[], dependencies: any[] = []): void {
  useEffect(() => {
    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Resource cleanup function failed:', error);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies); // 의존성 배열을 올바르게 사용
}

/**
 * 메모리 최적화 스케줄링 훅
 */
interface OptimizationSchedulerResult {
  scheduleOptimization: (level: OptimizationLevel, delay?: number) => void;
  cancelScheduledOptimization: () => void;
  isOptimizationScheduled: boolean;
}
export function useOptimizationScheduler(): OptimizationSchedulerResult {
  const [isScheduled, setIsScheduled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast(); // addToast 사용

  const scheduleOptimization = useCallback((level: OptimizationLevel, delay = 5000) => { // 기본 5초 지연
    cancelScheduledOptimization(); // 기존 예약 취소

    timeoutRef.current = setTimeout(async () => {
      setIsScheduled(false);
      try {
        addToast(`예약된 메모리 최적화(레벨 ${level}) 실행 중...`, 'info');
        const response = await fetch('/api/native/memory/optimize', { // API 호출
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level }),
        });
        const result = await response.json();
        if (result.success) {
          addToast('예약된 메모리 최적화 완료.', 'success');
        } else {
          addToast(`예약된 메모리 최적화 실패: ${result.error || '알 수 없음'}`, 'error');
        }
      } catch (error: any) {
        addToast(`예약된 최적화 실행 오류: ${error.message || '알 수 없음'}`, 'error');
      }
    }, delay);

    setIsScheduled(true);
    addToast(`메모리 최적화가 ${delay / 1000}초 후에 실행되도록 예약되었습니다.`, 'info');
  }, [addToast]); // cancelScheduledOptimization 의존성 제거

  const cancelScheduledOptimization = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsScheduled(false);
      addToast('예약된 메모리 최적화가 취소되었습니다.', 'info');
    }
  }, [addToast]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    scheduleOptimization,
    cancelScheduledOptimization,
    isOptimizationScheduled: isScheduled,
  };
}

/**
 * 가비지 컬렉션 요청 및 이벤트 처리 훅
 */
interface GCHandlerOptions {
  onGcStart?: () => void;
  onGcEnd?: (duration: number) => void;
}
export function useGCHandler(options?: GCHandlerOptions): void {
  const { onGcStart, onGcEnd } = options || {};

  const requestGC = useCallback(async () => {
    if (typeof window.gc === 'function') {
      onGcStart?.();
      const startTime = performance.now();
      try {
        // V8 엔진의 GC 직접 호출 (만약 노출되어 있다면)
        window.gc();
        const duration = performance.now() - startTime;
        console.log(`Manual GC completed in ${duration.toFixed(2)}ms`);
        onGcEnd?.(duration);
      } catch (e) {
        console.warn('Manual GC call failed:', e);
        onGcEnd?.(-1); // 실패 시 -1 전달
      }
    } else {
      console.warn('window.gc is not available. Run with --expose-gc flag.');
      // 필요하다면 대체 로직 (예: API 호출)
    }
  }, [onGcStart, onGcEnd]);

  // 필요하다면 여기에 GC 관련 이벤트 리스너 등을 추가
  // 예: performance.addEventListener('gc', ...) 

  // 훅 사용 예시: 
  // const { requestGC } = useGCHandler({ onGcEnd: (duration) => console.log(duration) });
  // <button onClick={requestGC}>Run GC</button>

  // 이 훅 자체는 UI나 상태를 반환하지 않음 (필요시 requestGC 함수 반환 가능)
}
