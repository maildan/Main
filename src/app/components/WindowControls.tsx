'use client';

import React, { useCallback } from 'react';
import styles from './WindowControls.module.css';

export function WindowControls() {
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
      >
        <span className={styles.minimizeIcon}>―</span>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.maximizeButton}`} 
        onClick={handleMaximize}
        title="최대화"
      >
        <span className={styles.maximizeIcon}>□</span>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.closeButton}`} 
        onClick={handleClose}
        title="닫기"
      >
        <span className={styles.closeIcon}>×</span>
      </button>
    </div>
  );
}
