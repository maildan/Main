'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

interface ThemeProviderWrapperProps {
  children: ReactNode;
}

export function ThemeProviderWrapper({ children }: ThemeProviderWrapperProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}