'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}