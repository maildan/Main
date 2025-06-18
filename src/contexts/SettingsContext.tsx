import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (!isLoading) {
      saveSettings(settings);
    }
  }, [settings, isLoading]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = localStorage.getItem('app-settings');
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);        // 기본 설정과 병합하여 누락된 설정 보완
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          general: { ...DEFAULT_SETTINGS.general, ...parsed.general }
        };
        setSettings(mergedSettings);
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: AppSettings) => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settingsToSave));
      console.log('설정 저장 완료:', settingsToSave);
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  };
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      // 중첩된 객체 병합
      general: { ...prev.general, ...newSettings.general }
    }));
  };  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app-settings');
    console.log('설정이 기본값으로 초기화되었습니다');
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    isLoading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// 설정 훅
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings는 SettingsProvider 내부에서 사용되어야 합니다');
  }
  return context;
};
