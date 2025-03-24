import { useState, useEffect, useCallback } from 'react';
import { 
  getMemoryInfo, 
  optimizeMemory,
  forceGarbageCollection
} from '../utils/nativeModuleClient';
import type { MemoryInfo, OptimizationResult, GCResult } from '@/types/native-module';

/**
 * 네이티브 메모리 최적화 훅
 * 네이티브 모듈을 사용한 메모리 관리 기능을 제공합니다.
 */
export function useNativeMemory(autoFetch = false, interval = 30000) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [optimizationLevel, setOptimizationLevel] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOptimizationResult, setLastOptimizationResult] = useState<OptimizationResult | null>(null);
  const [lastGCResult, setLastGCResult] = useState<GCResult | null>(null);

  // 메모리 정보 가져오기
  const fetchMemoryInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getMemoryInfo();
      
      if (response.success && response.memoryInfo) {
        setMemoryInfo(response.memoryInfo);
        setOptimizationLevel(response.optimizationLevel);
      } else {
        setError('메모리 정보를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('메모리 정보 가져오기 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  // 메모리 최적화 실행
  const performOptimization = useCallback(async (level?: number, emergency = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await optimizeMemory(level, emergency);
      
      if (response.success && response.result) {
        setLastOptimizationResult(response.result);
        // 최적화 후 메모리 정보 업데이트
        await fetchMemoryInfo();
        return response.result;
      } else {
        setError(response.error || '메모리 최적화 실패');
        return null;
      }
    } catch (err) {
      console.error('메모리 최적화 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMemoryInfo]);

  // 가비지 컬렉션 수행
  const performGC = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await forceGarbageCollection();
      
      if (response.success && response.result) {
        setLastGCResult(response.result);
        // GC 후 메모리 정보 업데이트
        await fetchMemoryInfo();
        return response.result;
      } else {
        setError(response.error || '가비지 컬렉션 실패');
        return null;
      }
    } catch (err) {
      console.error('가비지 컬렉션 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMemoryInfo]);

  // 자동 최적화 (메모리 정보에 따라 최적화 수행)
  const autoOptimize = useCallback(async () => {
    // 메모리 정보 가져오기
    await fetchMemoryInfo();
    
    // 최적화 레벨이 2 이상이면 최적화 수행
    if (optimizationLevel >= 2) {
      return performOptimization(optimizationLevel, optimizationLevel >= 4);
    }
    
    return null;
  }, [fetchMemoryInfo, performOptimization, optimizationLevel]);

  // 자동 메모리 정보 가져오기
  useEffect(() => {
    if (autoFetch) {
      // 초기 로드
      fetchMemoryInfo();
      
      // 주기적 업데이트
      const timerId = setInterval(fetchMemoryInfo, interval);
      
      return () => {
        clearInterval(timerId);
      };
    }
  }, [autoFetch, fetchMemoryInfo, interval]);

  return {
    memoryInfo,
    optimizationLevel,
    loading,
    error,
    lastOptimizationResult,
    lastGCResult,
    fetchMemoryInfo,
    performOptimization,
    performGC,
    autoOptimize,
  };
}
