'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// 테마 타입과 컬러 스키마 타입 정의
export type ThemeMode = 'light' | 'dark';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'high-contrast';

interface ThemeContextType {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setDarkMode: (isDark: boolean) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  isDarkMode: boolean;
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => void;
}

const defaultContext: ThemeContextType = {
  theme: 'light',
  colorScheme: 'default',
  toggleTheme: () => {},
  setDarkMode: () => {},
  setColorScheme: () => {},
  isDarkMode: false,
  isSystemTheme: false,
  setSystemTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  initialColorScheme?: ColorScheme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'light',
  initialColorScheme = 'default',
}) => {
  const [theme, setTheme] = useState<ThemeMode>(initialMode);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialColorScheme);
  const [isSystemTheme, setIsSystemTheme] = useState<boolean>(false);
  
  // 이전 테마를 저장하기 위한 ref (시스템 테마 사용 시 이전 설정으로 돌아가기 위함)
  const previousThemeRef = useRef<ThemeMode>('light');
  const isInitialMount = useRef(true);

  const applyTheme = (newTheme: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 다크모드일 때 body에 dark-mode 클래스 추가
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  };

  const applyColorScheme = (scheme: ColorScheme) => {
    // 기존 컬러 스키마 클래스 모두 제거
    document.documentElement.classList.remove(
      'theme-default', 
      'theme-blue', 
      'theme-green', 
      'theme-purple', 
      'theme-high-contrast'
    );
    
    // 새 컬러 스키마 적용
    document.documentElement.classList.add(`theme-${scheme}`);
  };

  // 테마 토글 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    previousThemeRef.current = newTheme;
    saveThemeSettings(newTheme, colorScheme, false);
  };

  // 다크 모드 직접 설정 함수
  const setDarkMode = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    previousThemeRef.current = newTheme;
    saveThemeSettings(newTheme, colorScheme, false);
  };

  // 컬러 스키마 설정 함수
  const setThemeColorScheme = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    saveThemeSettings(theme, scheme, isSystemTheme);
  };

  // 시스템 테마 사용 설정 함수
  const setUseSystemTheme = (useSystem: boolean) => {
    setIsSystemTheme(useSystem);
    
    if (useSystem) {
      // 시스템 테마 적용
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    } else {
      // 이전에 설정한 테마로 복원
      setTheme(previousThemeRef.current);
    }
    
    saveThemeSettings(theme, colorScheme, useSystem);
  };

  // 테마 설정 저장 함수
  const saveThemeSettings = (
    themeMode: ThemeMode, 
    scheme: ColorScheme, 
    useSystem: boolean
  ) => {
    try {
      const settings = {
        theme: themeMode,
        colorScheme: scheme,
        useSystemTheme: useSystem
      };
      
      localStorage.setItem('themeSettings', JSON.stringify(settings));
      
      // Electron API가 있는 경우 저장
      if (window.electronAPI && window.electronAPI.setTheme) {
        window.electronAPI.setTheme(settings).catch((error: any) => {
          console.error('Electron 테마 설정 저장 실패:', error);
        });
      }
    } catch (error) {
      console.error('테마 설정 저장 실패:', error);
    }
  };

  // 테마 설정 로드 함수
  const loadThemeSettings = () => {
    try {
      // 먼저 localStorage에서 설정 불러오기
      const savedSettings = localStorage.getItem('themeSettings');
      
      // Electron API를 통해 설정 불러오기 시도
      if (window.electronAPI && window.electronAPI.getTheme) {
        window.electronAPI.getTheme()
          .then((electronSettings: any) => {
            if (electronSettings) {
              applySettings(electronSettings);
            } else if (savedSettings) {
              applySettings(JSON.parse(savedSettings));
            } else {
              applySystemThemeIfEnabled();
            }
          })
          .catch((error: any) => {
            console.error('Electron 테마 설정 로드 실패:', error);
            
            // 로컬 저장소에서 로드 시도
            if (savedSettings) {
              applySettings(JSON.parse(savedSettings));
            } else {
              applySystemThemeIfEnabled();
            }
          });
      } else if (savedSettings) {
        applySettings(JSON.parse(savedSettings));
      } else {
        applySystemThemeIfEnabled();
      }
    } catch (error) {
      console.error('테마 설정 로드 실패:', error);
      applySystemThemeIfEnabled();
    }
  };

  const applySettings = (settings: any) => {
    if (settings.theme) {
      setTheme(settings.theme);
      previousThemeRef.current = settings.theme;
    }
    
    if (settings.colorScheme) {
      setColorScheme(settings.colorScheme);
    }
    
    if (settings.useSystemTheme !== undefined) {
      setIsSystemTheme(settings.useSystemTheme);
      
      if (settings.useSystemTheme) {
        applySystemThemeIfEnabled();
      }
    }
  };

  const applySystemThemeIfEnabled = () => {
    if (isSystemTheme || !localStorage.getItem('themeSettings')) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    }
  };

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (isSystemTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    // 최신 브라우저는 addEventListener 사용
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleThemeChange);
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }
    
    // 이전 브라우저는 deprecated된 addListener 사용
    mediaQuery.addListener(handleThemeChange);
    return () => mediaQuery.removeListener(handleThemeChange);
  }, [isSystemTheme]);

  // 초기 마운트 시 테마 설정 로드
  useEffect(() => {
    if (isInitialMount.current) {
      loadThemeSettings();
      isInitialMount.current = false;
    }
  }, []);

  // 테마 변경 시 적용
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 컬러 스키마 변경 시 적용
  useEffect(() => {
    applyColorScheme(colorScheme);
  }, [colorScheme]);

  // 컨텍스트 값
  const contextValue: ThemeContextType = {
    theme,
    colorScheme,
    toggleTheme,
    setDarkMode,
    setColorScheme: setThemeColorScheme,
    isDarkMode: theme === 'dark',
    isSystemTheme,
    setSystemTheme: setUseSystemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};