'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import HydrationFix from './components/HydrationFix';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// 테마 컨텍스트 생성
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 테마 컨텍스트 훅
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // 클라이언트 사이드에서만 localStorage 사용
  useEffect(() => {
    // 시스템 테마 기본값
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme: Theme = prefersDark ? 'dark' : 'light';
    
    // localStorage에서 저장된 테마 가져오기
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = (savedTheme === 'light' || savedTheme === 'dark') 
      ? savedTheme as Theme 
      : defaultTheme;
    
    setTheme(initialTheme);
    
    // HTML 요소에 테마 클래스 적용
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    setMounted(true);
  }, []);

  // 테마 전환 함수
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // HTML 요소에 테마 클래스 적용
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  // 하이드레이션 문제를 방지하기 위해 마운트 전에는 children만 렌더링
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* 하이드레이션 문제 해결을 위한 컴포넌트 */}
      <HydrationFix />
      
      {/* suppressHydrationWarning으로 경고 방지, 마운트 상태 관리 */}
      <div suppressHydrationWarning className={mounted ? theme : 'light'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
} 