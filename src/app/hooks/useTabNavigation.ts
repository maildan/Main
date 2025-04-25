import { useState, useCallback } from 'react';
import { Tab } from '../types/tabs';

interface ElectronAPI {
  setDebugMode?: (enabled: boolean) => Promise<void>;
}

interface UseTabNavigationOptions {
  initialTab?: Tab;
  electronAPI?: ElectronAPI | null;
}

export function useTabNavigation({ 
  initialTab = 'chatlog', 
  electronAPI = null 
}: UseTabNavigationOptions = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [debugMode, setDebugMode] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as Tab);
  }, []);

  const toggleDebugMode = useCallback(async () => {
    const newState = !debugMode;
    setDebugMode(newState);
    
    if (electronAPI && electronAPI.setDebugMode) {
      try {
        await electronAPI.setDebugMode(newState);
      } catch (err) {
        console.error('디버그 모드 설정 오류:', err);
      }
    }
  }, [debugMode, electronAPI]);

  return {
    activeTab,
    debugMode,
    handleTabChange,
    toggleDebugMode
  };
}
