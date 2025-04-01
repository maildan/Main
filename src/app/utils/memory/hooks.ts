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
import { getMemoryInfo, optimizeMemory } from '@/app/utils/nativeModuleClient';
// formatBytes 함수 import 경로 수정
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
  const [error, setError] = useState<string | null>(null);
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
        setError(response.error || 'Failed to fetch memory info');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 메모리 최적화 실행
  const runMemoryOptimization = useCallback(async (level?: number) => {
    try {
      setLoading(true);
      
      // 최적화 레벨 결정 - 선언 전 참조 오류 수정
      const optimizeLvl = level !== undefined ? level : optimizationLevel;
      
      // 메모리 최적화 수행
      const response = await optimizeMemory(optimizeLvl);
      
      if (response.success) {
        // 최적화 후 메모리 정보 갱신
        await fetchMemoryInfo();
        
        // 알림 표시 (옵션에 따라) - showToast의 인수 타입 수정
        showToast(`Memory Optimized: Freed ${response.result?.freed_mb.toFixed(2)} MB of memory`);
        
        return response.result;
      } else {
        setError(response.error || 'Optimization failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMemoryInfo, showToast, optimizationLevel]);
  
  // 자동 최적화 수행
  const checkAndOptimizeIfNeeded = useCallback(async () => {
    const info = await fetchMemoryInfo();
    
    if (info && autoOptimize && info.percentUsed > threshold) {
      await runMemoryOptimization();
    }
  }, [autoOptimize, fetchMemoryInfo, threshold, runMemoryOptimization]);
  
  // 초기화 및 주기적 실행
  useEffect(() => {
    // 초기 데이터 로드
    if (autoFetch) {
      fetchMemoryInfo();
    }
    
    // 주기적 갱신 설정
    if (autoFetch && interval > 0) {
      intervalRef.current = setInterval(() => {
        autoOptimize ? checkAndOptimizeIfNeeded() : fetchMemoryInfo();
      }, interval);
    }
    
    // 정리 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, autoOptimize, checkAndOptimizeIfNeeded, fetchMemoryInfo, interval]);
  
  return {
    memoryInfo,
    loading,
    error,
    lastUpdate,
    optimizationLevel,
    fetchMemoryInfo,
    runMemoryOptimization
  };
}

/**
 * 메모리 설정 관리를 위한 훅
 */
export function useMemorySettings() {
  // MemorySettings 인터페이스에 맞게 초기값 설정
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
    processingMode: 'auto',
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
  // 앞에 _를 추가하여 사용하지 않는 변수 표시
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
  
  // optimizeMemory 함수 import에 맞게 타입 수정
  const runOptimization = useCallback(async () => {
    if (!enabled || isOptimizing) return;
    
    try {
      setIsOptimizing(true);
      
      // 현재 메모리 정보 가져오기
      const memoryResponse = await getMemoryInfo();
      
      if (!memoryResponse.success) {
        throw new Error(memoryResponse.error || 'Failed to get memory info');
      }
      
      const memInfo = memoryResponse.memoryInfo;
      
      // 임계값을 초과하는지 확인
      if (memInfo && memInfo.percentUsed > threshold) {
        // 최적화 수행
        const optimizationLevel = 
          memInfo.percentUsed > 90 ? 3 : 
          memInfo.percentUsed > 80 ? 2 : 1;
        
        const optimizationResponse = await optimizeMemory(optimizationLevel);
        
        if (optimizationResponse?.success && optimizationResponse?.result) {
          setLastOptimization(optimizationResponse.result);
          
          // 알림 표시 (옵션에 따라)
          if (showNotifications) {
            const freedMB = optimizationResponse.result?.freed_mb || 0;
            // 문자열로 변경
            showToast(`Memory Optimized: Freed ${freedMB.toFixed(2)} MB of memory`);
          }
        }
      }
    } catch (err) {
      if (showNotifications) {
        // 문자열로 변경
        showToast(`Memory Optimization Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [enabled, isOptimizing, threshold, showNotifications, showToast]);
  
  // 주기적 검사 설정
  useEffect(() => {
    if (enabled && interval > 0) {
      // 초기 최적화 실행
      runOptimization();
      
      // 주기적 최적화 설정
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
