/**
 * 메모리 관련 React 훅 통합 모듈
 * 
 * 네이티브 모듈과 기존 JavaScript 최적화 기능을 통합하여 사용하는
 * React 훅을 제공합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../components/ToastContext';
import { MemoryOptimizerOptions } from './types';
import { getMemoryInfo } from '../memory-management';
import { requestGC } from './gc-utils';
import { requestNativeMemoryOptimization, requestNativeGarbageCollection } from '../native-memory-bridge';
import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel } from '../enum-converters';
import { optimizeMemory, getMemoryInfo as fetchMemoryInfo } from '../memory-optimizer';
import { OptimizationLevel } from './types';
import { MemoryInfo } from '@/types';

/**
 * 메모리 최적화 훅 (통합 버전)
 * 이 훅은 네이티브 모듈 및 JS 최적화 기능을 모두 활용합니다.
 * 
 * @param {MemoryOptimizerOptions} options 메모리 최적화 옵션
 * @returns {Object} 메모리 정보 및 컨트롤 함수
 */
export function useMemoryOptimizer(options: MemoryOptimizerOptions = {}) {
  // 기본 옵션 설정
  const {
    threshold = 75, // 기본 임계치 75MB
    checkInterval = 30000, // 기본 체크 간격 30초
    showWarnings = true,
    autoOptimize = true,
    debug = false,
    preferNative = true, // 네이티브 모듈 우선 사용 여부
  } = options;
  
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    lastRun: number | null,
    totalOptimizations: number,
    freedMemory: number
  }>({
    lastRun: null,
    totalOptimizations: 0,
    freedMemory: 0
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  
  // 메모리 정보 갱신 함수
  const updateMemoryInfo = useCallback(() => {
    getMemoryInfo().then((info: MemoryInfo | null) => {
      if (info) {
        setMemoryInfo(info);
        
        // 임계치 초과 체크 - 필드 이름 호환성 처리
        const heapUsedMB = info.heap_used_mb || 0;
        
        if (showWarnings && heapUsedMB > threshold) {
          if (debug) {
            console.warn(`메모리 사용량 경고: ${heapUsedMB}MB (임계치: ${threshold}MB)`);
          }
          
          // 토스트 메시지로 경고 표시
          showToast(`메모리 사용량이 높습니다: ${heapUsedMB}MB`, 'warning');
          
          // 자동 최적화가 활성화된 경우 메모리 정리 수행
          if (autoOptimize) {
            runMemoryOptimization();
          }
        }
      }
      
      return info;
    });
  }, [threshold, showWarnings, autoOptimize, debug, showToast]);
  
  // 메모리 최적화 실행 함수 (통합 버전)
  const runMemoryOptimization = useCallback(async () => {
    try {
      if (isOptimizing) return; // 이미 최적화 중이면 중복 실행 방지
      
      setIsOptimizing(true);
      
      if (debug) {
        console.log('메모리 최적화 시작...');
      }
      
      let optimizationResult = null;
      
      // 네이티브 모듈 우선 사용 시도
      if (preferNative) {
        try {
          // 중간 수준 최적화 수행
          const appLevel = AppOptimizationLevel.MEDIUM;
          const nativeLevel = toNativeOptimizationLevel(appLevel);
          optimizationResult = await requestNativeMemoryOptimization(
            nativeLevel, 
            false
          );
          
          if (debug && optimizationResult) {
            console.log('네이티브 메모리 최적화 성공');
          }
        } catch (error) {
          if (debug) {
            console.warn('네이티브 최적화 실패, JS 최적화로 폴백:', error);
          }
        }
      }
      
      // 네이티브 최적화 실패 또는 선호하지 않는 경우 JavaScript 최적화 사용
      if (!optimizationResult) {
        // 전역 메모리 최적화 유틸리티 사용
        if (window.__memoryOptimizer?.optimizeMemory) {
          await window.__memoryOptimizer.optimizeMemory(false);
        }
        
        // GC 요청
        await requestGC();
      }
      
      // 최적화 통계 업데이트
      setOptimizationStats(prev => ({
        lastRun: Date.now(),
        totalOptimizations: prev.totalOptimizations + 1,
        freedMemory: prev.freedMemory + (optimizationResult?.freed_mb || 0)
      }));
      
      // GC 요청이 처리될 시간 제공
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 최적화 후 메모리 정보 갱신
      updateMemoryInfo();
      
      // 완료 알림 (디버그 모드일 때만)
      if (debug) {
        console.log('메모리 최적화 완료');
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug, preferNative, showToast]);
  
  // 긴급 메모리 최적화 실행 함수 (통합 버전)
  const runEmergencyOptimization = useCallback(async () => {
    try {
      if (isOptimizing) return;
      
      setIsOptimizing(true);
      showToast('긴급 메모리 최적화를 실행합니다...', 'info');
      
      let optimizationResult = null;
      
      // 네이티브 모듈 우선 사용 시도
      if (preferNative) {
        try {
          // 높은 수준 (긴급) 최적화 수행
          const appLevel = AppOptimizationLevel.EXTREME;
          const nativeLevel = toNativeOptimizationLevel(appLevel);
          optimizationResult = await requestNativeMemoryOptimization(
            nativeLevel, 
            true
          );
          
          if (debug && optimizationResult) {
            console.log('네이티브 긴급 메모리 최적화 성공');
          }
        } catch (error) {
          if (debug) {
            console.warn('네이티브 긴급 최적화 실패, JS 최적화로 폴백:', error);
          }
        }
      }
      
      // 네이티브 최적화 실패 또는 선호하지 않는 경우 JavaScript 최적화 사용
      if (!optimizationResult) {
        // 전역 메모리 최적화 유틸리티 사용
        if (window.__memoryOptimizer?.optimizeMemory) {
          await window.__memoryOptimizer.optimizeMemory(true); // 적극적 모드
        }
        
        // 긴급 GC 요청
        await requestGC(true);
      }
      
      // 최적화 통계 업데이트
      setOptimizationStats(prev => ({
        lastRun: Date.now(),
        totalOptimizations: prev.totalOptimizations + 1,
        freedMemory: prev.freedMemory + (optimizationResult?.freed_mb || 0)
      }));
      
      // GC 요청 후 충분한 처리 시간 제공
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 최적화 후 메모리 정보 갱신
      const newInfo = updateMemoryInfo();
      
      // 최적화 결과 알림
      if (debug && newInfo) {
        const heapUsedMB = typeof newInfo === 'object' && newInfo ? (newInfo as any).heap_used_mb || 0 : 0;
        showToast(`메모리 최적화 완료: ${heapUsedMB}MB`, 'success');
      }
    } catch (error) {
      console.error('긴급 메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug, preferNative, showToast]);
  
  // 주기적 메모리 모니터링 설정
  useEffect(() => {
    // 초기 메모리 정보 확인
    updateMemoryInfo();
    
    // 주기적인 메모리 체크 시작
    intervalRef.current = setInterval(() => {
      updateMemoryInfo();
    }, checkInterval);
    
    // 페이지 가시성 변경 이벤트에 따른 처리
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 메모리 정보 갱신
        updateMemoryInfo();
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 클린업 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateMemoryInfo, checkInterval]);
  
  // 메인 프로세스로부터의 메모리 최적화 요청 처리
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Electron IPC 이벤트 리스너 설정 (메인 프로세스로부터의 GC 요청 처리)
    if (window.electronAPI && window.electronAPI.onRequestGC) {
      cleanup = window.electronAPI.onRequestGC((data: { emergency: boolean }) => {
        if (data.emergency) {
          runEmergencyOptimization();
        } else {
          runMemoryOptimization();
        }
        
        // 결과 알림
        if (window.electronAPI && window.electronAPI.rendererGCCompleted) {
          const info = getMemoryInfo();
          window.electronAPI.rendererGCCompleted({
            timestamp: Date.now(),
            success: true,
            memoryInfo: info,
          });
        }
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [runMemoryOptimization, runEmergencyOptimization]);
  
  return {
    memoryInfo,
    isOptimizing,
    stats: optimizationStats,
    updateMemoryInfo,
    optimizeMemory: runMemoryOptimization,
    emergencyOptimize: runEmergencyOptimization,
  };
}

/**
 * 메모리 정보 훅
 * @returns 메모리 정보, 로딩 상태, 오류
 */
export function useMemoryInfo(refreshInterval = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const info = await fetchMemoryInfo();
      setMemoryInfo(info);
      setError(null);
    } catch (err) {
      console.error('메모리 정보 가져오기 오류:', err);
      setError(err instanceof Error ? err.message : '메모리 정보를 가져오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);
  
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);
  
  return { memoryInfo, loading, error, refresh };
}

/**
 * 메모리 사용량 표시 훅
 * @returns 메모리 정보 및 표시 상태
 */
export function useMemoryDisplay(refreshInterval = 5000) {
  const { memoryInfo, loading, error, refresh } = useMemoryInfo(refreshInterval);
  const [displayData, setDisplayData] = useState({
    heapUsedMB: 0,
    percentUsed: 0,
    status: 'normal'
  });
  
  useEffect(() => {
    if (memoryInfo) {
      // 타입 안전하게 속성 접근
      const memInfo = memoryInfo as any;
      const heapUsedMB = memInfo?.heap_used_mb || memInfo?.heapUsedMB || 0;
      const percentUsed = memInfo?.percent_used || memInfo?.percentUsed || 0;
      
      let status = 'normal';
      if (percentUsed > 90) status = 'critical';
      else if (percentUsed > 75) status = 'high';
      else if (percentUsed > 60) status = 'medium';
      
      setDisplayData({
        heapUsedMB,
        percentUsed,
        status
      });
    }
  }, [memoryInfo]);
  
  return { 
    ...displayData, 
    memoryInfo, 
    loading, 
    error, 
    refresh 
  };
}

/**
 * 메모리 최적화 훅
 * @returns 최적화 함수, 결과, 로딩 상태
 */
export function useMemoryOptimization() {
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optimizeWithLevel = useCallback(async (level: OptimizationLevel) => {
    try {
      setLoading(true);
      setError(null);
      
      // 타입 변환을 통해 앱 전역 OptimizationLevel로 변환
      // OptimizationLevel 타입을 any로 먼저 변환하여 타입 호환성 문제 해결
      const result = await optimizeMemory(level as any);
      setOptimizationResult(result);
      
      return result;
    } catch (err) {
      console.error('메모리 최적화 오류:', err);
      setError(err instanceof Error ? err.message : '메모리 최적화 실패');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const optimize = useCallback(async (aggressive = false) => {
    // 타입 호환성을 위해 숫자형으로 직접 사용
    const level = aggressive ? 3 /* High */ : 2 /* Medium */;
    return optimizeWithLevel(level as OptimizationLevel);
  }, [optimizeWithLevel]);
  
  return {
    optimize,
    optimizeWithLevel,
    optimizationResult,
    loading,
    error,
    // 결과 내 속성에 안전하게 접근
    freedMB: optimizationResult?.freed_mb ?? 0
  };
}

/**
 * 자동 메모리 최적화 훅
 * @param options 최적화 옵션
 */
export function useAutomaticMemoryOptimization(options: {
  enabled?: boolean;
  thresholdMB?: number;
  thresholdPercent?: number;
  checkInterval?: number;
  aggressiveThresholdMB?: number;
  aggressiveThresholdPercent?: number;
} = {}) {
  const {
    enabled = true,
    thresholdMB = 100,
    thresholdPercent = 75,
    checkInterval = 30000,
    aggressiveThresholdMB = 200,
    aggressiveThresholdPercent = 90
  } = options;
  
  const [isActive, setIsActive] = useState(enabled);
  const [status, setStatus] = useState('idle');
  const [lastOptimized, setLastOptimized] = useState(0);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  
  const intervalRef = useRef<number | null>(null);
  const { optimize } = useMemoryOptimization();
  
  // 메모리 체크 함수
  const checkMemory = useCallback(async () => {
    if (!isActive) return;
    
    try {
      setStatus('checking');
      const info = await fetchMemoryInfo();
      setMemoryInfo(info);
      
      if (!info) return;
      
      // 힙 사용량 안전하게 접근
      const heapUsedMB = info.heap_used_mb || info.heapUsedMB || 0;
      const percentUsed = info.percent_used || info.percentUsed || 0;
      
      const needsOptimization = heapUsedMB > thresholdMB || percentUsed > thresholdPercent;
      const needsAggressiveOptimization = heapUsedMB > aggressiveThresholdMB || percentUsed > aggressiveThresholdPercent;
      
      if (needsOptimization) {
        setStatus('optimizing');
        await optimize(needsAggressiveOptimization);
        setLastOptimized(Date.now());
        setStatus('idle');
      }
    } catch (err) {
      console.error('자동 메모리 최적화 오류:', err);
      setStatus('error');
    }
  }, [isActive, optimize, thresholdMB, thresholdPercent, aggressiveThresholdMB, aggressiveThresholdPercent]);
  
  // 자동 최적화 시작/중지
  useEffect(() => {
    if (isActive && !intervalRef.current && checkInterval > 0) {
      // 초기 체크
      checkMemory();
      // 주기적 체크 시작
      intervalRef.current = window.setInterval(checkMemory, checkInterval) as unknown as number;
    }
    
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, checkInterval, checkMemory]);
  
  // 사용자 제어 함수
  const start = useCallback(() => setIsActive(true), []);
  const stop = useCallback(() => setIsActive(false), []);
  const check = useCallback(() => checkMemory(), [checkMemory]);
  
  return {
    isActive,
    status,
    memoryInfo,
    lastOptimized,
    start,
    stop,
    check
  };
}
