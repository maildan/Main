'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isElectron } from './utils/platform';

type ClientContextType = {
  isElectronApp: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

type ClientProviderProps = {
  children: ReactNode;
};

/**
 * 클라이언트 측 컨텍스트 제공자
 * 전역 상태와 기능을 자식 컴포넌트에 제공
 */
export const ClientProvider = ({ children }: ClientProviderProps) => {
  const [isElectronApp, setIsElectronApp] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 초기 다크 모드 설정 (로컬 스토리지 또는 시스템 선호도에서 가져옴)
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialDarkMode = savedTheme 
      ? savedTheme === 'dark' 
      : prefersDark;
    
    setIsDarkMode(initialDarkMode);
    
    // 다크 모드 상태에 따라 HTML 클래스 업데이트
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Electron 검사
    setIsElectronApp(isElectron());
  }, []);

  // 다크 모드 토글 함수
  const handleToggleDarkMode = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      
      // 로컬 스토리지에 저장
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      
      // HTML 클래스 업데이트
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return newMode;
    });
  };

  const contextValue: ClientContextType = {
    isElectronApp,
    isDarkMode,
    toggleDarkMode: handleToggleDarkMode
  };

  return (
    <ClientContext.Provider value={contextValue}>
      {children}
    </ClientContext.Provider>
  );
};

/**
 * 클라이언트 컨텍스트 사용을 위한 훅
 * @returns 클라이언트 컨텍스트 값
 */
export const useClientContext = (): ClientContextType => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
};

export default ClientProvider;
