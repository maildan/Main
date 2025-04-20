import { useState, useEffect, useCallback } from 'react';
import { nativeModuleClient } from '../utils/nativeModuleClient';
import {
  GpuInfo,
  GpuComputationResult,
  GpuTaskType
} from '@/types';

/**
 * 네이티브 GPU 가속 훅
 * 네이티브 모듈을 사용한 GPU 가속 기능을 제공합니다.
 */

// GpuAccelerationStatus 인터페이스 임시 정의 (필요시 @/types/index.ts 로 이동)
interface GpuAccelerationStatus {
  available: boolean;
  enabled: boolean;
  info?: GpuInfo;
  error?: string;
  timestamp?: number;
}

// 인터페이스 정의 추가
interface UseNativeGpuOptions {
  autoFetch?: boolean;
  interval?: number;
}

interface UseNativeGpuResult {
  gpuInfo: GpuInfo | null;
  accelerationStatus: GpuAccelerationStatus | null;
  loading: {
    info: boolean;
    acceleration: boolean;
    computation: boolean;
  };
  error: string | null;
  fetchGpuInfo: () => Promise<void>;
  updateGpuAcceleration: (enable: boolean) => Promise<boolean>;
  executeGpuTask: <T>(taskType: GpuTaskType, data: any) => Promise<GpuComputationResult | null>;
}

export function useNativeGpu(options: UseNativeGpuOptions = {}): UseNativeGpuResult {
  const { autoFetch = true, interval = 30000 } = options; // 기본값 설정

  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [accelerationStatus, setAccelerationStatus] = useState<GpuAccelerationStatus | null>(null);
  // loading 상태를 객체로 변경
  const [loading, setLoading] = useState({
    info: false,
    acceleration: false,
    computation: false,
  });
  const [error, setError] = useState<string | null>(null);

  // GPU 정보 가져오기
  const fetchGpuInfo = useCallback(async () => {
    setLoading(prev => ({ ...prev, info: true }));
    setError(null);
    try {
      const info: GpuInfo = await nativeModuleClient.getGpuInfo();
      setGpuInfo(info);
      if (info) {
        setAccelerationStatus((prev: GpuAccelerationStatus | null) => ({
          ...(prev || { available: false, enabled: false }),
          available: true,
          enabled: info.isHardwareAccelerated,
          info: info,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'GPU 정보 로드 실패');
      setAccelerationStatus({ available: false, enabled: false, error: err.message });
    } finally {
      setLoading(prev => ({ ...prev, info: false }));
    }
  }, []);

  // GPU 가속 설정
  const updateGpuAcceleration = useCallback(async (enable: boolean) => {
    setLoading(prev => ({ ...prev, acceleration: true }));
    setError(null);
    try {
      const result = await nativeModuleClient.setGpuAcceleration(enable);
      if (result.success) {
        await fetchGpuInfo();
        setAccelerationStatus(prev => ({ ...(prev || { available: false, enabled: false }), enabled: enable }));
        return true;
      } else {
        throw new Error(result.error || 'GPU acceleration setting failed');
      }
    } catch (err: any) {
      setError(err.message || 'GPU 가속 설정 실패');
      return false;
    } finally {
      setLoading(prev => ({ ...prev, acceleration: false }));
    }
  }, [fetchGpuInfo]);

  // GPU 계산 실행
  const executeGpuTask = useCallback(async <T>(taskType: GpuTaskType, data: any): Promise<GpuComputationResult | null> => {
    setLoading(prev => ({ ...prev, computation: true }));
    setError(null);
    try {
      const result = await nativeModuleClient.performGpuComputation(data, taskType);
      return result;
    } catch (err: any) {
      setError(err.message || 'GPU 계산 실패');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, computation: false }));
    }
  }, []);

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    if (autoFetch) {
      fetchGpuInfo();
      const intervalId = setInterval(fetchGpuInfo, interval);
      return () => clearInterval(intervalId);
    }
  }, [autoFetch, interval, fetchGpuInfo]);

  return {
    gpuInfo,
    accelerationStatus,
    loading,
    error,
    fetchGpuInfo,
    updateGpuAcceleration,
    executeGpuTask,
  };
}
