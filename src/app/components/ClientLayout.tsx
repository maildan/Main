'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastContext';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}