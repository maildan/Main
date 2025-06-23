import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
      
      // TODO: Tauri 명령어로 백엔드에서 인증 상태 확인
      // const isAuth = await invoke('check_auth_status');
      // const userData = await invoke('get_user_data');
      
      // 임시로 false 설정 (나중에 실제 구현 시 변경)
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      }));
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
      
      // TODO: Tauri 명령어로 Google OAuth 로그인 시작
      // const authResult = await invoke('start_google_oauth');
      
      // 임시 구현 (나중에 실제 OAuth 구현 시 변경)
      console.log('Google OAuth 로그인 시작...');
      
      // 임시 사용자 데이터 (테스트용)
      const mockUser: User = {
        id: 'temp_user_123',
        email: 'test@example.com',
        name: 'Test User',
        profilePicture: undefined,
      };

      setAuthState(prev => ({
        ...prev,
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: '로그인 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 로그아웃 실행
   */
  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // TODO: Tauri 명령어로 로그아웃 처리
      // await invoke('logout');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
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
      // TODO: Tauri 명령어로 토큰 갱신
      // await invoke('refresh_auth_token');
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
