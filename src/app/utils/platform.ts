/**
 * 플랫폼 감지 유틸리티
 * 현재 실행 중인 환경(Electron, 브라우저 등)을 감지하는 함수들을 제공합니다.
 */

/**
 * Electron 환경인지 확인
 * @returns Electron 환경 여부
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electron;
};

/**
 * 개발 환경인지 확인
 * @returns 개발 환경 여부
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * 운영체제 정보
 */
export const getOSInfo = (): { type: string; version: string } => {
  const userAgent = window.navigator.userAgent;
  let osType = 'unknown';
  let osVersion = 'unknown';

  if (userAgent.indexOf('Windows') !== -1) {
    osType = 'Windows';
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      osVersion = match[1];
    }
  } else if (userAgent.indexOf('Mac') !== -1) {
    osType = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (userAgent.indexOf('Linux') !== -1) {
    osType = 'Linux';
  }

  return { type: osType, version: osVersion };
};

/**
 * 브라우저 환경인지 확인
 * @returns 브라우저 환경 여부 (Electron이 아닌 경우)
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && !isElectron();
};

/**
 * 모바일 환경인지 확인
 * @returns 모바일 환경 여부
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  );
};
