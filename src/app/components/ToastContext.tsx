import React, { createContext, useContext, useState } from 'react';
import { Toast } from './Toast';

type ToastType = 'success' | 'error' | 'info' | 'warning'; // warning 타입 추가

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    
    // 3초 후 자동으로 토스트 제거
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    // 오류 대신 더미 함수 반환하여 앱이 중단되지 않도록 함
    return {
      showToast: (message: string, type: ToastType) => {
        console.warn('ToastProvider가 설정되지 않았습니다:', message);
      }
    };
  }
  return context;
};