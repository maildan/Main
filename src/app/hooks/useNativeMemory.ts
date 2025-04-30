import { useState, useEffect, useCallback } from 'react';
import { MemoryInfo, OptimizationResult, OptimizationLevel } from '../types';
import { useInterval } from './useInterval';

interface UseNativeMemoryOptions {
  interval?: number;
  autoFetch?: boolean;
  autoOptimize?: boolean;
  optimizationThreshold?: number;
  onMemoryInfo?: (info: MemoryInfo) => void;
  onOptimizationDone?: (result: OptimizationResult) => void;
}

export function useNativeMemory({
  interval = 10000,
  autoFetch = true,
  autoOptimize = false,
  optimizationThreshold = 80,
  onMemoryInfo,
  onOptimizationDone
}: UseNativeMemoryOptions = {}) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [lastOptimized, setLastOptimized] = useState<number | null>(null);

  // fetchMemoryInfo 함수를 선언 전에 선언
  const optimizeMemory = useCallback(async (level: OptimizationLevel = OptimizationLevel.MEDIUM) => {
    if (optimizing) return;

    setOptimizing(true);

    try {
      const response = await fetch('/api/memory/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ level })
      });

      const result = await response.json();

      if (result.success) {
        setLastOptimized(Date.now());
        if (onOptimizationDone) {
          onOptimizationDone(result);
        }
      } else {
        console.error('메모리 최적화 실패:', result.error);
      }

      // 최적화 후 메모리 정보 업데이트
      // fetchMemoryInfo 참조 오류 방지를 위해 setTimeout 내에서 호출
      setTimeout(() => {
        fetchMemoryInfo();
      }, 500);

      return result;
    } catch (err) {
      console.error('메모리 최적화 오류:', err);
      return { success: false, error: err instanceof Error ? err.message : '알 수 없는 오류' };
    } finally {
      setOptimizing(false);
    }
  }, [optimizing, onOptimizationDone]);

  // 메모리 정보 가져오기
  const fetchMemoryInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/native/test');

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.memoryInfo) {
        setMemoryInfo(data.memoryInfo);

        if (onMemoryInfo) {
          onMemoryInfo(data.memoryInfo);
        }

        // 자동 최적화 확인
        if (autoOptimize &&
          data.memoryInfo.percentUsed !== undefined &&
          data.memoryInfo.percentUsed > optimizationThreshold &&
          (!lastOptimized || Date.now() - lastOptimized > 60000)) {
          optimizeMemory(OptimizationLevel.MEDIUM);
        }
      } else {
        setError(data.error || '메모리 정보 없음');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [autoOptimize, optimizationThreshold, lastOptimized, onMemoryInfo, optimizeMemory]);

  // 메모리 사용량 문자열 계산
  const getMemoryUsageString = useCallback(() => {
    if (!memoryInfo) return 'N/A';

    const usedMB = memoryInfo.heapUsed !== undefined
      ? Math.round(memoryInfo.heapUsed / (1024 * 1024) * 10) / 10
      : 0;

    const totalMB = memoryInfo.heapTotal !== undefined
      ? Math.round(memoryInfo.heapTotal / (1024 * 1024) * 10) / 10
      : 0;

    const percent = memoryInfo.percentUsed !== undefined
      ? Math.round(memoryInfo.percentUsed * 10) / 10
      : 0;

    return `${usedMB}MB / ${totalMB}MB (${percent}%)`;
  }, [memoryInfo]);

  // 자동 fetch 간격 설정
  useInterval(fetchMemoryInfo, autoFetch ? interval : null);

  // 초기 로드
  useEffect(() => {
    fetchMemoryInfo();
  }, [fetchMemoryInfo]);

  return {
    memoryInfo,
    loading,
    error,
    optimizing,
    lastOptimized,
    fetchMemoryInfo,
    optimizeMemory,
    getMemoryUsageString
  };
}
