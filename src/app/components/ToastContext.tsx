import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastProps } from './Toast'; // named import로 변경, ToastProps import

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// ToastMessage 타입 정의
interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// ToastContextType 인터페이스 export 추가
export interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

// ToastContext export 추가
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }): React.ReactNode => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info'): void => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5); // 고유 ID 생성 강화
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    // 자동 해제 타이머 설정 (옵션)
    setTimeout(() => dismissToast(id), 5000); // 5초 후 자동 해제
  }, []); // dismissToast 의존성 제거 (useCallback 내부에서 직접 참조하지 않음)

  const dismissToast = useCallback((id: string): void => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const value = {
    addToast,
    dismissToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2"> {/* 기본 스타일링 */}
        {toasts.map((toast) => (
          <Toast // named import 사용
            key={toast.id}
            id={toast.id} // id prop 전달
            message={toast.message}
            type={toast.type}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};