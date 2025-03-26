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
  resumeAfterIdle: true, // 필수 속성으로 추가
  darkMode: false,
  windowMode: 'windowed',
  minimizeToTray: true,
  showTrayNotifications: true,
  reduceMemoryInBackground: true,
  enableMiniView: true,
  useHardwareAcceleration: false, // GPU 하드웨어 가속 기본값 추가
  processingMode: 'auto', // 처리 모드 기본값 추가
  maxMemoryThreshold: 100 // 메모리 임계치 기본값
};

export function useSettings(electronAPI: ElectronAPI | null) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [darkMode, setDarkMode] = useState(false);
  const [windowMode, setWindowMode] = useState<WindowModeType>('windowed');
  const { showToast } = useToast();

  // 로컬 스토리지에 설정 저장
  const saveSettingsToLocalStorage = useCallback((settingsToSave: SettingsState) => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
    }
  }, []);

  // 로컬 스토리지에서 설정 로드
  const loadSettingsFromLocalStorage = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as Partial<SettingsState>;
        
        // 누락된 필드가 있을 경우 기본값 추가
        const completeSettings: SettingsState = {
          enabledCategories: {
            docs: parsedSettings.enabledCategories?.docs ?? true,
            office: parsedSettings.enabledCategories?.office ?? true,
            coding: parsedSettings.enabledCategories?.coding ?? true,
            sns: parsedSettings.enabledCategories?.sns ?? true
          },
          autoStartMonitoring: parsedSettings.autoStartMonitoring ?? true,
          resumeAfterIdle: parsedSettings.resumeAfterIdle ?? true, // 필수 속성으로 추가
          darkMode: parsedSettings.darkMode ?? false,
          windowMode: parsedSettings.windowMode ?? 'windowed',
          minimizeToTray: parsedSettings.minimizeToTray ?? true,
          showTrayNotifications: parsedSettings.showTrayNotifications ?? true,
          reduceMemoryInBackground: parsedSettings.reduceMemoryInBackground ?? true,
          enableMiniView: parsedSettings.enableMiniView ?? true,
          useHardwareAcceleration: parsedSettings.useHardwareAcceleration ?? false, // GPU 가속 설정 추가
          processingMode: parsedSettings.processingMode ?? 'auto', // 처리 모드 설정 추가
          maxMemoryThreshold: parsedSettings.maxMemoryThreshold ?? 100 // 메모리 임계치 추가
        };
        
        setSettings(completeSettings);
        setDarkMode(completeSettings.darkMode);
        return completeSettings;
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
    }
    return null;
  }, []);

  // 설정 저장 핸들러
  const handleSaveSettings = useCallback(async (newSettings: SettingsState) => {
    setSettings(newSettings);
    saveSettingsToLocalStorage(newSettings);
    setDarkMode(newSettings.darkMode);
    
    // Electron API로 설정 저장
    try {
      if (!electronAPI) return;
      
      // 옵셔널 체이닝 사용하여 saveSettings 메서드 존재 여부 확인
      const savePromise = electronAPI?.saveSettings?.(newSettings);
      if (savePromise instanceof Promise) {
        const result = await savePromise;
        
        // result가 객체인 경우와 boolean인 경우 모두 처리
        if (typeof result === 'object' && result !== null && 'success' in result) {
          // 객체이고 success 속성이 있는 경우
          const resultWithSuccess = result as { success: boolean };
          if (resultWithSuccess.success) {
            showToast('설정이 저장되었습니다.', 'success');
          } else {
            showToast('설정 저장에 실패했습니다.', 'error');
          }
        } else {
          // 단순 boolean인 경우 (또는 다른 타입)
          if (result === true || (typeof result === 'boolean' && result)) {
            showToast('설정이 저장되었습니다.', 'success');
          } else {
            showToast('설정 저장에 실패했습니다.', 'error');
          }
        }
      }
      
      // 다크 모드 적용
      if (electronAPI?.setDarkMode) {
        await electronAPI.setDarkMode(newSettings.darkMode);
      }
      
      // 창 모드 적용
      if (electronAPI?.setWindowMode) {
        await electronAPI.setWindowMode(newSettings.windowMode);
      }
    } catch (error) {
      console.error('Electron 설정 적용 오류:', error);
      showToast('설정 적용 중 오류가 발생했습니다.', 'error');
    }
  }, [saveSettingsToLocalStorage, electronAPI, showToast]);

  // 다크 모드 변경 핸들러
  const handleDarkModeChange = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    
    // 전역 요소에 다크 모드 적용
    applyDarkModeToAllElements(enabled);
    
    if (electronAPI) {
      electronAPI.setDarkMode(enabled);
    }
  }, [electronAPI]);

  // 창 모드 변경 핸들러
  const handleWindowModeChange = useCallback(async (mode: WindowModeType) => {
    try {
      setWindowMode(mode); // UI 즉시 업데이트
      
      if (electronAPI && typeof electronAPI.setWindowMode === 'function') {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('창 모드 변경 시간 초과')), 3000);
        });
        
        const result = await Promise.race([
          electronAPI.setWindowMode(mode),
          timeoutPromise
        ]) as {success: boolean, error?: string};
        
        if (!result.success) {
          console.error(`창 모드 변경 실패: ${result.error || '알 수 없는 오류'}`);
          showToast('창 모드 변경에 실패했습니다.', 'error');
        }
      } else {
        console.warn('setWindowMode API를 사용할 수 없습니다. UI만 업데이트됩니다.');
      }
    } catch (error) {
      console.error('창 모드 변경 중 오류:', error);
      showToast('창 모드 변경 중 오류가 발생했습니다.', 'error');
    }
  }, [electronAPI, showToast]);

  // 초기 설정 로드 및 다크모드 적용
  useEffect(() => {
    loadSettingsFromLocalStorage();
  }, [loadSettingsFromLocalStorage]);

  // 다크 모드 변경 시 전역 클래스 적용
  useEffect(() => {
    applyDarkModeToAllElements(darkMode);
    
    // 다크 모드 변경 이벤트 발생
    const darkModeEvent = new CustomEvent('darkmode-changed', { detail: { darkMode } });
    window.dispatchEvent(darkModeEvent);
  }, [darkMode]);

  // 앱이 종료되거나 페이지가 새로고침될 때 설정 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSettingsToLocalStorage(settings);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [settings, saveSettingsToLocalStorage]);

  return {
    settings,
    darkMode,
    windowMode,
    handleSaveSettings,
    handleDarkModeChange,
    handleWindowModeChange,
    loadSettingsFromLocalStorage
  };
}
