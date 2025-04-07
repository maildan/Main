'use client';

/**
 * 메모리 관련 React 훅 통합 모듈
 * 
 * 네이티브 모듈과 기존 JavaScript 최적화 기능을 통합하여 사용하는
 * React 훅을 제공합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/app/hooks/useToast';
import type { MemoryInfo, OptimizationResult, ProcessingMode } from '@/types';
import type { MemorySettings } from '@/types/memory-settings';
import { getMemoryInfo, optimizeMemory } from '@/app/utils/nativeModuleClient';
import { formatBytes } from '@/app/utils/format-utils';

export interface UseMemoryOptions {
  autoFetch?: boolean;
  interval?: number;
  autoOptimize?: boolean;
  threshold?: number;
  optimizationLevel?: number;
}

/**
 * 메모리 정보 및 최적화를 위한 훅
 */
export function useMemory(options: UseMemoryOptions = {}) {
  const {
    autoFetch = false,
    interval = 30000,
    autoOptimize = false,
    threshold = 80,
    optimizationLevel = 0
  } = options;

  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(autoOptimize);
  const [thresholdValue, setThresholdValue] = useState(threshold);
  const [optimizationLevelValue, _setOptimizationLevel] = useState<number>(optimizationLevel);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('auto' as ProcessingMode);
  const [lastUpdate, setLastUpdate] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // 메모리 정보 가져오기
  const fetchMemoryInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMemoryInfo();

      if (response.success && response.memoryInfo) {
        setMemoryInfo(response.memoryInfo);
        setLastUpdate(Date.now());
        setError(null);
        return response.memoryInfo;
      } else {
        setError(new Error(response.error || 'Failed to fetch memory info'));
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 메모리 최적화 실행
  const runMemoryOptimization = useCallback(async (level?: number) => {
    try {
      setLoading(true);

      const optimizeLvl = level !== undefined ? level : optimizationLevelValue;

      const response = await optimizeMemory(optimizeLvl);

      if (response.success) {
        await fetchMemoryInfo();
        showToast(`Memory Optimized: Freed ${response.result?.freed_mb.toFixed(2)} MB of memory`);
        return response.result;
      } else {
        setError(new Error(response.error || 'Optimization failed'));
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMemoryInfo, showToast, optimizationLevelValue]);

  // 자동 최적화 수행
  const checkAndOptimizeIfNeeded = useCallback(async () => {
    const info = await fetchMemoryInfo();

    if (info && autoOptimizeEnabled && info.percentUsed > thresholdValue) {
      await runMemoryOptimization();
    }
  }, [autoOptimizeEnabled, fetchMemoryInfo, thresholdValue, runMemoryOptimization]);

  // 초기화 및 주기적 실행
  useEffect(() => {
    if (autoFetch) {
      fetchMemoryInfo();
    }

    if (autoFetch && interval > 0) {
      intervalRef.current = setInterval(() => {
        autoOptimizeEnabled ? checkAndOptimizeIfNeeded() : fetchMemoryInfo();
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, autoOptimizeEnabled, checkAndOptimizeIfNeeded, fetchMemoryInfo, interval]);

  return {
    memoryInfo,
    loading,
    error,
    lastUpdate,
    optimizationLevelValue,
    fetchMemoryInfo,
    runMemoryOptimization,
    autoOptimizeEnabled,
    setAutoOptimizeEnabled,
    thresholdValue,
    setThresholdValue,
    processingMode,
    setProcessingMode
  };
}

/**
 * 메모리 설정 관리를 위한 훅
 */
export function useMemorySettings() {
  const [settings, setSettings] = useState<MemorySettings>({
    preferNativeImplementation: true,
    enableAutomaticFallback: true,
    enableAutomaticOptimization: false,
    optimizationThreshold: 200,
    optimizationInterval: 120000,
    aggressiveGC: false,
    enableLogging: false,
    enablePerformanceMetrics: true,
    useMemoryPool: true,
    fallbackRetryDelay: 300000,
    poolCleanupInterval: 180000,
    processingMode: 'auto' as ProcessingMode,
    componentSpecificSettings: {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
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

  const saveSettings = useCallback((newSettings: Partial<MemorySettings>) => {
    try {
      setLoading(true);

      const updatedSettings = { ...settings, ...newSettings };

      localStorage.setItem('memorySettings', JSON.stringify(updatedSettings));

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
  const { memoryInfo } = useMemory({ autoFetch: true, interval });

  useEffect(() => {
    const logMemoryUsage = () => {
      if (memoryInfo) {
        console.log(`Memory Usage: ${memoryInfo.percentUsed}%`);
      }
    };

    const intervalId = setInterval(logMemoryUsage, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [memoryInfo, interval]);
}

/**
 * 메모리 사용량이 높을 때 자동 최적화를 수행하는 훅
 */
export function useAutoMemoryOptimization(options: {
  enabled?: boolean;
  threshold?: number;
  interval?: number;
  showNotifications?: boolean;
} = {}) {
  const {
    enabled = true,
    threshold = 80,
    interval = 60000,
    showNotifications = true
  } = options;

  const { showToast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runOptimization = useCallback(async () => {
    if (!enabled || isOptimizing) return;

    try {
      setIsOptimizing(true);

      const memoryResponse = await getMemoryInfo();

      if (!memoryResponse.success) {
        throw new Error(memoryResponse.error || 'Failed to get memory info');
      }

      const memInfo = memoryResponse.memoryInfo;

      if (memInfo && memInfo.percentUsed > threshold) {
        const optimizationLevel =
          memInfo.percentUsed > 90 ? 3 :
            memInfo.percentUsed > 80 ? 2 : 1;

        const optimizationResponse = await optimizeMemory(optimizationLevel);

        if (optimizationResponse?.success && optimizationResponse?.result) {
          setLastOptimization(optimizationResponse.result);

          if (showNotifications) {
            const freedMB = optimizationResponse.result?.freed_mb || 0;
            showToast(`Memory Optimized: Freed ${freedMB.toFixed(2)} MB of memory`);
          }
        }
      }
    } catch (err) {
      if (showNotifications) {
        showToast(`Memory Optimization Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [enabled, isOptimizing, threshold, showNotifications, showToast]);

  useEffect(() => {
    if (enabled && interval > 0) {
      runOptimization();

      intervalRef.current = setInterval(runOptimization, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, runOptimization]);

  return {
    isOptimizing,
    lastOptimization,
    optimizeMemory: runOptimization
  };
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
