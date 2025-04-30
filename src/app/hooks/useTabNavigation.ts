import { useState, useCallback, useEffect } from 'react';
import { ElectronAPI } from '../types/electron';

// API 인터페이스 정의 수정 - ElectronAPI와 호환되도록 변경
interface TabNavigationAPI extends Partial<ElectronAPI> {
  // ElectronAPI의 모든 속성을 선택적으로 상속
}

interface UseTabNavigationProps {
  initialTab: string;
  electronAPI?: TabNavigationAPI | null; // 옵셔널로 변경
}

export function useTabNavigation({ initialTab, electronAPI }: UseTabNavigationProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [debugMode, setDebugMode] = useState(false);

  // 탭 변경 핸들러
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // 디버그 모드 토글
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);

  // 컴포넌트 마운트 시 실행할 코드
  useEffect(() => {
    // 여기에 필요한 초기화 로직 추가
  }, []);

  return {
    activeTab,
    debugMode,
    handleTabChange,
    toggleDebugMode
  };
}
