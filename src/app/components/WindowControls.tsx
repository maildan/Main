'use client';

import React from 'react';
import styles from './WindowControls.module.css';

export function WindowControls() {
  // 창 최소화
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('minimize');
    }
  };

  // 창 최대화/복원
  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('maximize');
    }
  };

  // 창 닫기
  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.windowControl('close');
    }
  };

  return (
    <div className={styles.windowControls}>
      <button 
        className={`${styles.windowButton} ${styles.minimizeButton}`}
        onClick={handleMinimize}
        title="최소화"
      >
        &#x2500;
      </button>
      <button 
        className={`${styles.windowButton} ${styles.maximizeButton}`}
        onClick={handleMaximize}
        title="최대화"
      >
        &#x25A1;
      </button>
      <button 
        className={`${styles.windowButton} ${styles.closeButton}`}
        onClick={handleClose}
        title="닫기"
      >
        &#x2715;
      </button>
    </div>
  );
}
