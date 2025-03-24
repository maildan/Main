'use client';

import { useState, useEffect } from 'react';
import { getNativeModuleStatus } from '../utils/nativeModuleClient';
import type { NativeModuleStatus } from '@/types/native-module';
import styles from './NativeModuleStatus.module.css';

export default function NativeModuleStatusComponent() {
  const [status, setStatus] = useState<NativeModuleStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const moduleStatus = await getNativeModuleStatus();
        setStatus(moduleStatus);
        setError(null);
      } catch (err) {
        console.error('네이티브 모듈 상태 확인 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return <div className={styles.loader}>네이티브 모듈 상태 확인 중...</div>;
  }

  if (error) {
    return <div className={styles.error}>오류: {error}</div>;
  }

  if (!status) {
    return <div className={styles.unavailable}>네이티브 모듈 정보를 가져올 수 없습니다</div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>네이티브 모듈 상태</h3>
      
      <div className={styles.statusItem}>
        <span className={styles.label}>상태:</span>
        <span className={`${styles.value} ${status.available ? styles.available : styles.unavailable}`}>
          {status.available ? '사용 가능' : '사용 불가'}
        </span>
      </div>
      
      <div className={styles.statusItem}>
        <span className={styles.label}>모드:</span>
        <span className={`${styles.value} ${status.fallbackMode ? styles.fallback : styles.native}`}>
          {status.fallbackMode ? 'JavaScript 폴백' : '네이티브 Rust'}
        </span>
      </div>
      
      <div className={styles.statusItem}>
        <span className={styles.label}>버전:</span>
        <span className={styles.value}>{status.version || '알 수 없음'}</span>
      </div>
      
      {status.info && (
        <>
          <div className={styles.statusItem}>
            <span className={styles.label}>설명:</span>
            <span className={styles.value}>{status.info.description}</span>
          </div>
          
          <div className={styles.features}>
            <div className={styles.featuresTitle}>지원 기능:</div>
            <ul className={styles.featuresList}>
              <li className={status.info.features.memory_optimization ? styles.supported : styles.unsupported}>
                메모리 최적화
              </li>
              <li className={status.info.features.gpu_acceleration ? styles.supported : styles.unsupported}>
                GPU 가속
              </li>
              <li className={status.info.features.worker_threads ? styles.supported : styles.unsupported}>
                워커 스레드
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
