import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 사용자 정보 타입 정의
interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
}

// 사용자 프로필 타입 (저장된 계정 목록용)
interface UserProfile {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture_url?: string;
  has_valid_token: boolean;
  created_at: string;
  updated_at: string;
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
  smartLogout: () => Promise<void>;
  switchAccount: () => Promise<void>;
  getSavedAccounts: () => Promise<UserProfile[]>;
  syncAccountData: (userId: string) => Promise<void>;
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
   * Google OAuth 로그인 실행 (로컬 서버 방식)
   */
  const login = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));      
      
      // # debug: OAuth 자동 로그인 시작
      console.log('Starting Google OAuth auto login with local server...');
      
      // 자동 로그인 실행 (로컬 서버 + 웹뷰 사용)
      const userData = await invoke<User>('google_login_auto');
      
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
        error: typeof error === 'string' ? error : (error as Error).message || '로그인 중 오류가 발생했습니다.',
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
   * 스마트 로그아웃 (토큰만 제거, 데이터는 보존)
   */
  const smartLogout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      console.log('Smart logout - preserving user data...');
      
      // Tauri 명령어로 스마트 로그아웃 처리
      await invoke('smart_logout');
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      console.log('Smart logout completed - data preserved');
    } catch (error) {
      console.error('스마트 로그아웃 오류:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: '로그아웃 중 오류가 발생했습니다.',
      }));
    }
  };

  /**
   * 계정 전환
   */
  const switchAccount = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Switching account...');
      
      // 계정 전환 실행
      const userData = await invoke<User>('switch_account');
      
      setAuthState(prev => ({
        ...prev,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      }));
      
      console.log('Account switched successfully:', userData.email);
    } catch (error) {
      console.error('계정 전환 오류:', error);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: typeof error === 'string' ? error : (error as Error).message || '계정 전환 중 오류가 발생했습니다.',
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

  /**
   * 저장된 계정 목록 가져오기
   */
  const getSavedAccounts = async (): Promise<UserProfile[]> => {
    try {
      console.log('Fetching saved accounts...');
      const accounts = await invoke<UserProfile[]>('get_saved_accounts');
      console.log('Found saved accounts:', accounts.length);
      return accounts;
    } catch (error) {
      console.error('저장된 계정 조회 오류:', error);
      throw error;
    }
  };

  /**
   * 특정 계정의 데이터 동기화
   */
  const syncAccountData = async (userId: string) => {
    try {
      console.log('Syncing account data for user:', userId);
      await invoke('sync_account_data', { userId });
      console.log('Account data synced successfully');
    } catch (error) {
      console.error('계정 데이터 동기화 오류:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    smartLogout,
    switchAccount,
    getSavedAccounts,
    syncAccountData,
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
