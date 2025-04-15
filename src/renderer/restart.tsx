'use client';

import React, { useEffect, useState, KeyboardEvent } from 'react';
import styles from './restart.module.css';

/**
 * RestartAPI 인터페이스 정의
 */
interface RestartAPI {
  getDarkMode: () => Promise<boolean>;
  restartApp: () => void;
  closeWindow: () => void;
}

/**
 * Window 인터페이스 확장
 */
declare global {
  interface Window {
    restartAPI?: RestartAPI;
    electronAPI?: {
      restartApp?: () => void;
      getDarkMode?: () => Promise<boolean>;
      closeWindow?: () => void;
      setWindowSize?: (width: number, height: number) => void;
    };
  }
}

interface RestartPromptProps {
  reason?: string;
}

/**
 * 재시작 안내 컴포넌트
 */
const RestartPrompt: React.FC<RestartPromptProps> = ({ 
  reason = 'GPU 가속 설정이 변경되었습니다.' 
}) => {
  const [isRestarting, setIsRestarting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [isOSWindows, setIsOSWindows] = useState(false);
  const [isOSMac, setIsOSMac] = useState(false);

  // OS 감지
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsOSWindows(userAgent.includes('windows'));
    setIsOSMac(userAgent.includes('macintosh'));
  }, []);

  // 테마 가져오기 함수
  const fetchTheme = async () => {
    try {
      // 1. 먼저 시스템 다크 모드 설정 확인
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSystemPrefersDark(prefersDark);
      
      // 2. API에서 테마 설정 가져오기 시도
      let themeSetting = null;
      
      if (window.restartAPI?.getDarkMode) {
        themeSetting = await window.restartAPI.getDarkMode();
      } else if (window.electronAPI?.getDarkMode) {
        themeSetting = await window.electronAPI.getDarkMode();
      }
      
      // 3. localStorage에서 테마 설정 확인
      const savedTheme = localStorage.getItem('theme');
      
      // 4. 최종 테마 설정 결정
      if (themeSetting !== null) {
        setDarkMode(themeSetting);
      } else if (savedTheme) {
        setDarkMode(savedTheme === 'dark');
      } else {
        setDarkMode(prefersDark);
      }
    } catch (error) {
      console.error('테마 설정 가져오기 오류:', error);
      // 오류 발생 시 시스템 설정 사용
      setDarkMode(systemPrefersDark);
    }
  };

  useEffect(() => {
    // 테마 설정 가져오기
    fetchTheme();
    
    // 다크모드 적용
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // 시스템 다크모드 변경 감지
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
      // API 설정이 없는 경우 시스템 설정 따름
      if (!window.restartAPI?.getDarkMode && !window.electronAPI?.getDarkMode) {
        setDarkMode(e.matches);
        if (e.matches) {
          document.body.classList.add('dark-mode');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.body.classList.remove('dark-mode');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, [darkMode]);

  // 창 크기 조정
  useEffect(() => {
    // 창 크기 설정 - Electron API 사용
    if (window.electronAPI && typeof window.electronAPI.setWindowSize === 'function') {
      window.electronAPI.setWindowSize(520, 370); // 약간 더 큰 크기로 조정
    }
    
    // 스타일 직접 설정 (대체 방법)
    const rootElement = document.documentElement;
    rootElement.style.setProperty('--window-width', '520px');
    rootElement.style.setProperty('--window-height', '370px');
    
    // OS에 따른 추가 스타일 적용
    if (isOSWindows) {
      rootElement.classList.add('win32');
    } else if (isOSMac) {
      rootElement.classList.add('darwin');
    } else {
      rootElement.classList.add('linux');
    }
    
  }, [isOSWindows, isOSMac]);

  // 키보드 이벤트 핸들러 - 접근성 향상
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  
  // 앱 재시작 함수
  const handleRestart = () => {
    setIsRestarting(true);
    
    // 확실한 재시작을 위해 약간의 지연 추가
    setTimeout(() => {
      // 전자 API 사용 가능하면 재시작
      if (window.restartAPI?.restartApp) {
        try {
          console.log('restartAPI를 사용하여 재시작 시도');
          window.restartAPI.restartApp();
        } catch (error) {
          console.error('재시작 중 오류 발생:', error);
          setIsRestarting(false);
        }
      } else if (window.electronAPI?.restartApp) {
        // 대체 API 시도
        try {
          console.log('electronAPI를 사용하여 재시작 시도');
          window.electronAPI.restartApp();
        } catch (error) {
          console.error('대체 API로 재시작 중 오류 발생:', error);
          setIsRestarting(false);
        }
      } else {
        console.warn('재시작 API를 찾을 수 없습니다');
        // 페이지 새로고침으로 대체
        try {
          window.location.reload();
        } catch (e) {
          console.error('새로고침 오류:', e);
          setIsRestarting(false);
        }
      }
    }, 500);
  };

  // 창 닫기 함수
  const handleClose = () => {
    // 창 닫기 API 사용
    if (window.electronAPI?.closeWindow) {
      try {
        window.electronAPI.closeWindow();
      } catch (error) {
        console.error('창 닫기 중 오류 발생:', error);
        fallbackClose();
      }
    } else if (window.restartAPI?.closeWindow) {
      try {
        window.restartAPI.closeWindow();
      } catch (error) {
        console.error('창 닫기 중 오류 발생:', error);
        fallbackClose();
      }
    } else {
      fallbackClose();
    }
  };
  
  // 대체 창 닫기 방법
  const fallbackClose = () => {
    try {
      // closeRestartWindow API 시도 (이전 버전 호환성)
      if (window.electronAPI && 'closeRestartWindow' in window.electronAPI) {
        // @ts-ignore
        window.electronAPI.closeRestartWindow();
      } else if (window.close) {
        window.close();
      }
    } catch (e) {
      console.error('대체 창 닫기 중 오류:', e);
    }
  };

  // 운영체제에 따른 클래스 결정
  const osClass = isOSWindows ? styles.windows : isOSMac ? styles.macos : styles.linux;

  return (
    <div 
      className={`${styles['system-window']} ${darkMode ? styles['dark-mode'] : ''} ${osClass}`}
      role="dialog" 
      aria-labelledby="restart-title"
      aria-describedby="restart-message"
    >
      <div className={styles.titlebar}>
        <h1 id="restart-title">앱 재시작</h1>
        <button
          className={styles['close-button']}
          onClick={handleClose}
          onKeyDown={(e) => handleKeyDown(e, handleClose)}
          aria-label="닫기"
          tabIndex={0}
        >
          ×
        </button>
      </div>
      
      <div className={styles.content}>
        {isRestarting ? (
          <div className={styles['restarting-state']} aria-live="polite">
            <div className={styles['loading-spinner']} role="progressbar" aria-label="재시작 중">
              <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
              </svg>
            </div>
            <p id="restart-message" className={styles.message}>
              앱을 재시작하는 중입니다. 잠시만 기다려 주세요...
            </p>
          </div>
        ) : (
          <div className={styles['prompt-state']}>
            <div className={styles.icon} aria-hidden="true">
              {darkMode ? '🔄' : '⚠️'}
            </div>
            <p id="restart-message" className={styles.message}>
              {reason}<br />
              설정 변경사항을 적용하려면 앱을 재시작해야 합니다.
            </p>
            <div className={styles.buttons}>
              <button
                className={`${styles.button} ${styles.primary}`}
                onClick={handleRestart}
                onKeyDown={(e) => handleKeyDown(e, handleRestart)}
                tabIndex={0}
              >
                지금 재시작
              </button>
              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={handleClose}
                onKeyDown={(e) => handleKeyDown(e, handleClose)}
                tabIndex={0}
              >
                나중에 재시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestartPrompt;