'use client';

import { useEffect, useState } from 'react';
import styles from './RestartPrompt.module.css';

// RestartAPI 인터페이스 정의
interface RestartAPI {
  restartApp: () => void;
  closeWindow: () => void;
  getDarkMode: () => Promise<boolean>;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    restartAPI?: RestartAPI;
  }
}

/**
 * 앱 재시작 안내 컴포넌트
 * 기존 restart.html을 React 컴포넌트로 마이그레이션
 */
export default function RestartPrompt() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  
  // Electron API에 접근하기 위한 함수
  const getRestartAPI = () => {
    return window.restartAPI;
  };
  
  // 다크 모드 설정 확인 및 적용
  async function applyTheme() {
    try {
      const api = getRestartAPI();
      if (api?.getDarkMode) {
        const isDarkMode = await api.getDarkMode();
        setIsDarkMode(isDarkMode);
      }
    } catch (error) {
      console.error('테마 적용 중 오류:', error);
    }
  }
  
  // 앱 재시작 함수
  function restartApp() {
    setIsRestarting(true); // 재시작 중 상태로 설정
    
    const api = getRestartAPI();
    if (api?.restartApp) {
      // 약간의 지연 후 재시작 실행 (UI 업데이트를 볼 수 있도록)
      setTimeout(() => {
        api.restartApp();
      }, 500);
    }
  }
  
  // 창 닫기 함수
  function closeWindow() {
    const api = getRestartAPI();
    if (api?.closeWindow) {
      api.closeWindow();
    }
  }
  
  // 컴포넌트 마운트 시 테마 적용
  useEffect(() => {
    applyTheme();
  }, []);
  
  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      <div className={styles.header}>
        <h1>앱 재시작</h1>
        <button className={styles.closeButton} onClick={closeWindow} disabled={isRestarting}>×</button>
      </div>
      
      <div className={styles.content}>
        {isRestarting ? (
          <>
            <div className={styles.loadingIcon}>🔄</div>
            <p className={styles.message}>
              재시작 중입니다...<br />
              잠시만 기다려주세요.
            </p>
          </>
        ) : (
          <>
            <div className={styles.icon}>🔄</div>
            <p className={styles.message}>
              GPU 가속 설정이 변경되었습니다.<br />
              변경된 설정을 적용하려면 앱을 재시작해야 합니다.
            </p>
            <div className={styles.buttons}>
              <button 
                className={`${styles.button} ${styles.primary}`}
                onClick={restartApp}
                disabled={isRestarting}
              >
                지금 재시작
              </button>
              <button 
                className={`${styles.button} ${styles.secondary}`}
                onClick={closeWindow}
                disabled={isRestarting}
              >
                나중에 하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
