'use client';

import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/ToastContext';
import { HomeContent } from './components/HomeContent';

// 메인 페이지 컴포넌트 - 대폭 간소화됨
export default function Home() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <React.Suspense fallback={<div>Loading...</div>}>
          <HomeContent />
        </React.Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}