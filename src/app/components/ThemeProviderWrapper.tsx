'use client';

import React from 'react';
import { ThemeProvider } from './ThemeProvider';

// ThemeToggle을 별도로 가져와서 사용하는 대신 Settings 컴포넌트 내에서
// 테마 관련 설정을 관리합니다.

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

const ThemeProviderWrapper: React.FC<ThemeProviderWrapperProps> = ({ children }): React.ReactNode => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

export default ThemeProviderWrapper;