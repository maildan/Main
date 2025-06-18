// 간단한 JSON 기반 설정 관리
import settingsData from '../config/settings.json';

// 설정 데이터 직접 export
export const config = settingsData;

// 편의 함수들
export const getAppInfo = () => config.app;
export const getThemes = () => config.themes;
export const getLanguages = () => config.languages;
export const getDefaultSettings = () => config.defaultSettings;
export const getHelpSections = () => config.help.sections;
export const getContactInfo = () => config.contact;

// 특정 테마/언어 찾기
export const getThemeById = (id: string) => config.themes.find(t => t.value === id);
export const getLanguageById = (id: string) => config.languages.find(l => l.value === id);
