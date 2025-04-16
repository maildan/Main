'use client';

import React from 'react';
import ClientSideControls from './ClientSideControls';
import { ToastProvider } from './ToastContext';
import { ThemeProvider } from './ThemeProvider';
import { CustomHeader } from './CustomHeader';

interface MainLayoutProps {
  children: React.ReactNode;
  darkMode?: boolean;
  windowMode?: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
  electronAPI?: any;
  isHeaderVisible?: boolean;
}

export function MainLayout({ 
  children, 
  darkMode = false, 
  windowMode = 'windowed', 
  electronAPI = null,
  isHeaderVisible = true
}: MainLayoutProps) {
  const api = electronAPI || window.electronAPI || {};
  
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="app-layout">
          <CustomHeader 
            api={api} 
            isVisible={isHeaderVisible}
            autoHide={windowMode === 'fullscreen-auto-hide'}
          />          
          <main className="content-area" style={{ 
            height: '100vh',
            overflow: 'auto',
            padding: '16px',
            paddingTop: '56px' // 헤더 높이를 고려한 패딩 추가
          }}>
            <ClientSideControls>
              {children}
            </ClientSideControls>
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default MainLayout;
