'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastContext';
import { shell } from 'electron';

interface ClientLayoutProps {
  children: ReactNode;
}

// 권한 오류 타입 정의
interface PermissionError {
  code: string;
  message: string;
  detail?: string;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // 권한 오류 상태
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  // 배너 닫기 애니메이션 상태
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // 권한 오류 이벤트 리스너
    const handlePermissionError = (error: PermissionError) => {
      console.log('권한 오류 발생:', error);
      setIsClosing(false); // 새로운 오류가 발생하면 닫기 상태 초기화
      setPermissionError(error);
    };

    // 권한 상태 업데이트 이벤트 리스너
    const handlePermissionStatus = (status: { code: string, granted: boolean }) => {
      if (status.granted && permissionError?.code === status.code) {
        // 권한이 허용되면 닫기 애니메이션 후 오류 상태 제거
        handleCloseBanner();
      }
    };

    // IPC 이벤트 리스너 등록
    let removePermissionErrorListener: () => void = () => {};
    let removePermissionStatusListener: () => void = () => {};

    if (typeof window !== 'undefined' && window.electronAPI) {
      // 권한 오류 이벤트 수신
      removePermissionErrorListener = window.electronAPI.onPermissionError(handlePermissionError);
      // 권한 상태 업데이트 이벤트 수신
      removePermissionStatusListener = window.electronAPI.onPermissionStatus(handlePermissionStatus);
    }

    return () => {
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      removePermissionErrorListener();
      removePermissionStatusListener();
    };
  }, [permissionError]);

  // macOS 시스템 환경설정 열기
  const openSystemPreferences = () => {
    if (permissionError?.code === 'SCREEN_RECORDING') {
      // macOS 화면 기록 권한 설정 페이지 열기
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenRecording');
    }
  };

  // 배너 닫기 애니메이션 처리
  const handleCloseBanner = () => {
    setIsClosing(true); // 먼저 애니메이션 시작
    
    // 애니메이션 완료 후 상태 제거
    setTimeout(() => {
      setPermissionError(null);
      setIsClosing(false);
    }, 300); // 애니메이션 시간과 일치
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        {/* 권한 오류 배너 */}
        {permissionError && (
          <div className={`permission-error-banner ${isClosing ? 'closing' : ''}`}>
            <div className="permission-error-content">
              <div className="permission-error-title">⚠️ 권한 오류: {permissionError.message}</div>
              {permissionError.detail && (
                <div className="permission-error-detail">{permissionError.detail}</div>
              )}
            </div>
            <div className="permission-error-actions">
              <button 
                className="permission-settings-button" 
                onClick={openSystemPreferences}
              >
                설정 열기
              </button>
              <button 
                className="permission-close-button" 
                onClick={handleCloseBanner}
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}