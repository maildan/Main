'use client';

import { useState, useEffect } from 'react';
import { useElectron } from '../hooks/useElectron';
import styles from './PermissionBanner.module.css';

interface PermissionBannerProps {
  onClose?: () => void;
  screenRecording?: boolean | null;
  accessibility?: boolean | null;
  onOpenSettings?: () => void;
}

interface PermissionState {
  screenRecording: boolean | null;
  inputMonitoring: boolean | null;
  requiredApps: Array<{name: string, path: string, granted: boolean}>;
  executionContext?: {
    shell?: string;
    termProgram?: string;
    user?: string;
    cwd?: string;
    appPath?: string;
  };
  systemInfo?: {
    platform?: string;
    arch?: string;
    macOSVersion?: string;
    tccDatabasePath?: string;
    tccDatabaseExists?: boolean;
    extensionCheck?: {
      betterTouchTool?: boolean;
      bartender?: boolean;
      alfred?: boolean;
      cleanshot?: boolean;
    }
  };
  tccPermissionInfo?: string[];
  errorDetails?: string;
  detailsVisible?: boolean;
}

const PermissionBanner = ({ onClose, screenRecording: externalScreenRecording, accessibility: externalAccessibility, onOpenSettings }: PermissionBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<PermissionState>({
    screenRecording: externalScreenRecording !== undefined ? externalScreenRecording : null,
    inputMonitoring: externalAccessibility !== undefined ? externalAccessibility : null,
    requiredApps: [],
    detailsVisible: false
  });
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTccInfo, setShowTccInfo] = useState(false);

  const electron = useElectron();
  
  // 권한 정보 요청
  const fetchPermissionDetails = async () => {
    if (!electron?.ipcRenderer) return;
    
    try {
      const result = await electron.ipcRenderer.invoke('get-permission-details');
      
      if (result.success) {
        setState({
          screenRecording: result.screenCapturePermission?.granted || false,
          inputMonitoring: false, // 아직 미구현
          requiredApps: result.requiredApps || [],
          executionContext: result.executionContext || {},
          systemInfo: result.systemInfo || {},
          tccPermissionInfo: result.tccPermissionInfo || [],
          errorDetails: result.screenCapturePermission?.reason || result.error,
          detailsVisible: false
        });
        
        setVisible(!result.screenCapturePermission?.granted);
    } else {
        console.error('권한 정보 요청 실패:', result.error);
        setState(prev => ({
          ...prev,
          errorDetails: result.error
        }));
        setVisible(true);
    }
    } catch (error) {
      console.error('권한 정보 요청 중 오류:', error);
    }
  };

  // 권한 재확인 요청
  const retryPermissionCheck = async () => {
    if (!electron?.ipcRenderer) return;
    
    setRetrying(true);
    
    try {
      const result = await electron.ipcRenderer.invoke('retry-permission-check');
  
      if (result.success) {
        setState(prev => ({
          ...prev,
          screenRecording: result.permissionStatus?.granted || false,
          requiredApps: result.requiredApps || [],
          errorDetails: result.permissionStatus?.reason || result.error
        }));
        
        setVisible(!result.permissionStatus?.granted);
      } else {
        console.error('권한 재확인 실패:', result.error);
        setState(prev => ({
          ...prev,
          errorDetails: result.error
        }));
      }
    } catch (error) {
      console.error('권한 재확인 중 오류:', error);
    } finally {
      setRetrying(false);
    }
  };

  // 시스템 설정 열기
  const openSystemPreferences = async () => {
    // 외부에서 제공된 onOpenSettings가 있으면 그것을 사용
    if (onOpenSettings) {
    onOpenSettings();
      return;
    }
    
    // 기본 동작: electron API를 통해 시스템 설정 열기
    if (!electron?.ipcRenderer) return;
    
    try {
      await electron.ipcRenderer.invoke('open-system-preferences', 'SCREEN_RECORDING');
    } catch (error) {
      console.error('시스템 설정 열기 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 권한 정보 요청
  useEffect(() => {
    fetchPermissionDetails();
    
    // 권한 상태 업데이트 이벤트 리스너
    const handlePermissionUpdate = (_: any, data: any) => {
      if (data.code === 'SCREEN_RECORDING') {
        setState(prev => ({
          ...prev,
          screenRecording: data.granted
        }));
        setVisible(!data.granted);
      }
    };
    
    // 권한 오류 이벤트 리스너
    const handlePermissionError = (_: any, data: any) => {
      if (data.code === 'SCREEN_RECORDING') {
        setState(prev => ({
          ...prev,
          screenRecording: false,
          errorDetails: data.detail,
          requiredApps: data.requiredApps || []
        }));
        setVisible(true);
      }
    };
    
    if (electron?.ipcRenderer) {
      electron.ipcRenderer.on('permission-status-update', handlePermissionUpdate);
      electron.ipcRenderer.on('permission-error', handlePermissionError);
    }
    
    return () => {
      if (electron?.ipcRenderer) {
        electron.ipcRenderer.removeListener('permission-status-update', handlePermissionUpdate);
        electron.ipcRenderer.removeListener('permission-error', handlePermissionError);
      }
    };
  }, [electron]);

  if (!visible) return null;
  
  return (
    <div className={styles.permissionBanner}>
      <div className={styles.header}>
        <h2>화면 기록 권한이 필요합니다</h2>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        )}
        </div>
      
      <div className={styles.content}>
        <p>
          Loop 애플리케이션이 정상적으로 작동하기 위해 화면 기록 권한이 필요합니다.
          이 권한은 현재 활성화된 창을 감지하고 사용자의 키보드 입력을 정확하게 연결하는 데 사용됩니다.
        </p>
        
        <div className={styles.permissionSteps}>
          <h3>문제 해결 단계:</h3>
          <ol>
            <li>
              <strong>시스템 설정 열기</strong> - "시스템 설정 &gt; 개인 정보 보호 및 보안 &gt; 화면 기록" 메뉴로 이동하십시오.
              <button 
                className={styles.actionButton}
                onClick={openSystemPreferences}
              >
                시스템 설정 열기
              </button>
            </li>
            <li>
              <strong>권한 허용</strong> - 아래 앱들에 화면 기록 권한을 허용해주세요:
              <ul className={styles.appList}>
                {state.requiredApps?.map((app, index) => (
                  <li key={index} className={app.granted ? styles.grantedApp : styles.pendingApp}>
                    {app.name} {app.granted ? '✓' : '⨯'}
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <strong>앱 재시작</strong> - 권한을 변경한 후에는 앱을 완전히 종료하고 다시 시작해야 합니다.
              {state.executionContext?.termProgram && (
                <div className={styles.terminalInfo}>
                  <small>현재 {state.executionContext.termProgram} 터미널에서 실행 중입니다</small>
                </div>
              )}
            </li>
          </ol>
        </div>
        
        <div className={styles.fallbackNotice}>
          <p>
            <strong>참고:</strong> 권한을 허용할 때까지 Loop는 제한된 기능으로 계속 작동합니다.
            현재 정확한 브라우저 감지가 불가능하여 일부 분석이 부정확할 수 있습니다.
          </p>
          <button 
            className={styles.retryButton} 
            onClick={retryPermissionCheck}
            disabled={retrying}
          >
            {retrying ? '재확인 중...' : '권한 다시 확인'}
          </button>
        </div>
        
        <div className={styles.detailsContainer}>
          <button 
            className={styles.detailsButton}
            onClick={() => setState(prev => ({ ...prev, detailsVisible: !prev.detailsVisible }))}
          >
            {state.detailsVisible ? '상세 정보 숨기기' : '상세 정보 표시'}
          </button>
          
          {state.detailsVisible && (
            <div className={styles.technicalDetails}>
              <h4>기술 세부정보</h4>
              <pre>{state.errorDetails}</pre>
              
              {state.systemInfo && (
                <>
                  <h5>시스템 정보</h5>
                  <ul>
                    <li>플랫폼: {state.systemInfo.platform}</li>
                    <li>macOS 버전: {state.systemInfo.macOSVersion}</li>
                    <li>아키텍처: {state.systemInfo.arch}</li>
                  </ul>
                </>
              )}
              
              {state.executionContext && (
                <>
                  <h5>실행 컨텍스트</h5>
                  <ul>
                    <li>터미널: {state.executionContext.termProgram}</li>
                    <li>쉘: {state.executionContext.shell}</li>
                    <li>사용자: {state.executionContext.user}</li>
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionBanner; 