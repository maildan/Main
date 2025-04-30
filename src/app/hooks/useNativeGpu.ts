import { useState, useEffect, useCallback } from 'react';
import { 
  getGpuInfo, 
  setGpuAcceleration,
  performGpuComputation,
  GpuTaskType,
  GpuInfo
} from '../utils/nativeModuleClient';
import type { GpuComputationResult } from '@/types/native-module';

/**
 * 네이티브 GPU 가속 훅
 * 네이티브 모듈을 사용한 GPU 가속 기능을 제공합니다.
 */
export function useNativeGpu() {
  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [available, setAvailable] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastComputationResult, setLastComputationResult] = useState<GpuComputationResult | null>(null);

  // GPU 정보 가져오기
  const fetchGpuInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getGpuInfo();
      
      if (response) {
        setGpuInfo(response);
        setAvailable(response.available);
        setEnabled(response.accelerationEnabled || false);
      } else {
        setError('GPU 정보를 가져오는데 실패했습니다.');
        setAvailable(false);
        setEnabled(false);
      }
    } catch (err) {
      console.error('GPU 정보 가져오기 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setAvailable(false);
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // GPU 가속 활성화/비활성화
  const toggleGpuAcceleration = useCallback(async (enable: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await setGpuAcceleration(enable);
      
      if (success) {
        setEnabled(enable);
        await fetchGpuInfo();
        return true;
      } else {
        setError('GPU 가속 설정 변경 실패');
        return false;
      }
    } catch (err) {
      console.error('GPU 가속 변경 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchGpuInfo]);

  // GPU 계산 수행 (제네릭 타입 제거)
  const computeWithGpu = useCallback(async (taskType: GpuTaskType, data: Record<string, any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await performGpuComputation(taskType, data);
      
      if (result) {
        setLastComputationResult({
          computation_type: taskType,
          duration_ms: result.duration_ms || 0,
          result: result.result,
          timestamp: Date.now()
        } as GpuComputationResult);
        return result.result;
      } else {
        setError('GPU 계산 실패');
        return null;
      }
    } catch (err) {
      console.error('GPU 계산 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 시 GPU 정보 가져오기
  useEffect(() => {
    fetchGpuInfo();
  }, [fetchGpuInfo]);

  return {
    gpuInfo,
    available,
    enabled,
    loading,
    error,
    lastComputationResult,
    fetchGpuInfo,
    toggleGpuAcceleration,
    computeWithGpu,
  };
}
