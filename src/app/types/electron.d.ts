/**
 * Electron API 타입 정의
 * 전역 window 인터페이스 확장 타입
 */

// RestartAPI 인터페이스 - 재시작 창에서 사용하는 API
export interface RestartAPI {
  getDarkMode: () => Promise<boolean>;
  restartApp: () => void;
  closeWindow: () => void;
}

// Window 확장은 global.d.ts에서 처리되므로 여기서는 생략

// 타입만 익스포트
export {};