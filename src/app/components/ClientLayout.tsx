'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider, useToast } from './ToastContext';
import { DynamicPermissionBanner } from './dynamic-components';

interface ClientLayoutProps {
  children: ReactNode;
}

interface PermissionError {
  code: string;
  message: string;
  detail?: string;
  permissions?: {
    screenRecording?: boolean | null;
    accessibility?: boolean | null;
  };
}

interface PermissionStatus {
  screenRecording: boolean | null;
  accessibility: boolean | null;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { showToast } = useToast();
  const [_permissionError, setPermissionError] = useState<PermissionError | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    screenRecording: null,
    accessibility: null
  });
  const [bannerClosed, setBannerClosed] = useState(false);

  useEffect(() => {
    // Electron API 확인
    const electronAPI = window.electronAPI;
    if (!electronAPI) return;

    // 권한 오류 리스너
    const handlePermissionError = (error: PermissionError) => {
      console.log('권한 오류 발생:', error);
      setPermissionError(error);
      
      if (error.code === 'macos-permissions') {
        setPermissionStatus({
          screenRecording: error.permissions?.screenRecording ?? null,
          accessibility: error.permissions?.accessibility ?? null
        });
        
        showToast(`권한 오류: ${error.message}`, 'warning');
      }
    };

    // 권한 상태 업데이트 리스너
    const handlePermissionStatus = (status: { 
      code: string,
      details?: {
        screenRecording?: boolean | null;
        accessibility?: boolean | null;
      }
    }) => {
      if (status.code === 'macos-permissions') {
        setPermissionStatus({
          screenRecording: status.details?.screenRecording ?? null,
          accessibility: status.details?.accessibility ?? null
        });
      }
    };

    // 리스너 등록
    let removePermissionErrorListener: (() => void) | undefined;
    let removePermissionStatusListener: (() => void) | undefined;

    if (electronAPI.onPermissionError) {
      removePermissionErrorListener = electronAPI.onPermissionError(handlePermissionError);
    }
    
    if (electronAPI.onPermissionStatus) {
      removePermissionStatusListener = electronAPI.onPermissionStatus(handlePermissionStatus);
    }
    
    // 초기 권한 확인
    if (electronAPI.checkPermissions) {
      electronAPI.checkPermissions()
        .then((status: PermissionStatus) => {
          setPermissionStatus({
            screenRecording: status.screenRecording,
            accessibility: status.accessibility
          });
        })
        .catch(console.error);
    }

    // 클린업
    return () => {
      if (removePermissionErrorListener) removePermissionErrorListener();
      if (removePermissionStatusListener) removePermissionStatusListener();
    };
  }, [showToast]);

  // 시스템 환경설정 열기
  const openSystemPreferences = () => {
    if (window.electronAPI?.openPermissionsSettings) {
      window.electronAPI.openPermissionsSettings()
        .then((success: boolean) => {
          if (!success) {
            showToast('시스템 설정을 여는 데 실패했습니다.', 'error');
          }
        })
        .catch(() => {
          showToast('시스템 설정을 열 수 없습니다.', 'error');
        });
    } else {
      showToast('시스템 설정을 열 수 없습니다.', 'error');
    }
  };

  // 권한 배너 닫기
  const handleCloseBanner = () => {
    setBannerClosed(true);
  };
  
  // 권한 배너가 필요한지 확인
  const needsPermissionBanner = () => {
    if (bannerClosed) return false;
    
    // macOS에서만 표시
    if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('Mac OS')) {
      return false;
    }
    
    // 권한 중 하나라도 false인 경우 배너 표시 필요
    return permissionStatus.screenRecording === false || 
           permissionStatus.accessibility === false;
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        {needsPermissionBanner() && (
          <DynamicPermissionBanner
            screenRecording={permissionStatus.screenRecording}
            accessibility={permissionStatus.accessibility}
            onOpenSettings={openSystemPreferences}
            onClose={handleCloseBanner}
          />
        )}
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}