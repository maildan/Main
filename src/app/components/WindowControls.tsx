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

// 노션 스타일 아이콘 컴포넌트들
function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M3 8H13" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect 
        x="3.5" 
        y="3.5" 
        width="9" 
        height="9" 
        rx="1" 
        stroke="currentColor" 
        strokeWidth="1.2" 
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M4 4L12 12M4 12L12 4" 
        stroke="currentColor" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />
    </svg>
  );
}
