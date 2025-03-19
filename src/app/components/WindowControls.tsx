'use client';

import React from 'react';
import styles from './WindowControls.module.css';

interface WindowControlsProps {
  api: any; // api prop 타입 정의 추가
}

export function WindowControls({ api }: WindowControlsProps) {
  const handleMinimize = () => {
    if (api && typeof api.windowControl === 'function') {
      api.windowControl('minimize');
    }
  };

  const handleMaximize = () => {
    if (api && typeof api.windowControl === 'function') {
      api.windowControl('maximize');
    }
  };

  const handleClose = () => {
    if (api && typeof api.windowControl === 'function') {
      api.windowControl('close');
    }
  };

  return (
    <div className={styles.windowControls}>
      <button 
        className={`${styles.windowButton} ${styles.minimizeButton}`} 
        onClick={handleMinimize}
        aria-label="최소화"
      >
        <div className={styles.buttonContent}>
          <MinimizeIcon />
        </div>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.maximizeButton}`} 
        onClick={handleMaximize}
        aria-label="최대화"
      >
        <div className={styles.buttonContent}>
          <MaximizeIcon />
        </div>
      </button>
      <button 
        className={`${styles.windowButton} ${styles.closeButton}`} 
        onClick={handleClose}
        aria-label="닫기"
      >
        <div className={styles.buttonContent}>
          <CloseIcon />
        </div>
      </button>
    </div>
  );
}

// 아이콘 컴포넌트들
function MinimizeIcon() {
  return <span className={styles.minimizeIcon}>&#8211;</span>;
}

function MaximizeIcon() {
  return <span className={styles.maximizeIcon}>&#x25A1;</span>;
}

function CloseIcon() {
  return <span className={styles.closeIcon}>&#x2715;</span>;
}
