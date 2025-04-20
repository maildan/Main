'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ThemeContext 타입 정의
interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
  setDarkMode: (darkMode: boolean) => void;
  isDarkMode: boolean;
}

// Context 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Electron API 접근을 위한 타입 안전 함수
const getElectronAPI = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return null;
};

// 로컬 스토리지 조작을 위한 안전한 함수
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('로컬 스토리지 접근 오류:', error);
    }
    return null;
  },
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.error('로컬 스토리지 저장 오류:', error);
    }
    return false;
  }
};

// Hook 함수 정의
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};

// 로컬 스토리지 키
const THEME_STORAGE_KEY = 'themeSettings';

// 테마 설정을 로컬 스토리지에 저장
const saveThemeSettings = (theme: 'light' | 'dark', useSystemTheme: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme, useSystemTheme }));
    } catch (error) {
      console.error('로컬 스토리지에 테마 설정 저장 실패:', error);
    }
  }
};

// Provider 컴포넌트 정의
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>('light');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Electron API를 통해 또는 로컬 스토리지에서 테마 설정을 로드
  const loadThemeSettings = useCallback(async () => {
    const electronAPI = getElectronAPI();
    
    try {
      // Electron API가 있는 경우 우선 사용
      if (electronAPI && electronAPI.getTheme) {
        const storedTheme = await electronAPI.getTheme();
        if (storedTheme) {
          setTheme(storedTheme);
          setIsDarkMode(storedTheme === 'dark');
          return;
        }
      }
      
      // 로컬 스토리지에서 테마 로드 시도
      const storedTheme = safeLocalStorage.getItem('theme');
      if (storedTheme) {
        setTheme(storedTheme);
        setIsDarkMode(storedTheme === 'dark');
        return;
      }
      
      // 시스템 테마 확인
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        setIsDarkMode(true);
      }
    } catch (error) {
      console.error('테마 설정 로드 중 오류:', error);
      // 오류 발생 시 기본값 사용
      setTheme('light');
      setIsDarkMode(false);
    }
  }, []);

  // 테마 변경 함수
  const setDarkMode = useCallback(async (darkMode: boolean) => {
    const newTheme = darkMode ? 'dark' : 'light';
    setTheme(newTheme);
    setIsDarkMode(darkMode);
    
    try {
      // Electron API를 통해 테마 저장 시도
      const electronAPI = getElectronAPI();
      if (electronAPI && electronAPI.setTheme) {
        await electronAPI.setTheme(newTheme);
      } else {
        // 로컬 스토리지에 저장
        safeLocalStorage.setItem('theme', newTheme);
      }
      
      // HTML 요소에 테마 클래스 적용
      if (typeof document !== 'undefined') {
        if (darkMode) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (error) {
      console.error('테마 저장 중 오류:', error);
    }
  }, []);

  // 테마 토글 함수
  const toggleTheme = useCallback(() => {
    setDarkMode(!isDarkMode);
  }, [isDarkMode, setDarkMode]);

  // 초기 테마 로드 및 시스템 테마 변경 감지
  useEffect(() => {
    loadThemeSettings();
    
    // 시스템 테마 변경 감지 설정
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!safeLocalStorage.getItem('theme')) {
        setDarkMode(e.matches);
      }
    };
    
    // 이벤트 리스너 등록 (브라우저 호환성 고려)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if ((mediaQuery as any).addListener) {
      // Safari 14 이전 버전 호환성
      (mediaQuery as any).addListener(handleChange);
    }
    
    // 초기 테마 적용
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // 클린업 함수
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, [loadThemeSettings, setDarkMode, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDarkMode, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 