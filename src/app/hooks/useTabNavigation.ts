import { useState, useCallback, useEffect } from 'react';

export interface TabNavigationOptions {
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  electronAPI?: ElectronAPI | null;
}

export function useTabNavigation({ 
  initialTab = 'monitor', 
  onTabChange, 
  electronAPI = null 
}: TabNavigationOptions = {}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [debugMode, setDebugMode] = useState(false);
  
  // 탭 변경 핸들러
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);
  
  // 디버그 모드 토글
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);
  
  // 트레이 메뉴에서 탭 전환 이벤트 처리
  useEffect(() => {
    if (!electronAPI) return;
    
    // 트레이 메뉴에서 특정 탭으로 이동하는 이벤트 처리
    const unsubscribeSwitchTab = electronAPI.onSwitchTab((tab: string) => {
      console.log(`트레이 메뉴에서 ${tab} 탭으로 이동 요청`);
      handleTabChange(tab);
    });
    
    // 트레이 메뉴에서 통계 저장 다이얼로그 열기 요청 처리
    const unsubscribeOpenSaveDialog = electronAPI.onOpenSaveStatsDialog(() => {
      console.log('트레이 메뉴에서 통계 저장 다이얼로그 열기 요청');
      handleTabChange('monitor'); // 모니터링 탭으로 전환
    });
    
    // 이벤트 리스너 정리
    return () => {
      unsubscribeSwitchTab();
      unsubscribeOpenSaveDialog();
    };
  }, [electronAPI, handleTabChange]);

  return {
    activeTab,
    debugMode,
    handleTabChange,
    toggleDebugMode
  };
}
