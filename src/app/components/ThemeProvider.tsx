'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// 테마 컨텍스트 정의
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setDarkMode: () => {},
});

// useTheme 훅 생성
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // 다크 모드 설정 함수
  const setDarkMode = (enabled: boolean) => {
    setTheme(enabled ? 'dark' : 'light');
    
    // HTML 태그에 dark-mode 클래스 적용
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    // 로컬 스토리지에 설정 저장
    try {
      const savedSettings = localStorage.getItem('app-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.darkMode = enabled;
      localStorage.setItem('app-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('설정 저장 오류:', e);
    }
    
    // Electron API가 있으면 설정 저장
    if (window.electronAPI) {
      window.electronAPI.setDarkMode(enabled);
    }
  };
  
  // 테마 토글 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setDarkMode(newTheme === 'dark');
  };
  
  useEffect(() => {
    // 로컬 스토리지에서 다크 모드 설정 불러오기
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDarkMode(settings.darkMode || false);
      } else {
        // 시스템 다크 모드 감지
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDarkMode);
      }
    } catch (e) {
      console.error('설정 파싱 오류:', e);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}