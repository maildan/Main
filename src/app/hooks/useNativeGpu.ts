import { useState, useEffect, useCallback } from 'react';
import { 
  getGpuInfo, 
  setGpuAcceleration,
  performGpuComputation
} from '../utils/nativeModuleClient';
import type { GpuInfo, GpuComputationResult } from '@/types/native-module';

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
      
      if (response.success) {
        setGpuInfo(response.gpuInfo || null);
        setAvailable(response.available);
        setEnabled(response.gpuInfo?.acceleration_enabled || false);
      } else {
        setError('GPU 정보를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('GPU 정보 가져오기 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  // GPU 가속 활성화/비활성화
  const toggleGpuAcceleration = useCallback(async (enable: boolean) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await setGpuAcceleration(enable);
      
      if (response.success) {
        setEnabled(response.enabled);
        // GPU 정보 업데이트
        await fetchGpuInfo();
        return response.result;
      } else {
        setError(response.error || 'GPU 가속 설정 변경 실패');
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

  // GPU 계산 수행
  const computeWithGpu = useCallback(async <T = any>(data: any, computationType: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await performGpuComputation<T>(data, computationType);
      
      if (response.success && response.result) {
        setLastComputationResult(response.result);
        return response.result;
      } else {
        setError(response.error || 'GPU 계산 실패');
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
