'use client';

import { useState, useCallback, useContext } from 'react';
import { ToastContext, ToastContextType } from '../components/ToastContext';

interface ToastOptions {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
