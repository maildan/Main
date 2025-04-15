'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// 테마 컨텍스트 정의
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setDarkMode: () => {},
  isDarkMode: false,
});

// useTheme 훅 생성
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // 다크 모드 설정 함수
  const setDarkMode = (enabled: boolean) => {
    setTheme(enabled ? 'dark' : 'light');
    setIsDarkMode(enabled);
    
    // HTML 태그에 dark-mode 클래스 적용
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
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
    if (window.electronAPI && window.electronAPI.setDarkMode) {
      window.electronAPI.setDarkMode(enabled)
        .catch((error: any) => {
          console.error('Electron API로 다크 모드 설정 중 오류:', error);
        });
    }
  };
  
  // 테마 토글 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setDarkMode(newTheme === 'dark');
  };
  
  useEffect(() => {
    // 시스템 다크 모드 감지를 위한 미디어 쿼리
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const loadThemeSettings = async () => {
      try {
        // Electron API를 통해 다크 모드 설정 가져오기 시도
        if (window.electronAPI && window.electronAPI.getDarkMode) {
          try {
            const darkModeEnabled = await window.electronAPI.getDarkMode();
            setDarkMode(darkModeEnabled);
            return;
          } catch (error) {
            console.error('Electron API에서 다크 모드 설정을 가져오는 중 오류:', error);
          }
        }
        
        // 로컬 스토리지에서 다크 모드 설정 불러오기
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.darkMode !== undefined) {
            setDarkMode(settings.darkMode);
            return;
          }
        }
        
        // 위 방법이 모두 실패하면 시스템 설정 사용
        const prefersDarkMode = darkModeMediaQuery.matches;
        setDarkMode(prefersDarkMode);
      } catch (e) {
        console.error('설정 파싱 오류:', e);
        // 오류 시 시스템 설정 사용
        setDarkMode(darkModeMediaQuery.matches);
      }
    };
    
    loadThemeSettings();
    
    // 시스템 다크 모드 변경 감지
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      // 사용자가 로컬 설정을 하지 않은 경우에만 시스템 설정 따름
      const savedSettings = localStorage.getItem('app-settings');
      if (!savedSettings || !JSON.parse(savedSettings).darkMode) {
        setDarkMode(e.matches);
      }
    };
    
    darkModeMediaQuery.addEventListener('change', handleColorSchemeChange);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleColorSchemeChange);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDarkMode, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}