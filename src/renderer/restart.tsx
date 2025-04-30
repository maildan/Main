'use client';

import React, { useEffect, useState } from 'react';
import './restart.module.css';

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  
  useEffect(() => {
    // 테마 설정 가져오기
    async function fetchTheme() {
      try {
        // 1. restartAPI 시도
        if (window.restartAPI?.getDarkMode) {
          console.log('restartAPI로 다크모드 정보 가져오기');
          const darkMode = await window.restartAPI.getDarkMode();
          setIsDarkMode(darkMode);
          return;
        }
        
        // 2. electronAPI 대체 사용
        if (window.electronAPI?.getDarkMode) {
          console.log('electronAPI로 다크모드 정보 가져오기');
          const darkMode = await window.electronAPI.getDarkMode();
          setIsDarkMode(darkMode);
          return;
        }
        
        // 3. 시스템 환경설정 확인 (최후의 방법)
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          console.log('시스템 설정으로 다크모드 감지');
          setIsDarkMode(true);
        }
      } catch (error) {
        console.error('테마 불러오기 중 오류:', error);
        // 오류 발생 시 시스템 기본 설정 사용
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setIsDarkMode(true);
        }
      }
    }
    
    fetchTheme();
  }, []);
  
  // 앱 재시작 함수
  const handleRestart = () => {
    setIsRestarting(true);
    
    try {
      const restartDelay = 800; // 애니메이션을 위한 지연 시간
      
      // 1. restartAPI 시도
      if (window.restartAPI?.restartApp) {
        console.log('restartAPI.restartApp 사용');
        
        setTimeout(() => {
          try {
            window.restartAPI?.restartApp();
          } catch (error) {
            console.error('재시작 실행 중 오류:', error);
            setIsRestarting(false); // 오류 시 재시작 상태 해제
          }
        }, restartDelay);
        return;
      }
      
      // 2. electronAPI 대체 사용
      if (window.electronAPI?.restartApp) {
        console.log('electronAPI.restartApp 사용');
        
        setTimeout(() => {
          try {
            window.electronAPI?.restartApp();
          } catch (error) {
            console.error('재시작 실행 중 오류 (electronAPI):', error);
            setIsRestarting(false); // 오류 시 재시작 상태 해제
          }
        }, restartDelay);
        return;
      }
      
      // 3. 실패 시 오류 메시지 표시
      console.error('재시작 API를 찾을 수 없습니다. preload-restart.js 파일을 확인하세요.');
      setTimeout(() => setIsRestarting(false), 2000); // 2초 후 재시작 상태 해제
      
    } catch (error) {
      console.error('재시작 처리 중 오류:', error);
      setIsRestarting(false);
    }
  };
  
  // 창 닫기 함수
  const handleClose = () => {
    try {
      // 1. restartAPI 시도
      if (window.restartAPI?.closeWindow) {
        window.restartAPI.closeWindow();
        return;
      }
      
      // 2. 대체 방법 - window.close()
      window.close();
    } catch (error) {
      console.error('창 닫기 중 오류:', error);
    }
  };
  
  return (
    <div className={`container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header">
        <h1>앱 재시작</h1>
        <button 
          className="closeButton" 
          onClick={handleClose}
          disabled={isRestarting}
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      
      <div className="content">
        {isRestarting ? (
          <div className="restartingState">
            <div className="loadingIcon">
              <svg className="spinner" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
            </div>
            <p className="message">
              재시작 중입니다...<br />
              잠시만 기다려주세요.
            </p>
          </div>
        ) : (
          <div className="promptState">
            <div className="icon">🔄</div>
            <p className="message">
              {reason}<br />
              변경된 설정을 적용하려면 앱을 재시작해야 합니다.
            </p>
            <div className="buttons">
              <button 
                className="button primary" 
                onClick={handleRestart}
                disabled={isRestarting}
              >
                지금 재시작
              </button>
              <button 
                className="button secondary" 
                onClick={handleClose}
                disabled={isRestarting}
              >
                나중에 하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestartPrompt;