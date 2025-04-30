/* eslint-disable */
/**
 * Electron API 타입 정의
 * 전역 window 인터페이스 확장 타입
 */

// ElectronAPI 인터페이스 - 메인 프로세스에서 제공하는 API
export interface ElectronAPI {
  // 윈도우 컨트롤
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  
  // 타이핑 통계
  startTracking: () => void;
  stopTracking: () => void;
  getTypingStats: () => Promise<{ totalKeystrokes: number; sessionKeystrokes: number }>;
  resetSessionStats: () => void;
  
  // 설정 관리
  loadSettings: () => Promise<Record<string, any>>;
  saveSettings: (settings: Record<string, any>) => Promise<void>;
  
  // 파일 시스템 작업
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath: string }>;
  
  // 앱 관련 콜백
  onWindowBlur: (callback: () => void) => void;
  onWindowFocus: (callback: () => void) => void;
  
  // 추가 기능 (선택적)
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  checkForUpdates: () => Promise<{ available: boolean; version?: string }>;
  takeScreenshot: () => Promise<string>; // Base64 이미지 데이터 반환
}

// RestartAPI 인터페이스 - 재시작 창에서 사용하는 API
export interface RestartAPI {
  getDarkMode: () => Promise<boolean>;
  restartApp: () => void;
  closeWindow: () => void;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    electron: ElectronAPI;
    electronRestart?: RestartAPI;
  }
}

// 타입만 익스포트
export {};

// filepath: c:\Users\user\Desktop\loop\eslint.config.mjs
ignores: [
  // 기존 항목들...
  '**/*.d.ts',  // 모든 선언 파일 무시
]