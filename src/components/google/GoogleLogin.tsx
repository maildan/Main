import { useState } from 'react';
import { useAuth } from '../../contexts/google/AuthContext';

/**
 * Google OAuth 로그인 컴포넌트
 * 로그인 버튼과 사용자 상태를 표시합니다.
 */
export default function GoogleLogin() {
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuth();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  /**
   * 로그인 버튼 클릭 핸들러
   */
  const handleLogin = async () => {
    try {
      setIsButtonLoading(true);
      clearError();
      await login();
    } catch (error) {
      console.error('로그인 실패:', error);
    } finally {
      setIsButtonLoading(false);
    }
  };

  /**
   * 로그아웃 버튼 클릭 핸들러
   */
  const handleLogout = async () => {
    try {
      setIsButtonLoading(true);
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      setIsButtonLoading(false);
    }
  };

  // 로딩 중인 경우
  if (isLoading) {
    return (
      <div className="google-login loading">
        <div className="loading-spinner"></div>
        <span>인증 상태 확인 중...</span>
      </div>
    );
  }

  // 인증된 사용자인 경우
  if (isAuthenticated && user) {
    return (
      <div className="google-login authenticated">
        <div className="user-info">
          {user.profilePicture && (
            <img 
              src={user.profilePicture} 
              alt="프로필 사진" 
              className="profile-picture"
            />
          )}
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          disabled={isButtonLoading}
          className="logout-button"
        >
          {isButtonLoading ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    );
  }

  // 인증되지 않은 경우
  return (
    <div className="google-login unauthenticated">
      <div className="login-section">
        <h3>Google Docs 연동</h3>
        <p>Google 계정으로 로그인하여 문서를 관리하세요.</p>
        
        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button onClick={clearError} className="close-error">×</button>
          </div>
        )}
        
        <button 
          onClick={handleLogin}
          disabled={isButtonLoading}
          className="google-login-button"
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isButtonLoading ? 'Google 로그인 중...' : 'Google로 로그인'}
        </button>
        
        <div className="login-info">
          <small>
            로그인하면 Google Docs 문서에 접근하고 편집할 수 있습니다.
            <br />
            개인정보는 안전하게 보호됩니다.
          </small>
        </div>
      </div>
    </div>
  );
}
