'use client';

import React, { ErrorInfo } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 에러 바운더리 컴포넌트
 * 클라이언트 컴포넌트 내부에서 발생하는 오류를 잡아 처리합니다.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태 업데이트
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 오류 정보 로깅
    console.error('컴포넌트 오류 발생:', error, errorInfo);
    
    // errorInfo를 상태에 저장
    this.setState({
      errorInfo
    });
    
    // 에러 정보 전달 - 메서드가 매개변수를 받지 않도록 수정
    if (window.electronAPI && typeof window.electronAPI.getDebugInfo === 'function') {
      // 로그만 출력
      console.error('에러 데이터:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        time: new Date().toISOString()
      });
      
      // 매개변수 없이 호출
      window.electronAPI.getDebugInfo();
    }
  }

  handleRetry = (): void => {
    // 상태 초기화
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // 커스텀 에러 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <h2 className={styles.errorTitle}>오류가 발생했습니다</h2>
            
            <div className={styles.errorDetails}>
              <p className={styles.errorMessage}>
                {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className={styles.errorStack}>
                  <summary>기술 정보 (개발자용)</summary>
                  <pre>{this.state.error?.stack}</pre>
                  {this.state.errorInfo && (
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  )}
                </details>
              )}
            </div>
            
            <div className={styles.errorActions}>
              <button 
                onClick={this.handleRetry}
                className={styles.retryButton}
              >
                다시 시도하기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 