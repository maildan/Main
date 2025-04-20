'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

// 테마 타입과 컬러 스키마 타입 정의
export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'high-contrast';

// 테마 컨텍스트 타입 정의
interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
  setDarkMode: (darkMode: boolean) => void;
  isDarkMode: boolean;
}

// 컬러 스키마 컨텍스트 타입 정의
interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isSystemTheme: boolean;
  setSystemTheme: (isSystem: boolean) => void;
}

// 기본 테마 컨텍스트 값 설정
const defaultThemeContextValue: ThemeContextType = {
  theme: 'light',
  toggleTheme: () => {},
  setDarkMode: () => {},
  isDarkMode: false,
};

// 기본 컬러 스키마 컨텍스트 값 설정
const defaultColorSchemeContextValue: ColorSchemeContextType = {
  colorScheme: 'default',
  setColorScheme: () => {},
  isSystemTheme: true,
  setSystemTheme: () => {},
};

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
// 컬러 스키마 컨텍스트 생성
const ColorSchemeContext = createContext<ColorSchemeContextType>(defaultColorSchemeContextValue);

// 테마 훅 사용을 위한 커스텀 훅
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};

// 컬러 스키마 훅 사용을 위한 커스텀 훅
export const useColorScheme = () => {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error('useColorScheme은 ColorSchemeProvider 내에서만 사용할 수 있습니다');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Electron API 접근을 위한 타입 안전 함수
const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>('light');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Electron API를 통해 또는 로컬 스토리지에서 테마 설정을 로드
  const loadThemeSettings = useCallback(async () => {
    const electronAPI = getElectronAPI();
    
    try {
      // Electron API가 있는 경우 우선 사용
      if (electronAPI) {
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
      if (electronAPI) {
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
    } else if (mediaQuery.addListener) {
      // Safari 14 이전 버전 호환성
      mediaQuery.addListener(handleChange);
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
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [loadThemeSettings, setDarkMode, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setDarkMode, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 컬러 스키마 프로바이더 컴포넌트
export const ColorSchemeProvider = ({ children }: ThemeProviderProps) => {
  // 컬러 스키마 상태 관리
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('default');
  const [isSystemTheme, setIsSystemTheme] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // 전자 API 가용성 확인
  const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
  
  // 컬러 스키마 적용 함수
  const applyColorScheme = useCallback((newScheme: ColorScheme) => {
    // DOM 업데이트
    const root = document.documentElement;
    
    // 기존 클래스 제거
    root.classList.remove('scheme-default', 'scheme-blue', 'scheme-green', 'scheme-purple', 'scheme-high-contrast');
    
    // 새 클래스 추가
    root.classList.add(`scheme-${newScheme}`);
    
    // 상태 업데이트
    setColorSchemeState(newScheme);
    
    // 로컬 스토리지에 저장
    try {
      localStorage.setItem('colorScheme', newScheme);
    } catch (error) {
      console.error('로컬 스토리지에 컬러 스키마를 저장할 수 없습니다:', error);
    }
    
    // 전자 API 저장 (가능한 경우)
    if (electronAPI && electronAPI.setColorScheme) {
      try {
        electronAPI.setColorScheme(newScheme);
      } catch (error) {
        console.error('전자 API를 통해 컬러 스키마를 저장할 수 없습니다:', error);
      }
    }
  }, [electronAPI]);
  
  // 컬러 스키마 설정 함수
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    applyColorScheme(scheme);
    
    // 사용자가 명시적으로 테마를 변경했을 때 시스템 테마 따르기 비활성화
    setIsSystemTheme(false);
    
    // 시스템 테마 설정 저장
    try {
      localStorage.setItem('isSystemTheme', 'false');
    } catch (error) {
      console.error('로컬 스토리지에 시스템 테마 설정을 저장할 수 없습니다:', error);
    }
    
    // 전자 API 저장 (가능한 경우)
    if (electronAPI && electronAPI.setIsSystemTheme) {
      try {
        electronAPI.setIsSystemTheme(false);
      } catch (error) {
        console.error('전자 API를 통해 시스템 테마 설정을 저장할 수 없습니다:', error);
      }
    }
  }, [applyColorScheme, electronAPI]);
  
  // 시스템 테마 설정 함수
  const setSystemTheme = useCallback((isSystem: boolean) => {
    setIsSystemTheme(isSystem);
    
    // 로컬 스토리지에 저장
    try {
      localStorage.setItem('isSystemTheme', isSystem ? 'true' : 'false');
    } catch (error) {
      console.error('로컬 스토리지에 시스템 테마 설정을 저장할 수 없습니다:', error);
    }
    
    // 전자 API 저장 (가능한 경우)
    if (electronAPI && electronAPI.setIsSystemTheme) {
      try {
        electronAPI.setIsSystemTheme(isSystem);
      } catch (error) {
        console.error('전자 API를 통해 시스템 테마 설정을 저장할 수 없습니다:', error);
      }
    }
    
    // 시스템 테마로 설정한 경우 기본 스키마로 변경
    if (isSystem) {
      applyColorScheme('default');
    }
  }, [applyColorScheme, electronAPI]);
  
  // 초기 설정 로드
  useEffect(() => {
    if (isInitialized) return;
    
    const initializeColorScheme = async () => {
      let savedScheme: ColorScheme | null = null;
      let savedIsSystemTheme: boolean | null = null;
      
      // 전자 API에서 로드 시도
      if (electronAPI) {
        try {
          if (electronAPI.getColorScheme) {
            savedScheme = await electronAPI.getColorScheme() as ColorScheme;
          }
          if (electronAPI.getIsSystemTheme) {
            const systemThemeSetting = await electronAPI.getIsSystemTheme();
            savedIsSystemTheme = systemThemeSetting === 'true' || systemThemeSetting === true;
          }
        } catch (error) {
          console.error('전자 API에서 설정을 로드할 수 없습니다:', error);
        }
      }
      
      // 로컬 스토리지에서 로드 시도
      if (savedScheme === null) {
        try {
          const storedScheme = localStorage.getItem('colorScheme');
          if (storedScheme) {
            savedScheme = storedScheme as ColorScheme;
          }
        } catch (error) {
          console.error('로컬 스토리지에서 컬러 스키마를 로드할 수 없습니다:', error);
        }
      }
      
      if (savedIsSystemTheme === null) {
        try {
          const storedIsSystemTheme = localStorage.getItem('isSystemTheme');
          if (storedIsSystemTheme !== null) {
            savedIsSystemTheme = storedIsSystemTheme === 'true';
          }
        } catch (error) {
          console.error('로컬 스토리지에서 시스템 테마 설정을 로드할 수 없습니다:', error);
        }
      }
      
      // 기본값 적용
      const finalIsSystemTheme = savedIsSystemTheme !== null ? savedIsSystemTheme : true;
      setIsSystemTheme(finalIsSystemTheme);
      
      const finalScheme = finalIsSystemTheme ? 'default' : (savedScheme || 'default');
      applyColorScheme(finalScheme);
      
      setIsInitialized(true);
    };
    
    initializeColorScheme();
  }, [applyColorScheme, electronAPI, isInitialized]);
  
  // 컨텍스트 제공
  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme, isSystemTheme, setSystemTheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
};

// 통합 프로바이더 컴포넌트
export const AppThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <ThemeProvider>
      <ColorSchemeProvider>
        {children}
      </ColorSchemeProvider>
    </ThemeProvider>
  );
};

export default AppThemeProvider;