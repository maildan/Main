import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ToastContext';
import { applyDarkModeToAllElements } from '../utils/darkModeUtils';
import type { ElectronAPI } from '../types/electron';
import type { WindowModeType } from '../global';

// SettingsState 타입 인터페이스를 export하여 다른 파일에서 import할 수 있게 함
export interface SettingsState {
  enabledCategories: {
    docs: boolean;
    office: boolean;
    coding: boolean;
    sns: boolean;
  };
  autoStartMonitoring: boolean;
  resumeAfterIdle: boolean;
  darkMode: boolean;
  windowMode: WindowModeType;
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  enableMiniView: boolean;
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  maxMemoryThreshold: number;
}

// 기본 설정 값 - GPU 및 처리 모드 추가
const defaultSettings: SettingsState = {
  enabledCategories: {
    docs: true,
    office: true,
    coding: true,
    sns: true
  },
  autoStartMonitoring: true,
  resumeAfterIdle: true,
  darkMode: false,
  windowMode: 'windowed',
  minimizeToTray: true,
  showTrayNotifications: true,
  reduceMemoryInBackground: true,
  enableMiniView: true,
  useHardwareAcceleration: false,
  processingMode: 'auto',
  maxMemoryThreshold: 100
};

export function useSettings(electronAPI: ElectronAPI | null) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [windowMode, setWindowMode] = useState<WindowModeType>('windowed');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // 설정 로드 함수
  const loadSettings = useCallback(async () => {
    try {
      if (electronAPI?.loadSettings) {
        const loadedSettings = await electronAPI.loadSettings();
        if (loadedSettings) {
          console.log('설정 로드 성공:', loadedSettings);
          setSettings(loadedSettings);
          setDarkMode(loadedSettings.darkMode || false);
          setWindowMode(loadedSettings.windowMode || 'windowed');
          // 다크 모드 적용
          applyDarkModeToAllElements(loadedSettings.darkMode || false);
          return loadedSettings;
        }
      } else {
        // localStorage에서 로드 시도
        try {
          const storedSettings = localStorage.getItem('app_settings');
          if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings) as SettingsState;
            console.log('localStorage에서 설정 로드:', parsedSettings);
            setSettings(parsedSettings);
            setDarkMode(parsedSettings.darkMode || false);
            setWindowMode(parsedSettings.windowMode || 'windowed');
            // 다크 모드 적용
            applyDarkModeToAllElements(parsedSettings.darkMode || false);
            return parsedSettings;
          }
        } catch (storageError) {
          console.error('localStorage 로드 오류:', storageError);
        }
      }
      
      // 기본 설정 반환
      return defaultSettings;
    } catch (error) {
      console.error('설정 로드 오류:', error);
      showToast?.('설정을 불러오지 못했습니다', 'error');
      return defaultSettings;
    }
  }, [electronAPI, showToast]);

  // 설정 저장 함수 개선
  const handleSaveSettings = useCallback(async (newSettings: SettingsState) => {
    try {
      // 변경사항이 있을 때만 저장 진행
      const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(settings);
      if (!hasChanges) {
        console.log('변경된 설정이 없습니다.');
        showToast?.('변경된 설정이 없습니다', 'info');
        return true;
      }

      // Electron API를 통한 저장
      if (electronAPI?.saveSettings) {
        console.log('Electron API를 통해 설정 저장:', newSettings);
        const result = await electronAPI.saveSettings(newSettings);
        
        if (result) {
          console.log('설정 저장 성공');
          setSettings(newSettings);
          // 다크 모드 설정 업데이트
          if (newSettings.darkMode !== darkMode) {
            setDarkMode(newSettings.darkMode);
            applyDarkModeToAllElements(newSettings.darkMode);
            if (electronAPI?.setDarkMode) {
              await electronAPI.setDarkMode(newSettings.darkMode);
            }
            // 이벤트 발생 (다른 컴포넌트에 알림)
            const event = new CustomEvent('darkmode-changed', { detail: { darkMode: newSettings.darkMode } });
            window.dispatchEvent(event);
          }
          
          // 윈도우 모드 설정 업데이트
          if (newSettings.windowMode !== windowMode) {
            setWindowMode(newSettings.windowMode);
            if (electronAPI?.setWindowMode) {
              await electronAPI.setWindowMode(newSettings.windowMode);
            }
          }
          showToast?.('설정이 저장되었습니다', 'success');
          return true;
        } else {
          console.error('설정 저장 실패');
          showToast?.('설정 저장에 실패했습니다', 'error');
          return false;
        }
      }
      
      // localStorage를 통한 저장 (Electron API가 없을 때)
      try {
        localStorage.setItem('app_settings', JSON.stringify(newSettings));
        console.log('localStorage에 설정 저장 성공:', newSettings);
        setSettings(newSettings);
        
        // 다크 모드 설정 업데이트
        if (newSettings.darkMode !== darkMode) {
          setDarkMode(newSettings.darkMode);
          applyDarkModeToAllElements(newSettings.darkMode);
          // 이벤트 발생 (다른 컴포넌트에 알림)
          const event = new CustomEvent('darkmode-changed', { detail: { darkMode: newSettings.darkMode } });
          window.dispatchEvent(event);
        }
        
        // 윈도우 모드 설정 업데이트
        if (newSettings.windowMode !== windowMode) {
          setWindowMode(newSettings.windowMode);
        }
        
        showToast?.('설정이 저장되었습니다', 'success');
        return true;
      } catch (storageError) {
        console.error('localStorage 저장 오류:', storageError);
        showToast?.('설정 저장에 실패했습니다', 'error');
        return false;
      }
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error);
      showToast?.('설정을 저장할 수 없습니다', 'error');
      return false;
    }
  }, [electronAPI, settings, darkMode, windowMode, showToast]);

  // 다크 모드 설정 함수
  const handleDarkModeChange = useCallback(async (enabled: boolean) => {
    try {
      setDarkMode(enabled);
      applyDarkModeToAllElements(enabled);
      
      // Electron API를 통한 다크 모드 설정
      if (electronAPI?.setDarkMode) {
        await electronAPI.setDarkMode(enabled);
      }
      
      // 이벤트 발생 (다른 컴포넌트에 알림)
      const event = new CustomEvent('darkmode-changed', { detail: { darkMode: enabled } });
      window.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('다크 모드 설정 오류:', error);
      return false;
    }
  }, [electronAPI]);

  // 윈도우 모드 설정 함수
  const handleWindowModeChange = useCallback(async (mode: WindowModeType) => {
    try {
      setWindowMode(mode);
      
      // Electron API를 통한 윈도우 모드 설정
      if (electronAPI?.setWindowMode) {
        await electronAPI.setWindowMode(mode);
      }
      
      return true;
    } catch (error) {
      console.error('윈도우 모드 설정 오류:', error);
      return false;
    }
  }, [electronAPI]);

  // 초기화
  useEffect(() => {
    if (!isInitialized) {
      loadSettings().then(() => {
        setIsInitialized(true);
      });
    }
  }, [loadSettings, isInitialized]);

  return {
    settings,
    darkMode,
    windowMode,
    handleSaveSettings,
    handleDarkModeChange,
    handleWindowModeChange,
    loadSettings
  };
}
