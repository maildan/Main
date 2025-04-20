'use client';

import { useState, useEffect } from 'react';
import styles from './NativeModuleTestPanel.module.css';
import NativeModuleStatus from './NativeModuleStatus';
import { MemoryInfo } from '@/types';
import { GpuInfo } from '@/types';
import { OptimizationLevel } from '@/types/optimization-level';

interface NativeModuleTestPanelProps {
  // props 정의
}

const NativeModuleTestPanel: React.FC<NativeModuleTestPanelProps> = (): React.ReactNode => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [gpuInfo, setGpuInfo] = useState<any | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [gcResult, setGcResult] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
    if (isLoading) setErrorStates(prev => ({ ...prev, [key]: null }));
  };

  const fetchMemoryInfo = async () => {
    setLoadingState('memory', true);
    try {
      const response = await fetch('/api/native/memory');
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      if (data.success && data.data) {
        setMemoryInfo(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch memory info');
      }
    } catch (err: any) {
      setErrorStates(prev => ({ ...prev, memory: err.message }));
    } finally {
      setLoadingState('memory', false);
    }
  };

  const fetchGpuInfo = async () => {
    setLoadingState('gpu', true);
    try {
      const response = await fetch('/api/native/gpu');
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      setGpuInfo(data);
      if (!data.success) {
        console.warn('GPU Info API did not return success, might be fallback info:', data);
      }
    } catch (err: any) {
      setErrorStates(prev => ({ ...prev, gpu: err.message }));
    } finally {
      setLoadingState('gpu', false);
    }
  };

  const performMemoryOptimization = async (level: OptimizationLevel = OptimizationLevel.MEDIUM) => {
    setLoadingState('optimize', true);
    setOptimizationResult(null);
    try {
      const response = await fetch('/api/native/memory/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      setOptimizationResult(data);
      fetchMemoryInfo();
    } catch (err: any) {
      setErrorStates(prev => ({ ...prev, optimize: err.message }));
    } finally {
      setLoadingState('optimize', false);
    }
  };

  const performGarbageCollection = async () => {
    setLoadingState('gc', true);
    setGcResult(null);
    try {
      const response = await fetch('/api/native/memory', { method: 'DELETE' });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      setGcResult(data);
      fetchMemoryInfo();
    } catch (err: any) {
      setErrorStates(prev => ({ ...prev, gc: err.message }));
    } finally {
      setLoadingState('gc', false);
    }
  };

  useEffect(() => {
    fetchMemoryInfo();
    fetchGpuInfo();
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>네이티브 모듈 테스트 패널</h2>

      {/* 네이티브 모듈 상태 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>네이티브 모듈 상태</h3>
        <NativeModuleStatus />
      </div>

      {/* 오류 표시 */}
      {errorStates.memory && (
        <div className={styles.error}>
          <p>오류: {errorStates.memory}</p>
        </div>
      )}

      {/* 메모리 정보 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>메모리 정보</h3>
        <button
          className={styles.button}
          onClick={fetchMemoryInfo}
          disabled={loadingStates.memory}
        >
          {loadingStates.memory ? '로딩 중...' : '메모리 정보 가져오기'}
        </button>

        {memoryInfo && (
          <div className={styles.infoContainer}>
            <p>힙 사용량: {Math.round(memoryInfo.heap_used_mb * 10) / 10} MB</p>
            <p>힙 총량: {Math.round((memoryInfo.heap_total / (1024 * 1024)) * 10) / 10} MB</p>
            <p>사용률: {Math.round(memoryInfo.percent_used)}%</p>
            <p>RSS: {Math.round(memoryInfo.rss_mb)} MB</p>
            <p>타임스탬프: {new Date(memoryInfo.timestamp).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* 메모리 최적화 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>메모리 최적화</h3>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${styles.levelLow}`}
            onClick={() => performMemoryOptimization(OptimizationLevel.LOW)}
            disabled={loadingStates.optimize || loadingStates.gc}
          >
            Optimize (Low)
          </button>
          <button
            className={`${styles.button} ${styles.levelMedium}`}
            onClick={() => performMemoryOptimization(OptimizationLevel.MEDIUM)}
            disabled={loadingStates.optimize || loadingStates.gc}
          >
            Optimize (Medium)
          </button>
          <button
            className={`${styles.button} ${styles.levelHigh}`}
            onClick={() => performMemoryOptimization(OptimizationLevel.HIGH)}
            disabled={loadingStates.optimize || loadingStates.gc}
          >
            Optimize (High)
          </button>
          <button
            className={`${styles.button} ${styles.levelCritical}`}
            onClick={() => performMemoryOptimization(OptimizationLevel.AGGRESSIVE)}
            disabled={loadingStates.optimize || loadingStates.gc}
          >
            Optimize (Aggressive)
          </button>
        </div>

        {loadingStates.optimize && <p className={styles.loading}>Optimizing...</p>}
        {errorStates.optimize && <p className={styles.error}>Optimize Error: {errorStates.optimize}</p>}
        {optimizationResult && (
          <pre className={styles.resultBox}>Optimize Result: {JSON.stringify(optimizationResult, null, 2)}</pre>
        )}
      </div>

      {/* 가비지 컬렉션 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>가비지 컬렉션</h3>
        <button
          className={styles.button}
          onClick={performGarbageCollection}
          disabled={loadingStates.optimize || loadingStates.gc}
        >
          {loadingStates.gc ? 'Running GC...' : 'Force GC'}
        </button>

        {loadingStates.gc && <p>Running GC...</p>}
        {errorStates.gc && <p className={styles.error}>GC Error: {errorStates.gc}</p>}
        {gcResult && (
          <pre className={styles.resultBox}>GC Result: {JSON.stringify(gcResult, null, 2)}</pre>
        )}
      </div>

      {/* GPU 정보 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>GPU 정보</h3>
        <button
          className={styles.button}
          onClick={fetchGpuInfo}
          disabled={loadingStates.gpu}
        >
          {loadingStates.gpu ? '로딩 중...' : 'GPU 정보 가져오기'}
        </button>

        {gpuInfo && (
          <div className={styles.infoContainer}>
            <p>GPU 이름: {gpuInfo.gpuInfo?.name || gpuInfo.name || 'N/A'}</p>
            <p>제조사: {gpuInfo.gpuInfo?.vendor || gpuInfo.vendor || 'N/A'}</p>
            <p>사용 가능: {gpuInfo.gpuInfo?.available !== undefined ? (gpuInfo.gpuInfo.available ? '예' : '아니오') : (gpuInfo.available ? '예' : '아니오')}</p>
            <p>가속 활성화: {gpuInfo.gpuInfo?.acceleration_enabled !== undefined ? (gpuInfo.gpuInfo.acceleration_enabled ? '예' : '아니오') : (gpuInfo.acceleration_enabled ? '예' : '아니오')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NativeModuleTestPanel;
