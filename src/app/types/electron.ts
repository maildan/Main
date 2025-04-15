/**
 * Electron 브릿지 API 타입 정의
 * 
 * 이 인터페이스는 Electron 메인 프로세스와 렌더러 프로세스 간의
 * 통신에 사용되는 메서드들을 정의합니다.
 */
export interface ElectronAPI {
  // 창 컨트롤 관련
  windowControl?: (action: string) => void;
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  
  // 시스템 정보 관련
  getPlatform?: () => Promise<string>;
  
  // 타이핑 통계 관련
  getTypingStats?: () => Promise<any> | any;
  onTypingStatsUpdate?: (callback: (data: any) => void) => () => void;
  onStatsSaved?: (callback: (data: any) => void) => () => void;
  startTracking?: () => Promise<void> | void;
  stopTracking?: () => Promise<void> | void;
  saveStats?: (data?: any) => Promise<boolean> | void;
  
  // 설정 관련
  loadSettings?: () => Promise<any> | any;
  saveSettings?: (settings: any) => Promise<boolean> | boolean;
  
  // 파일 시스템 관련
  readFile?: (path: string) => Promise<string> | string;
  writeFile?: (path: string, content: string) => Promise<boolean> | boolean;
  
  // 앱 관련
  onShowRestartLoading?: (callback: (data: any) => void) => () => void;
  
  // 기타 메서드들
  [key: string]: any;

  // 선택적 메서드로 추가
  onSwitchTab?: (callback: (tab: string) => void) => void;
  onOpenSaveStatsDialog?: (callback: () => void) => void;
}

/**
 * 재시작 관련 API 타입 정의
 * 
 * 앱 재시작 관련 기능들을 제공하는 인터페이스입니다.
 */
export interface RestartAPI {
  /**
   * 앱 재시작 실행
   */
  restartApp: () => void;
  
  /**
   * 현재 창 닫기
   */
  closeWindow: () => void;
  
  /**
   * 다크 모드 설정 가져오기
   * @returns 다크 모드 활성화 여부
   */
  getDarkMode: () => Promise<boolean>;
}