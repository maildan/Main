import { SettingsManager } from '../utils/settingsManager';

// 설정 관련 타입 정의
export interface AppSettings {
  theme: ThemeType;
  language: LanguageType;
  general: GeneralSettings;
  advanced: AdvancedSettings;
}

export type ThemeType = 'dark' | 'light' | 'auto';
export type LanguageType = 'ko' | 'en' | 'ja' | 'zh';

export interface GeneralSettings {
  autoSave: boolean;
  showNotifications: boolean;
  enableSounds: boolean;
  defaultSearchEngine: string;
  animationSpeed: string;
  fontSize: string;
}

export interface AdvancedSettings {
  enableDebugMode: boolean;
  cacheSize: number;
  maxLogEntries: number;
  enableAnalytics: boolean;
  autoUpdate: boolean;
  experimentalFeatures: boolean;
}

export interface SettingsMenuItem {
  id: string;
  label?: string;
  icon?: string;
  type: 'toggle' | 'modal' | 'divider';
  action?: () => void;
  disabled?: boolean;
}

// JSON 파일에서 동적으로 가져오기
export const DEFAULT_SETTINGS: AppSettings = SettingsManager.getDefaultSettings() as AppSettings;

// 테마 옵션
export const THEME_OPTIONS = SettingsManager.getThemes().map(theme => ({
  value: theme.value as ThemeType,
  label: theme.label,
  icon: theme.icon
}));

// 언어 옵션
export const LANGUAGE_OPTIONS = SettingsManager.getLanguages().map(lang => ({
  value: lang.value as LanguageType,
  label: lang.label,
  icon: lang.icon
}));
