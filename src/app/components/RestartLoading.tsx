'use client';

import React, { useState, useEffect } from 'react';
import styles from './RestartLoading.module.css';

interface RestartLoadingProps {
  message?: string;
  isVisible: boolean;
  _onClose: () => void;
}

const RestartLoading: React.FC<RestartLoadingProps> = ({
  message = '앱을 재시작하는 중입니다...',
  isVisible,
  _onClose
}): React.ReactNode => {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  // 로딩 애니메이션 효과
  useEffect(() => {
    if (!isVisible) return;

    // 진행 점 애니메이션
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    // 진행 표시줄 애니메이션
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 5;
      });
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <h3 className={styles.title}>{message}{dots}</h3>

        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className={styles.note}>앱이 곧 다시 시작됩니다.</p>
      </div>
    </div>
  );
};

export default RestartLoading;
