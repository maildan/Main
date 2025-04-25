/**
 * Electron IPC 통신을 위한 유틸리티 함수 모음
 */

/**
 * Electron 객체 타입 정의
 */
type ElectronAPI = {
  // 시스템 관련
  getSystemInfo: () => Promise<any>;
  
  // GPU 관련
  getGpuInfo: () => Promise<any>;
  setGpuAcceleration: (enabled: boolean) => Promise<boolean>;
  optimizeForBattery: (enabled: boolean) => Promise<boolean>;
  
  // 전원 관련
  getBatteryInfo: () => Promise<any>;
  getSystemIdleTime: () => Promise<any>;
  
  // 앱 관련
  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<string>;
  showItemInFolder: (path: string) => Promise<void>;
  
  // 스크린샷 관련
  takeScreenshot: () => Promise<any>;
  saveScreenshot: (data: { dataURL: string, filePath: string }) => Promise<any>;
  getScreenshots: () => Promise<any[]>;
  
  // 이벤트 관련
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  
  // 창 관련
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  
  // 설정 관련
  getSettings: () => Promise<any>;
  setSetting: (key: string, value: any) => Promise<void>;
};

/**
 * Electron API가 사용 가능한지 확인
 * @returns Electron API 사용 가능 여부
 */
export const isElectronAvailable = (): boolean => {
  // @ts-ignore - window.electron은 Electron 환경에서만 사용 가능
  return (typeof window !== 'undefined' && window.electron !== undefined);
};

/**
 * Electron API 반환
 * 브라우저 환경에서 안전하게 사용하기 위해 Proxy로 감싸서 반환
 * @returns Electron API 또는 더미 API
 */
export const getElectronAPI = (): ElectronAPI => {
  if (!isElectronAvailable()) {
    // Electron이 사용 불가능한 경우, 더미 API 반환
    return createDummyElectronAPI();
  }
  
  // @ts-ignore - window.electron은 Electron 환경에서만 사용 가능
  return window.electron;
};

/**
 * 더미 Electron API 생성
 * Electron이 사용 불가능한 환경(브라우저 등)에서 사용
 * @returns 더미 Electron API
 */
const createDummyElectronAPI = (): ElectronAPI => {
  const notAvailableError = () => 
    Promise.reject(new Error('이 기능은 Electron 환경에서만 사용할 수 있습니다.'));
  
  const noopFunction = () => {};
  
  return {
    // 시스템 관련
    getSystemInfo: notAvailableError,
    
    // GPU 관련
    getGpuInfo: notAvailableError,
    setGpuAcceleration: () => notAvailableError(),
    optimizeForBattery: () => notAvailableError(),
    
    // 전원 관련
    getBatteryInfo: notAvailableError,
    getSystemIdleTime: notAvailableError,
    
    // 앱 관련
    openExternal: () => notAvailableError(),
    openPath: () => notAvailableError(),
    showItemInFolder: () => notAvailableError(),
    
    // 스크린샷 관련
    takeScreenshot: notAvailableError,
    saveScreenshot: () => notAvailableError(),
    getScreenshots: () => notAvailableError(),
    
    // 이벤트 관련
    on: noopFunction,
    off: noopFunction,
    send: noopFunction,
    
    // 창 관련
    minimize: noopFunction,
    maximize: noopFunction,
    unmaximize: noopFunction,
    close: noopFunction,
    isMaximized: notAvailableError,
    
    // 설정 관련
    getSettings: notAvailableError,
    setSetting: () => notAvailableError()
  };
};

/**
 * 선택적으로 Electron API 함수 실행
 * Electron 환경이 아닌 경우 기본값 반환
 * @param fn - 실행할 Electron API 함수
 * @param defaultValue - Electron이 없을 때 반환할 기본값
 * @returns 함수 실행 결과 또는 기본값
 */
export const withElectron = async <T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  defaultValue: T,
  ...args: Args
): Promise<T> => {
  if (!isElectronAvailable()) {
    return defaultValue;
  }
  
  try {
    return await fn(...args);
  } catch (error) {
    console.error('Electron API 호출 오류:', error);
    return defaultValue;
  }
};

/**
 * Electron 이벤트 리스너 등록
 * @param channel - 이벤트 채널
 * @param callback - 이벤트 콜백
 * @returns 이벤트 리스너 제거 함수
 */
export const useElectronListener = (
  channel: string,
  callback: (event: any, ...args: any[]) => void
): (() => void) => {
  if (!isElectronAvailable()) {
    return () => {};
  }
  
  // @ts-ignore - window.electron은 Electron 환경에서만 사용 가능
  window.electron.on(channel, callback);
  
  return () => {
    // @ts-ignore - window.electron은 Electron 환경에서만 사용 가능
    if (window.electron) {
      // @ts-ignore
      window.electron.off(channel, callback);
    }
  };
};
