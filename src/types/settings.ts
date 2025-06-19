// 간단한 설정 타입 정의
export interface AppSettings {
  theme: 'dark' | 'light' | 'auto';
  general: {
    autoSave: boolean;
    animationSpeed: string;
    fontSize: string;
  };
}

// JSON에서 직접 가져온 기본값
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  general: {
    autoSave: true,
    animationSpeed: "normal",
    fontSize: "medium"
  }
};
