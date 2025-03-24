'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './RestartPrompt.module.css';

// 수정: 타입 정의 가져오는 위치 변경
import type { RestartAPI } from '../types/electron';

/**
 * 앱 재시작 안내 컴포넌트
 * 기존 restart.html을 React 컴포넌트로 마이그레이션
 */
export default function RestartPrompt() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  
  // 다크 모드 설정 확인 및 적용
  useEffect(() => {
    async function applyTheme() {
      try {
        // 1. restartAPI 시도
        if (window.restartAPI?.getDarkMode) {
          console.log('restartAPI.getDarkMode 사용');
          const darkMode = await window.restartAPI.getDarkMode();
          setIsDarkMode(darkMode);
          return;
        }
        
        // 2. electronAPI 시도 (ElectronAPI 타입에 getDarkMode가 추가됨)
        if (window.electronAPI?.getDarkMode) {
          console.log('electronAPI.getDarkMode 사용');
          const darkMode = await window.electronAPI.getDarkMode();
          setIsDarkMode(darkMode);
          return;
        }
        
        console.warn('다크 모드 정보를 가져올 수 없습니다. 기본값 사용');
      } catch (error) {
        console.error('테마 적용 중 오류:', error);
      }
    }
    
    applyTheme();
  }, []);
  
  // 앱 재시작 함수
  const restartApp = useCallback(() => {
    console.log('재시작 시도');
    setIsRestarting(true);
    
    setTimeout(() => {
      try {
        // 1. restartAPI 시도
        if (window.restartAPI?.restartApp) {
          console.log('restartAPI.restartApp 사용');
          window.restartAPI.restartApp();
          return;
        }
        
        // 2. electronAPI 시도 (ElectronAPI 타입에 restartApp이 추가됨)
        if (window.electronAPI?.restartApp) {
          console.log('electronAPI.restartApp 사용');
          window.electronAPI.restartApp();
          return;
        }
        
        console.error('재시작 API를 찾을 수 없습니다');
      } catch (error) {
        console.error('재시작 실행 중 오류:', error);
      }
    }, 500);
  }, []);
  
  // 창 닫기 함수
  const closeWindow = useCallback(() => {
    console.log('창 닫기 시도');
    try {
      // 1. restartAPI 시도
      if (window.restartAPI?.closeWindow) {
        console.log('restartAPI.closeWindow 사용');
        window.restartAPI.closeWindow();
        return;
      }
      
      // 2. electronAPI 시도 (ElectronAPI 타입에 closeWindow가 추가됨)
      if (window.electronAPI?.closeWindow) {
        console.log('electronAPI.closeWindow 사용');
        window.electronAPI.closeWindow();
        return;
      }
      
      console.error('창 닫기 API를 찾을 수 없습니다');
    } catch (error) {
      console.error('창 닫기 중 오류:', error);
    }
  }, []);

  // UI 부분은 변경 없음
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
