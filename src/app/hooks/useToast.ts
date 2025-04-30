'use client';

import { useState, useCallback } from 'react';

interface ToastOptions {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // 토스트 메시지 표시
  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = Date.now();
    const type = options.type || 'info';
    const duration = options.duration || 3000;
    
    // 토스트 추가
    setToasts(prev => [...prev, { id, message, type }]);
    
    // 자동 제거 타이머 설정
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
    
    return id;
  }, []);
  
  // 특정 토스트 제거
  const hideToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  // 모든 토스트 제거
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  return {
    toasts,
    showToast,
    hideToast,
    clearAllToasts
  };
}
