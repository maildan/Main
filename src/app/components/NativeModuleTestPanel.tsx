'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getMemoryInfo,
  getGpuInfo,
  optimizeMemory,
  forceGarbageCollection,
} from '../utils/nativeModuleClient';
import { OptimizationLevel } from '@/types/native-module';
import NativeModuleStatus from './NativeModuleStatus';
import styles from './NativeModuleTestPanel.module.css';

export default function NativeModuleTestPanel() {
  // 상태 관리
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [gpuInfo, setGpuInfo] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [gcResult, setGcResult] = useState<any>(null);
  const [loading, setLoading] = useState({
    memory: false,
    gpu: false,
    optimize: false,
    gc: false,
  });
  const [error, setError] = useState<string | null>(null);

  // 로딩 상태 설정 헬퍼 함수
  const setLoadingState = useCallback((key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  // 메모리 정보 가져오기
  const fetchMemoryInfo = useCallback(async () => {
    try {
      setLoadingState('memory', true);
      setError(null);

      const response = await getMemoryInfo();
      if (response) {
        setMemoryInfo(response);
      } else {
        setError('메모리 정보를 가져올 수 없습니다');
      }
    } catch (err) {
      console.error('메모리 정보 가져오기 오류:', err);
      setError(
        err instanceof Error ? err.message : '메모리 정보를 가져오는 중 오류가 발생했습니다'
      );
    } finally {
      setLoadingState('memory', false);
    }
  }, [setLoadingState]);

  // GPU 정보 가져오기
  const fetchGpuInfo = useCallback(async () => {
    try {
      setLoadingState('gpu', true);
      setError(null);

      const response = await getGpuInfo();
      if (response) {
      setGpuInfo(response);
      } else {
        setError('GPU 정보를 가져올 수 없습니다');
      }
    } catch (err) {
      console.error('GPU 정보 가져오기 오류:', err);
      setError(err instanceof Error ? err.message : 'GPU 정보를 가져오는 중 오류가 발생했습니다');
    } finally {
      setLoadingState('gpu', false);
    }
  }, [setLoadingState]);

  // 메모리 최적화 수행
  const performMemoryOptimization = useCallback(async (level: number = 2) => {
    try {
      setLoadingState('optimize', true);
      setError(null);

      // level 값을 OptimizationLevel 형태로 변환
      const optimizationLevel = level as OptimizationLevel;
      const response = await optimizeMemory(optimizationLevel);
      
      if (response) {
        setOptimizationResult(response);
      } else {
        setError('메모리 최적화를 수행할 수 없습니다');
      }
    } catch (err) {
      console.error('메모리 최적화 오류:', err);
      setError(err instanceof Error ? err.message : '메모리 최적화 중 오류가 발생했습니다');
    } finally {
      setLoadingState('optimize', false);
    }
  }, [setLoadingState, setOptimizationResult, setError]);

  // 가비지 컬렉션 수행
  const performGarbageCollection = useCallback(async () => {
    try {
      setLoadingState('gc', true);
      setError(null);

      const response = await forceGarbageCollection();
      if (response) {
        setGcResult(response);
      } else {
        setError('가비지 컬렉션을 수행할 수 없습니다');
      }
    } catch (err) {
      console.error('가비지 컬렉션 오류:', err);
      setError(err instanceof Error ? err.message : '가비지 컬렉션 중 오류가 발생했습니다');
    } finally {
      setLoadingState('gc', false);
    }
  }, [setLoadingState, setGcResult, setError]);

  // 네이티브 모듈 상태 및 정보 가져오기
  useEffect(() => {
    const checkNativeModule = async () => {
      await fetchMemoryInfo();
      await fetchGpuInfo();
    };

    checkNativeModule();
  }, [fetchMemoryInfo, fetchGpuInfo]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>네이티브 모듈 테스트 패널</h2>

      {/* 네이티브 모듈 상태 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>네이티브 모듈 상태</h3>
        <NativeModuleStatus />
      </div>

      {/* 오류 표시 */}
      {error && (
        <div className={styles.error}>
          <p>오류: {error}</p>
        </div>
      )}

      {/* 메모리 정보 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>메모리 정보</h3>
        <button className={styles.button} onClick={fetchMemoryInfo} disabled={loading.memory}>
          {loading.memory ? '로딩 중...' : '메모리 정보 가져오기'}
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
            onClick={() => performMemoryOptimization(1)}
            disabled={loading.optimize}
          >
            가벼운 최적화
          </button>
          <button
            className={`${styles.button} ${styles.levelMedium}`}
            onClick={() => performMemoryOptimization(2)}
            disabled={loading.optimize}
          >
            중간 최적화
          </button>
          <button
            className={`${styles.button} ${styles.levelHigh}`}
            onClick={() => performMemoryOptimization(3)}
            disabled={loading.optimize}
          >
            높은 최적화
          </button>
          <button
            className={`${styles.button} ${styles.levelCritical}`}
            onClick={() => performMemoryOptimization(4)}
            disabled={loading.optimize}
          >
            긴급 최적화
          </button>
        </div>

        {loading.optimize && <p className={styles.loading}>최적화 진행 중...</p>}

        {optimizationResult && (
          <div className={styles.infoContainer}>
            <p>최적화 레벨: {optimizationResult.optimizationLevel || optimizationResult.optimization_level}</p>
            <p>해제된 메모리: {optimizationResult.freedMB || optimizationResult.freed_mb} MB</p>
            <p>소요 시간: {optimizationResult.duration} ms</p>
            <p>성공 여부: {optimizationResult.success ? '성공' : '실패'}</p>
            {optimizationResult.error && <p>오류: {optimizationResult.error}</p>}
          </div>
        )}
      </div>

      {/* 가비지 컬렉션 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>가비지 컬렉션</h3>
        <button className={styles.button} onClick={performGarbageCollection} disabled={loading.gc}>
          {loading.gc ? 'GC 수행 중...' : '가비지 컬렉션 수행'}
        </button>

        {gcResult && (
          <div className={styles.infoContainer}>
            <p>해제된 메모리: {gcResult.freedMB || gcResult.freed_mb} MB</p>
            <p>소요 시간: {gcResult.duration} ms</p>
            <p>성공 여부: {gcResult.success ? '성공' : '실패'}</p>
            {gcResult.error && <p>오류: {gcResult.error}</p>}
          </div>
        )}
      </div>

      {/* GPU 정보 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>GPU 정보</h3>
        <button className={styles.button} onClick={fetchGpuInfo} disabled={loading.gpu}>
          {loading.gpu ? '로딩 중...' : 'GPU 정보 가져오기'}
        </button>

        {gpuInfo && (
          <div className={styles.infoContainer}>
            <p>가용성: {gpuInfo.available ? '사용 가능' : '사용 불가'}</p>
            <p>이름: {gpuInfo.name || 'N/A'}</p>
            <p>벤더: {gpuInfo.vendor || 'N/A'}</p>
            <p>드라이버: {gpuInfo.driverInfo || gpuInfo.driver_info || 'N/A'}</p>
            <p>디바이스 타입: {gpuInfo.deviceType || gpuInfo.device_type || 'N/A'}</p>
            <p>백엔드: {gpuInfo.backend || 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
