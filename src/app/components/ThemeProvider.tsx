'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

// 테마 타입과 컬러 스키마 타입 정의
export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'high-contrast';

// 테마 컨텍스트 타입 정의
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
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

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
// 컬러 스키마 컨텍스트 생성
const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

// 테마 훅 사용을 위한 커스텀 훅
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 컬러 스키마 훅 사용을 위한 커스텀 훅
export const useColorScheme = (): ColorSchemeContextType => {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
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

// Helper function 정의 복원
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Helper function 정의 복원
const getInitialTheme = (defaultTheme: string, storageKey: string): string => {
  if (typeof window === 'undefined') {
    return defaultTheme === 'system' ? getSystemTheme() : defaultTheme;
  }
  const storedTheme = localStorage.getItem(storageKey);
  if (storedTheme) {
    return storedTheme;
  }
  const resolvedTheme = defaultTheme === 'system' ? getSystemTheme() : defaultTheme;
  return resolvedTheme;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultTheme = 'system', storageKey = 'theme' }): React.ReactNode => {
  const [theme, setTheme] = useState<string>(() => getInitialTheme(defaultTheme, storageKey));
  const [isDarkMode, setIsDarkMode] = useState<boolean>(theme === 'dark');

  const applyTheme = useCallback((newTheme: string): void => {
    document.documentElement.classList.remove('light', 'dark');
    const themeToApply = newTheme === 'system' ? getSystemTheme() : newTheme;
    document.documentElement.classList.add(themeToApply);
    setIsDarkMode(themeToApply === 'dark');
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (e) {
      console.warn(`Failed to set theme in localStorage: ${e}`);
    }
  }, [storageKey]);

  const handleSetTheme = useCallback((newTheme: string): void => {
    setTheme(newTheme);
    applyTheme(newTheme);
  }, [applyTheme, setTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  // Electron API 연동 (선택적)
  useEffect(() => {
    const setupElectronTheme = async () => {
      if (window.electronAPI) {
        try {
          const storedTheme = await window.electronAPI.getTheme();
          if (storedTheme && storedTheme !== theme) {
            handleSetTheme(storedTheme);
          }
          window.electronAPI.onThemeChanged(handleSetTheme);
        } catch (error) {
          console.error('Error setting up Electron theme sync:', error);
        }
      }
    };
    setupElectronTheme();

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('theme-changed', handleSetTheme);
      }
    };
  }, [theme, handleSetTheme]);

  const value: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    isDarkMode,
    toggleTheme: () => handleSetTheme(theme === 'light' ? 'dark' : 'light'),
    setDarkMode: (darkMode: boolean) => handleSetTheme(darkMode ? 'dark' : 'light')
  };

  return (
    <ThemeContext.Provider value={value}>
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