'use client';

import React from 'react';
import styles from './WindowControls.module.css';
import { useTheme } from './ThemeProvider';

interface WindowControlsProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  electronAPI?: any;
  className?: string;
  platform?: NodeJS.Platform;
}

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

const WindowControls: React.FC<WindowControlsProps> = ({
  onMinimize,
  onMaximize,
  onClose,
  electronAPI,
  className = '',
  platform
}: WindowControlsProps): React.ReactNode => {
  const { isDarkMode } = useTheme();

  const handleMinimize = () => {
    if (electronAPI && electronAPI.windowControl) {
      electronAPI.windowControl('minimize');
    } else if (onMinimize) {
      onMinimize();
    }
  };

  const handleMaximize = () => {
    if (electronAPI && electronAPI.windowControl) {
      electronAPI.windowControl('maximize');
    } else if (onMaximize) {
      onMaximize();
    }
  };

  const handleClose = () => {
    if (electronAPI && electronAPI.windowControl) {
      electronAPI.windowControl('close');
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className={`${styles.windowControls} ${isDarkMode ? styles.darkMode : ''} ${className}`}>
      <button
        className={styles.controlButton}
        onClick={handleMinimize}
        aria-label="최소화"
        title="최소화"
      >
        <MinimizeIcon />
      </button>

      <button
        className={styles.controlButton}
        onClick={handleMaximize}
        aria-label="최대화"
        title="최대화"
      >
        <MaximizeIcon />
      </button>

      <button
        className={`${styles.controlButton} ${styles.closeButton}`}
        onClick={handleClose}
        aria-label="닫기"
        title="닫기"
      >
        <CloseIcon />
      </button>
    </div>
  );
};

export default WindowControls;
