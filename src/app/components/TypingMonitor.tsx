'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './TypingMonitor.module.css';

// ErrorBoundary를 사용할 수 없는 경우를 위한 기본 래퍼 컴포넌트
const SimpleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

interface KeyPressData {
  key: string;
  eventTime: number;
  isMetaKey?: boolean;
  isCompositionChar?: boolean;
}

interface TypingMonitorProps {
  onKeyPress?: (data: KeyPressData) => void;
  disabled?: boolean;
  debugMode?: boolean;
  stats?: any;
  isTracking?: boolean;
  onStartTracking?: () => void;
  onStopTracking?: () => void;
  onSaveStats?: (content: string) => void;
}

interface PermissionStatusType {
  screenRecording: boolean | null;
  accessibility: boolean | null;
  error: string | null;
}

const _COMPOSITION_TIMEOUT = 1000; // 조합 타임아웃: 1초

/**
 * 키보드 입력을 모니터링하는 컴포넌트
 * 한글 등 조합형 문자 입력도 지원
 */
const TypingMonitor: React.FC<TypingMonitorProps> = ({
  onKeyPress,
  disabled = false,
  debugMode = false,
  stats, 
  isTracking, 
  onStartTracking, 
  onStopTracking,
  onSaveStats,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const compositionRef = useRef<string>('');
  const isComposingRef = useRef<boolean>(false);
  const lastKeyTimeRef = useRef<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatusType>({
    screenRecording: null,
    accessibility: null,
    error: null
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const errorCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 사용자가 화면에 집중하고 있는지 여부를 추적
  const isUserActiveRef = useRef<boolean>(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 비활동 타이머 재설정
   */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      isUserActiveRef.current = false;
    }, 60000); // 1분간 활동이 없으면 비활성 상태로 간주
  }, []);

  /**
   * 키 이벤트를 처리하고 상위 컴포넌트로 전달하는 함수
   */
  const handleKeyEvent = useCallback((key: string, isComposition: boolean = false): void => {
    if (disabled || !onKeyPress) return;

    const now = Date.now();
    lastKeyTimeRef.current = now;

    try {
      const keyData: KeyPressData = {
        key,
        eventTime: now,
        isMetaKey: key.startsWith('Meta') || key.startsWith('Control'),
        isCompositionChar: isComposition,
      };

      onKeyPress(keyData);

      if (debugMode) {
        console.log('[TypingMonitor] 키 입력:', keyData);
      }

      // 오류 카운터 리셋
      if (errorCountRef.current > 0) {
        errorCountRef.current = 0;
        setLastError(null);
      }
      } catch (error) {
      errorCountRef.current++;
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      setLastError(`키 이벤트 처리 중 오류: ${errorMessage}`);
      
      if (errorCountRef.current >= 3) {
        console.error('[TypingMonitor] 반복적인 오류 발생:', errorMessage);
      }
      
      console.error('[TypingMonitor] 키 이벤트 처리 중 오류:', error);
    }
  }, [disabled, onKeyPress, debugMode]);

  /**
   * 조합 완료 이벤트 핸들러
   */
  const handleCompositionEnd = useCallback((e: CompositionEvent): void => {
    if (debugMode) {
      console.log('[TypingMonitor] 조합 완료:', e.data);
    }
    
    isComposingRef.current = false;
    
    if (e.data) {
      // 완성된 글자가 있을 경우
      for (let i = 0; i < e.data.length; i++) {
        handleKeyEvent(e.data[i], true);
      }
    }
    
    compositionRef.current = '';
  }, [handleKeyEvent, debugMode]);

  /**
   * 조합 시작 이벤트 핸들러
   */
  const handleCompositionStart = useCallback((): void => {
    if (debugMode) {
      console.log('[TypingMonitor] 조합 시작');
    }
    isComposingRef.current = true;
    compositionRef.current = '';
  }, [debugMode]);

  /**
   * 조합 업데이트 이벤트 핸들러
   */
  const handleCompositionUpdate = useCallback((e: CompositionEvent): void => {
    if (debugMode) {
      console.log('[TypingMonitor] 조합 업데이트:', e.data);
    }
    
    isComposingRef.current = true;
    compositionRef.current = e.data || '';
    
    // 조합 중인 문자 처리를 위한 IPC 이벤트 발송
    try {
      if (window.electronAPI && typeof window.electronAPI.processJamo === 'function') {
        window.electronAPI.processJamo({ char: e.data });
      }
    } catch (error) {
      console.error('[TypingMonitor] 자모 처리 중 오류:', error);
    }
  }, [debugMode]);

  /**
   * 키다운 이벤트 핸들러
   */
  const handleKeyDown = useCallback((e: KeyboardEvent): void => {
    // 조합 중이면 키 이벤트를 처리하지 않음
    if (isComposingRef.current) return;

    // 사용자 활동 표시
    isUserActiveRef.current = true;
    resetInactivityTimer();

    // 일반 키는 그대로 처리
    const key = e.key;
    
    // 일부 특수 키는 무시 (Tab, Shift만 단독으로 누른 경우 등)
    if (['Tab', 'Shift', 'Alt', 'Control', 'Meta', 'CapsLock'].includes(key)) {
      return;
    }
    
    // 단축키 (조합키) 처리
    if (e.ctrlKey || e.metaKey || e.altKey) {
      let modifierPrefix = '';
      if (e.ctrlKey) modifierPrefix += 'Control+';
      if (e.metaKey) modifierPrefix += 'Meta+';
      if (e.altKey) modifierPrefix += 'Alt+';
      
      handleKeyEvent(`${modifierPrefix}${key}`);
      return;
    }

    // 일반 키 처리
    handleKeyEvent(key);
  }, [handleKeyEvent, resetInactivityTimer]);

  /**
   * 키보드 이벤트 리스너 설정
   */
  const setupKeyboardListeners = useCallback(() => {
    if (disabled) return;
    
    // 이미 모니터링 중인 경우 재설정 방지
    if (isMonitoring) return;

    try {
      // 이벤트 리스너 등록
      document.addEventListener('keydown', handleKeyDown);
      
      if (inputRef.current) {
        inputRef.current.addEventListener('compositionstart', handleCompositionStart as EventListener);
        inputRef.current.addEventListener('compositionupdate', handleCompositionUpdate as EventListener);
        inputRef.current.addEventListener('compositionend', handleCompositionEnd as EventListener);
      }
      
      setIsMonitoring(true);
      
      if (debugMode) {
        console.log('[TypingMonitor] 키보드 모니터링 시작');
      }
      
      // 권한 확인 - 함수 직접 호출 대신에 setTimeout으로 지연 호출
      setTimeout(() => {
        if (typeof checkPermissions === 'function') {
          checkPermissions();
        }
      }, 0);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[TypingMonitor] 키보드 리스너 설정 중 오류:', error);
      
      // 에러 로깅
      console.error('[TypingMonitor] 키보드 모니터링 초기화 오류:', errorMessage);
    }
  }, [
    disabled, 
    isMonitoring, 
    handleKeyDown, 
    handleCompositionStart, 
    handleCompositionUpdate, 
    handleCompositionEnd, 
    debugMode
  ]);

  /**
   * 권한 확인 함수
   */
  const checkPermissions = useCallback(async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.checkPermissions) {
        return;
      }
      
      const permissions = await window.electronAPI.checkPermissions();
      
      // 타입 안전성을 위해 필요한 속성만 추출
      const safePermissions: PermissionStatusType = {
        screenRecording: typeof permissions.screenRecording === 'boolean' ? permissions.screenRecording : null,
        accessibility: typeof permissions.accessibility === 'boolean' ? permissions.accessibility : null,
        // @ts-ignore - PermissionStatusType에서 error 속성을 인식하지 못하는 문제
        error: permissions.error || null
      };
      
      setPermissionStatus(safePermissions);
      
      if (safePermissions.error || 
         (safePermissions.screenRecording === false && typeof process !== 'undefined' && process.platform === 'darwin')) {
        console.warn('[TypingMonitor] 권한 부족:', safePermissions);
      }
    } catch (error) {
      console.error('[TypingMonitor] 권한 확인 중 오류:', error);
      setPermissionStatus({
        screenRecording: null,
        accessibility: null,
        // @ts-ignore - PermissionStatusType에서 error 속성을 인식하지 못하는 문제
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }, []);

  /**
   * 권한 설정 창 열기
   */
  const openPermissionsSettings = useCallback(() => {
    try {
      if (window.electronAPI && window.electronAPI.openPermissionsSettings) {
        window.electronAPI.openPermissionsSettings();
      }
    } catch (error) {
      console.error('[TypingMonitor] 권한 설정 열기 중 오류:', error);
    }
  }, []);

  /**
   * 키보드 모니터링 중지
   */
  const stopMonitoring = useCallback(() => {
    try {
      document.removeEventListener('keydown', handleKeyDown);
      
      if (inputRef.current) {
        inputRef.current.removeEventListener('compositionstart', handleCompositionStart as EventListener);
        inputRef.current.removeEventListener('compositionupdate', handleCompositionUpdate as EventListener);
        inputRef.current.removeEventListener('compositionend', handleCompositionEnd as EventListener);
      }
      
      setIsMonitoring(false);
      
      if (debugMode) {
        console.log('[TypingMonitor] 키보드 모니터링 중지');
      }
    } catch (error) {
      console.error('[TypingMonitor] 키보드 모니터링 중지 중 오류:', error);
    }
  }, [handleKeyDown, handleCompositionStart, handleCompositionUpdate, handleCompositionEnd, debugMode]);

  /**
   * 권한 오류 이벤트 처리
   */
  useEffect(() => {
    const handlePermissionError = (data: any) => {
      setPermissionStatus(prev => ({
        ...prev,
        // @ts-ignore - PermissionStatusType에서 error 속성을 인식하지 못하는 문제
        [data.type.toLowerCase()]: false,
        error: data.message
      }));
      
      console.warn('[TypingMonitor] 권한 오류:', data.message);
    };
    
    // Electron API를 통한 권한 오류 리스너 등록
    let unsubscribe: (() => void) | undefined;
    
    if (window.electronAPI && window.electronAPI.onPermissionError) {
      unsubscribe = window.electronAPI.onPermissionError(handlePermissionError);
    }
    
    // 권한 상태 업데이트 리스너 등록
    let unsubscribeStatus: (() => void) | undefined;
    
    if (window.electronAPI && window.electronAPI.onPermissionStatus) {
      unsubscribeStatus = window.electronAPI.onPermissionStatus((status: any) => {
        const safeStatus: PermissionStatusType = {
          screenRecording: status.screenRecording ?? null,
          accessibility: status.accessibility ?? null,
          error: status.error || null
        };
        setPermissionStatus(safeStatus);
      });
    }
    
    // 클린업
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      
      if (unsubscribeStatus && typeof unsubscribeStatus === 'function') {
        unsubscribeStatus();
      }
    };
  }, [openPermissionsSettings]);

  /**
   * 자동 재연결 및 에러 복구
   */
  useEffect(() => {
    if (lastError && !reconnectTimerRef.current) {
      reconnectTimerRef.current = setTimeout(() => {
        console.log('[TypingMonitor] 자동 재연결 시도');
        stopMonitoring();
        setTimeout(setupKeyboardListeners, 500);
        reconnectTimerRef.current = null;
      }, 5000); // 5초 후 재연결 시도
    }
    
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [lastError, stopMonitoring, setupKeyboardListeners]);

  /**
   * 컴포넌트 초기화 및 정리
   */
  useEffect(() => {
    if (!isInitialized && !disabled) {
      setupKeyboardListeners();
      setIsInitialized(true);
    }
    
    // 포커스 유지를 위한 클릭 이벤트 리스너
    const handleDocumentClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    // 사용자 활동 감지 초기화
    resetInactivityTimer();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      stopMonitoring();
      document.removeEventListener('click', handleDocumentClick);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [disabled, isInitialized, setupKeyboardListeners, stopMonitoring, resetInactivityTimer]);

  /**
   * props 변경에 따른 모니터링 상태 업데이트
   */
  useEffect(() => {
    if (disabled && isMonitoring) {
      stopMonitoring();
    } else if (!disabled && !isMonitoring && isInitialized) {
      setupKeyboardListeners();
    }
  }, [disabled, isMonitoring, isInitialized, stopMonitoring, setupKeyboardListeners]);

  /**
   * 투명 입력 필드 포커스 유지
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [disabled]);

  const retryPermissionCheck = useCallback(() => {
    checkPermissions(); // 직접 함수 호출
  }, [checkPermissions]);

  return (
    <SimpleWrapper>
      <div className={styles.typingMonitor}>
        <input
          ref={inputRef}
          type="text"
          className={styles.hiddenInput}
          autoFocus
          value=""
          onChange={(e) => {
            // 조합 중이 아닐 때만 입력값 초기화
            if (!isComposingRef.current) {
              e.target.value = '';
            }
          }}
          aria-hidden="true"
        />
        
        {debugMode && (
          <div className={styles.debugInfo}>
            <h4>디버그 정보</h4>
            <p>모니터링: {isMonitoring ? '활성화' : '비활성화'}</p>
            <p>조합 상태: {isComposingRef.current ? '조합중' : '기본'}</p>
            <p>조합 텍스트: {compositionRef.current}</p>
            <p>화면기록 권한: {permissionStatus.screenRecording === null ? '확인안됨' : permissionStatus.screenRecording ? '허용' : '거부'}</p>
            {lastError && <p className={styles.error}>마지막 오류: {lastError}</p>}
          </div>
        )}
      </div>
    </SimpleWrapper>
  );
};

export default TypingMonitor;