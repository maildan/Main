'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './RestartPrompt.module.css';

/**
 * 앱 재시작 안내 컴포넌트
 * 기존 restart.html을 React 컴포넌트로 마이그레이션
 */
interface RestartPromptProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const RestartPrompt: React.FC<RestartPromptProps> = ({ isOpen, onConfirm, onCancel }): React.ReactNode => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // 다크 모드 설정 확인 및 적용
  useEffect(() => {
    async function applyTheme() {
      try {
        // OS 기본 테마 감지
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // 우선순위: 1. OS 기본값 사용 (선호됨)
        // 2. 앱 설정 확인 (필요한 경우)
        console.log('OS 기본 테마 사용:', prefersDarkMode ? 'dark' : 'light');
        setIsDarkMode(prefersDarkMode);

        // 앱 설정 확인이 필요한 경우에만 사용
        if (window.electronAPI?.getDarkMode) {
          const appDarkMode = await window.electronAPI.getDarkMode();
          if (appDarkMode !== prefersDarkMode) {
            console.log('앱 설정 테마 사용:', appDarkMode ? 'dark' : 'light');
            setIsDarkMode(appDarkMode);
          }
        }
      } catch (error) {
        console.error('테마 적용 중 오류:', error);
        // 오류 발생 시 OS 기본값 사용
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }

    applyTheme();

    // 시스템 테마 변경 감지 및 자동 적용
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // 앱 재시작 함수
  const restartApp = useCallback(() => {
    console.log('재시작 시도');
    setIsRestarting(true);

    setTimeout(() => {
      try {
        // API 호출 순서: 1. electronAPI, 2. restartAPI
        if (window.electronAPI?.restartApp) {
          console.log('electronAPI.restartApp 사용');
          window.electronAPI.restartApp();
          return;
        }

        if (window.restartAPI?.restartApp) {
          console.log('restartAPI.restartApp 사용');
          window.restartAPI.restartApp();
          return;
        }

        console.error('재시작 API를 찾을 수 없습니다');
      } catch (error) {
        console.error('재시작 실행 중 오류:', error);
        setIsRestarting(false); // 오류 발생 시 재시작 상태 복원
      }
    }, 500);
  }, []);

  // 창 닫기 함수
  const closeWindow = useCallback(() => {
    console.log('창 닫기 시도');
    try {
      // API 호출 순서: 1. electronAPI, 2. restartAPI
      if (window.electronAPI?.closeWindow) {
        console.log('electronAPI.closeWindow 사용');
        window.electronAPI.closeWindow();
        return;
      }

      if (window.restartAPI?.closeWindow) {
        console.log('restartAPI.closeWindow 사용');
        window.restartAPI.closeWindow();
        return;
      }

      console.error('창 닫기 API를 찾을 수 없습니다');
    } catch (error) {
      console.error('창 닫기 중 오류:', error);
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      <div className={styles.header}>
        <h1>앱 재시작</h1>
        <button
          className={styles.closeButton}
          onClick={closeWindow}
          disabled={isRestarting}
          aria-label="닫기"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && closeWindow()}
        >
          ×
        </button>
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
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && restartApp()}
                aria-label="지금 재시작"
              >
                지금 재시작
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={closeWindow}
                disabled={isRestarting}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && closeWindow()}
                aria-label="나중에 하기"
              >
                나중에 하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RestartPrompt;
