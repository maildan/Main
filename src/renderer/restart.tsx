'use client';

import React, { useEffect, useState } from 'react';

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
        if (window.restartAPI?.getDarkMode) {
          const darkMode = await window.restartAPI.getDarkMode();
          setIsDarkMode(darkMode);
        }
      } catch (error) {
        console.error('테마 불러오기 중 오류:', error);
      }
    }
    
    fetchTheme();
  }, []);
  
  // 앱 재시작 함수
  const handleRestart = () => {
    setIsRestarting(true);
    
    try {
      if (window.restartAPI?.restartApp) {
        // 애니메이션을 보여주기 위한 지연
        setTimeout(() => {
          try {
            window.restartAPI?.restartApp();
          } catch (error) {
            console.error('재시작 실행 중 오류:', error);
          }
        }, 800);
      } else if (window.electronAPI?.restartApp) {
        // restartAPI 객체가 없는 경우 electronAPI로 대체 시도
        setTimeout(() => {
          try {
            window.electronAPI?.restartApp();
          } catch (error) {
            console.error('재시작 실행 중 오류 (electronAPI):', error);
          }
        }, 800);
      } else {
        console.error('restartApp 함수가 정의되지 않았습니다. preload-restart.js 파일을 확인하세요.');
      }
    } catch (error) {
      console.error('재시작 처리 중 오류:', error);
    }
  };
  
  // 창 닫기 함수
  const handleClose = () => {
    if (window.restartAPI?.closeWindow) {
      window.restartAPI.closeWindow();
    } else {
      console.error('closeWindow 함수가 정의되지 않았습니다.');
    }
  };
  
  return (
    <div className={`restart-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header">
        <h1>앱 재시작</h1>
        <button 
          className="close-button" 
          onClick={handleClose}
          disabled={isRestarting}
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      
      <div className="content">
        {isRestarting ? (
          <>
            <div className="loading-icon">
              <svg className="spinner" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
            </div>
            <p className="message">
              재시작 중입니다...<br />
              잠시만 기다려주세요.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
      
      <style jsx>{`
        .restart-container {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          user-select: none;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .light-mode {
          --bg-color: #f8f9fa;
          --header-bg: #4d7cfe;
          --header-text: #ffffff;
          --text-color: #333333;
          --text-secondary: #555555;
          --border-color: #e0e0e0;
          --button-primary-bg: #4d7cfe;
          --button-primary-text: #ffffff;
          --button-primary-hover: #3a6de9;
          --button-secondary-bg: #f0f0f0;
          --button-secondary-text: #333333;
          --button-secondary-hover: #e0e0e0;
          --shadow-color: rgba(0, 0, 0, 0.1);
          --spinner-color: #4d7cfe;
          color-scheme: light;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        
        .dark-mode {
          --bg-color: #1e1e1e;
          --header-bg: #2d5bd3;
          --header-text: #ffffff;
          --text-color: #e0e0e0;
          --text-secondary: #b0b0b0;
          --border-color: #444444;
          --button-primary-bg: #3968e0;
          --button-primary-text: #ffffff;
          --button-primary-hover: #2d5bd3;
          --button-secondary-bg: #333333;
          --button-secondary-text: #e0e0e0;
          --button-secondary-hover: #444444;
          --shadow-color: rgba(0, 0, 0, 0.3);
          --spinner-color: #5e8efe;
          color-scheme: dark;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        
        .header {
          height: 40px;
          background-color: var(--header-bg);
          color: var(--header-text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          -webkit-app-region: drag;
          box-shadow: 0 2px 4px var(--shadow-color);
        }
        
        .header h1 {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }
        
        .close-button {
          background: none;
          border: none;
          color: var(--header-text);
          font-size: 22px;
          font-weight: bold;
          cursor: pointer;
          -webkit-app-region: no-drag;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .close-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        .close-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .content {
          flex: 1;
          padding: 25px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        
        .icon {
          font-size: 36px;
          margin-bottom: 20px;
          color: var(--button-primary-bg);
          animation: pulse 2s infinite;
        }
        
        .message {
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.6;
          color: var(--text-color);
          max-width: 320px;
        }
        
        .buttons {
          display: flex;
          gap: 12px;
        }
        
        .button {
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          border: none;
          outline: none;
          box-shadow: 0 2px 4px var(--shadow-color);
        }
        
        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        
        .primary {
          background-color: var(--button-primary-bg);
          color: var(--button-primary-text);
        }
        
        .primary:hover:not(:disabled) {
          background-color: var(--button-primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px var(--shadow-color);
        }
        
        .secondary {
          background-color: var(--button-secondary-bg);
          color: var(--button-secondary-text);
        }
        
        .secondary:hover:not(:disabled) {
          background-color: var(--button-secondary-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px var(--shadow-color);
        }
        
        /* 로딩 아이콘 스타일 */
        .loading-icon {
          width: 50px;
          height: 50px;
          margin-bottom: 20px;
        }
        
        .spinner {
          animation: rotate 2s linear infinite;
          z-index: 2;
          width: 50px;
          height: 50px;
        }
        
        .spinner .path {
          stroke: var(--spinner-color);
          stroke-linecap: round;
          animation: dash 1.5s ease-in-out infinite;
        }
        
        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default RestartPrompt;