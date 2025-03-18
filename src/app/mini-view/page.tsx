'use client';

import React from 'react';
import MiniView from '../components/MiniView';
import { ToastProvider } from '../components/ToastContext';

export default function MiniViewPage() {
  return (
    <ToastProvider>
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        padding: 0,
        margin: 0
      }}>
        <MiniView />
      </div>
    </ToastProvider>
  );
}

export const dynamic = 'force-dynamic';
