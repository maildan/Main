import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 사용자 정보 타입 정의
interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
}

// 인증 상태 타입 정의
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 인증 컨텍스트 액션 타입 정의
interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 프로바이더 Props 타입
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Google OAuth 인증을 관리하는 Context Provider
 * 사용자 로그인, 로그아웃, 토큰 관리를 담당합니다.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * 컴포넌트 마운트 시 저장된 인증 정보 확인
   */
  useEffect(() => {
    checkAuthStatus();
  }, []);
  /**
   * 저장된 인증 상태 확인
   */
  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // # debug: 인증 상태 확인 시작
      console.log('Checking authentication status...');
      
      // Tauri 명령어로 백엔드에서 인증 상태 확인
      const userData = await invoke<User | null>('check_auth_status');
      
      if (userData) {
        // # debug: 사용자 인증됨
        console.log('User authenticated:', userData.email);
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: userData,
          isLoading: false,
        }));
      } else {
        // # debug: 사용자 인증되지 않음
        console.log('User not authenticated');
        
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: '인증 상태 확인 중 오류가 발생했습니다.',
      }));
    }
  };
  /**
   * Google OAuth 로그인 실행
   */
  const login = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));      
      // # debug: OAuth 로그인 시작
      console.log('Starting Google OAuth login...');
      
      // 1단계: 인증 URL 생성 및 브라우저 열기
      await invoke<string>('start_google_auth');
      
      // # debug: 인증 URL 생성되고 브라우저 열림
      console.log('Auth URL generated and browser opened');
      
      // 2단계: 사용자가 브라우저에서 인증 완료 후 코드 입력
      const code = prompt(
        `브라우저에서 Google 인증을 완료한 후, 리다이렉트 URL에서 'code=' 파라미터 값을 복사하여 입력하세요:\n\n인증 코드:`
      );
      
      if (!code) {
        throw new Error('인증 코드가 입력되지 않았습니다.');
      }
      
      // 3단계: 인증 코드로 사용자 정보 가져오기
      const userData = await invoke<User>('authenticate_google_user', { code });
      
      // # debug: 사용자 인증 완료
      console.log('User authenticated successfully:', userData.email);

      setAuthState(prev => ({
        ...prev,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthState(prev => ({
        ...prev,        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: typeof error === 'string' ? error : '로그인 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 로그아웃 실행
   */
  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // # debug: 로그아웃 시작
      console.log('Logging out user...');
      
      // Tauri 명령어로 로그아웃 처리
      await invoke('logout');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // # debug: 로그아웃 완료
      console.log('User logged out successfully');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: '로그아웃 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 토큰 갱신
   */
  const refreshToken = async () => {
    try {
      // # debug: 토큰 갱신 시작
      console.log('Refreshing auth token...');
      
      // Tauri 명령어로 토큰 갱신
      await invoke('refresh_auth_token');
      
      console.log('토큰 갱신 완료');
    } catch (error) {
      console.error('토큰 갱신 오류:', error);
      // 토큰 갱신 실패 시 로그아웃 처리
      await logout();
    }
  };

  /**
   * 에러 메시지 초기화
   */
  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * AuthContext를 사용하기 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다.');
  }
  return context;
}
