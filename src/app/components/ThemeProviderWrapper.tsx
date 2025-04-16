'use client';

import React from 'react';
import { ThemeProvider } from './ThemeProvider';

// ThemeToggle을 별도로 가져와서 사용하는 대신 Settings 컴포넌트 내에서
// 테마 관련 설정을 관리합니다.

export default function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}