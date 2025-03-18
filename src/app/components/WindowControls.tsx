'use client';

import React, { memo, useCallback } from 'react';
import styles from './WindowControls.module.css';

export const WindowControls = memo(function WindowControls() {
  // 이벤트 핸들러를 메모이제이션하여 성능 최적화
  const handleMinimize = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('minimize');
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('maximize');
    }
  }, []);

  const handleClose = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('close');
    }
  }, []);

  return (
    <div className={styles.windowControls}>
      <button 
        className={`${styles.windowButton} ${styles.minimizeButton}`} 
        onClick={handleMinimize}
        title="최소화"
        aria-label="최소화"
      >
        <div className={styles.buttonContent}>―</div>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.maximizeButton}`}
        onClick={handleMaximize}
        title="최대화"
        aria-label="최대화"
      >
        <div className={styles.buttonContent}>□</div>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.closeButton}`}
        onClick={handleClose}
        title="닫기"
        aria-label="닫기"
      >
        <div className={styles.buttonContent}>×</div>
      </button>
    </div>
  );
});
