'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemoryInfo, OptimizationLevel, OptimizationResult } from '../../types';
import { formatBytes } from '../utils/common-utils';

/**
 * 네이티브 메모리 사용량 및 최적화 기능을 제공하는 Hook
 * 
 * @returns 메모리 정보, 최적화 함수 및 상태값들
 */
export function useNativeMemory() {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  /**
   * 메모리 정보를 가져옵니다.
   */
  const fetchMemoryInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/native/memory');
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMemoryInfo(data.data);
      } else {
        setError(data.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('메모리 정보 가져오기 실패:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 메모리 최적화를 수행합니다.
   * 
   * @param level - 최적화 레벨
   * @param emergency - 긴급 상황 여부
   */
  const optimizeMemory = useCallback(async (
    level: OptimizationLevel = OptimizationLevel.MEDIUM,
    emergency: boolean = false
  ) => {
    setIsOptimizing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/native/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ level, emergency })
      });
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLastOptimization(data.result);
        setMemoryInfo(data.memoryInfo);
      } else {
        setError(data.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('메모리 최적화 실패:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  // 주기적으로 메모리 정보 가져오기 (15초마다)
  useEffect(() => {
    fetchMemoryInfo();
    
    const intervalId = setInterval(() => {
      fetchMemoryInfo();
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [fetchMemoryInfo]);

  // 메모리 사용량 문자열 포맷
  const formattedMemoryUsage = memoryInfo
    ? `${formatBytes(memoryInfo.heapUsed)} / ${formatBytes(memoryInfo.heapTotal)} (${memoryInfo.percentUsed.toFixed(1)}%)`
    : 'Loading...';

  return {
    memoryInfo,
    isLoading,
    error,
    lastOptimization,
    isOptimizing,
    optimizeMemory,
    fetchMemoryInfo,
    formattedMemoryUsage
  };
}

export default useNativeMemory;
