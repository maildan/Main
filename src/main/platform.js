/**
 * 플랫폼 유틸리티 모듈
 *
 * 운영체제별 최적화된 기능과 인터페이스를 제공합니다.
 * 플랫폼 감지, 네이티브 기능 연동, 시스템 정보 수집 기능 포함.
 */

const { app, nativeTheme } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { debugLog } = require('./utils');

// 플랫폼 식별자
const PLATFORMS = {
  WINDOWS: 'win32',
  MACOS: 'darwin',
  LINUX: 'linux',
};

// 플랫폼별 설정 경로
const PLATFORM_PATHS = {
  // Windows 경로
  [PLATFORMS.WINDOWS]: {
    appData: app.getPath('appData'),
    userData: app.getPath('userData'),
    logs: path.join(app.getPath('userData'), 'logs'),
    temp: app.getPath('temp'),
    autoLaunch: path.join(
      app.getPath('appData'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    ),
  },
  // macOS 경로
  [PLATFORMS.MACOS]: {
    appData: app.getPath('appData'),
    userData: app.getPath('userData'),
    logs: path.join(app.getPath('userData'), 'logs'),
    temp: app.getPath('temp'),
    autoLaunch: path.join(app.getPath('home'), 'Library', 'LaunchAgents'),
  },
  // Linux 경로
  [PLATFORMS.LINUX]: {
    appData: app.getPath('appData'),
    userData: app.getPath('userData'),
    logs: path.join(app.getPath('userData'), 'logs'),
    temp: app.getPath('temp'),
    autoLaunch: path.join(app.getPath('home'), '.config', 'autostart'),
  },
};

/**
 * 현재 OS 플랫폼 반환
 * @returns {string} 플랫폼 식별자
 */
function getCurrentPlatform() {
  return os.platform();
}

/**
 * 현재 플랫폼이 Windows인지 확인
 * @returns {boolean} Windows 여부
 */
function isWindows() {
  return getCurrentPlatform() === PLATFORMS.WINDOWS;
}

/**
 * 현재 플랫폼이 macOS인지 확인
 * @returns {boolean} macOS 여부
 */
function isMacOS() {
  return getCurrentPlatform() === PLATFORMS.MACOS;
}

/**
 * 현재 플랫폼이 Linux인지 확인
 * @returns {boolean} Linux 여부
 */
function isLinux() {
  return getCurrentPlatform() === PLATFORMS.LINUX;
}

/**
 * 현재 운영체제 정보 반환
 * @returns {Object} OS 정보 객체
 */
function getOSInfo() {
  try {
    const platform = getCurrentPlatform();
    const release = os.release();
    const arch = os.arch();
    const memory = {
      total: os.totalmem(),
      free: os.freemem(),
    };
    const cpus = os.cpus();
    const hostname = os.hostname();
    const userInfo = os.userInfo();
    const uptime = os.uptime();

    return {
      platform,
      release,
      arch,
      memory,
      cpus,
      hostname,
      userInfo: {
        username: userInfo.username,
        uid: userInfo.uid,
        gid: userInfo.gid,
        homedir: userInfo.homedir,
      },
      uptime,
      isWindows: isWindows(),
      isMacOS: isMacOS(),
      isLinux: isLinux(),
      appVersion: app.getVersion(),
    };
  } catch (error) {
    debugLog('OS 정보 수집 오류:', error);
    return {
      platform: getCurrentPlatform(),
      appVersion: app.getVersion(),
    };
  }
}

/**
 * 현재 시스템 언어 설정 반환
 * @returns {string} 언어 코드 (ko, en 등)
 */
function getSystemLanguage() {
  try {
    const locale = app.getLocale() || 'en';
    return locale.split('-')[0]; // en-US -> en
  } catch (error) {
    debugLog('시스템 언어 감지 오류:', error);
    return 'en';
  }
}

/**
 * 시스템 테마 모드 반환 (다크 모드/라이트 모드)
 * @returns {string} 'dark' | 'light'
 */
function getSystemTheme() {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * 시스템 테마 변경 이벤트 구독
 * @param {Function} callback 테마 변경 콜백 함수
 * @returns {Function} 구독 해제 함수
 */
function onThemeChange(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  // 초기 테마 전달
  callback(getSystemTheme());

  // 이벤트 리스너 등록
  nativeTheme.on('updated', () => {
    callback(getSystemTheme());
  });

  // 구독 해제 함수 반환
  return () => {
    nativeTheme.removeListener('updated', callback);
  };
}

/**
 * 앱 리소스 경로 반환
 * @param {string} resourcePath 리소스 상대 경로
 * @returns {string} 전체 리소스 경로
 */
function getResourcePath(resourcePath = '') {
  try {
    // 개발 환경
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'resources', resourcePath);
    }

    // 프로덕션 환경 (패키징된 앱)
    const resourcesPath = process.resourcesPath;
    return path.join(resourcesPath, resourcePath);
  } catch (error) {
    debugLog('리소스 경로 계산 오류:', error);
    return '';
  }
}

/**
 * 플랫폼별 설정 경로 반환
 * @param {string} pathType 경로 타입 (appData, userData, logs, temp)
 * @returns {string} 경로
 */
function getPlatformPath(pathType) {
  const platform = getCurrentPlatform();
  const paths = PLATFORM_PATHS[platform] || PLATFORM_PATHS[PLATFORMS.WINDOWS];

  return paths[pathType] || '';
}

/**
 * 플랫폼별 아이콘 경로 반환
 * @param {string} iconName 아이콘 기본 이름
 * @param {string} extension 확장자 (생략 시 플랫폼별로 자동 선택)
 * @returns {string} 아이콘 경로
 */
function getIconPath(iconName, extension) {
  try {
    const platform = getCurrentPlatform();
    let iconExtension = extension;

    // 확장자가 없을 경우 플랫폼별 기본 확장자 사용
    if (!iconExtension) {
      if (platform === PLATFORMS.WINDOWS) {
        iconExtension = '.ico';
      } else if (platform === PLATFORMS.MACOS) {
        iconExtension = '.icns';
      } else {
        iconExtension = '.png';
      }
    }

    // 아이콘 경로 생성
    let iconPath = path.join(getResourcePath('icons'), `${iconName}${iconExtension}`);

    // 아이콘 파일이 존재하는지 확인
    if (!fs.existsSync(iconPath)) {
      // 기본 아이콘으로 대체
      iconPath = path.join(getResourcePath('icons'), `default${iconExtension}`);

      if (!fs.existsSync(iconPath)) {
        throw new Error(`아이콘 파일을 찾을 수 없음: ${iconPath}`);
      }
    }

    return iconPath;
  } catch (error) {
    debugLog('아이콘 경로 계산 오류:', error);
    return '';
  }
}

/**
 * 플랫폼별 최적화된 창 옵션 반환
 * @param {Object} baseOptions 기본 창 옵션
 * @returns {Object} 플랫폼별 최적화된 창 옵션
 */
function getWindowOptions(baseOptions = {}) {
  const platform = getCurrentPlatform();
  const commonOptions = {
    ...baseOptions,
    icon: getIconPath('app'),
  };

  if (platform === PLATFORMS.WINDOWS) {
    return {
      ...commonOptions,
      frame: false, // 프레임 없는 창
      transparent: !!baseOptions.transparent,
      thickFrame: true, // 리사이징 지원
      backgroundColor: baseOptions.backgroundColor || '#FFFFFF',
    };
  } else if (platform === PLATFORMS.MACOS) {
    return {
      ...commonOptions,
      titleBarStyle: 'hiddenInset', // macOS 스타일 타이틀바
      trafficLightPosition: { x: 10, y: 10 },
      vibrancy: baseOptions.vibrancy,
      visualEffectState: baseOptions.visualEffectState,
    };
  } else {
    // Linux
    return {
      ...commonOptions,
      frame: true, // Linux에서는 프레임 유지가 안정적
      icon: getIconPath('app', '.png'), // Linux는 PNG 아이콘 선호
    };
  }
}

/**
 * 현재 플랫폼의 줄바꿈 문자 반환
 * @returns {string} 줄바꿈 문자
 */
function getEOL() {
  return isWindows() ? '\r\n' : '\n';
}

/**
 * 현재 시스템 다크모드 사용 여부
 * @returns {boolean} 다크모드 여부
 */
function isDarkMode() {
  return nativeTheme.shouldUseDarkColors;
}

/**
 * 앱 다크 모드 설정
 * @param {boolean|string} mode 다크 모드 설정 ('dark', 'light', 'system' 또는 true/false)
 */
function setAppDarkMode(mode) {
  try {
    if (mode === 'system') {
      nativeTheme.themeSource = 'system';
    } else if (mode === 'dark' || mode === true) {
      nativeTheme.themeSource = 'dark';
    } else if (mode === 'light' || mode === false) {
      nativeTheme.themeSource = 'light';
    } else {
      nativeTheme.themeSource = 'system';
    }

    debugLog(`다크 모드 설정: ${nativeTheme.themeSource}`);
  } catch (error) {
    debugLog('다크 모드 설정 오류:', error);
  }
}

/**
 * 현재 플랫폼에 맞는 명령어 단축키 수정자 반환
 * (Windows/Linux: Ctrl, macOS: Command)
 * @returns {string} 수정자 키 이름
 */
function getCommandModifier() {
  return isMacOS() ? 'Command' : 'Control';
}

module.exports = {
  PLATFORMS,
  getCurrentPlatform,
  isWindows,
  isMacOS,
  isLinux,
  getOSInfo,
  getSystemLanguage,
  getSystemTheme,
  onThemeChange,
  getResourcePath,
  getPlatformPath,
  getIconPath,
  getWindowOptions,
  getEOL,
  isDarkMode,
  setAppDarkMode,
  getCommandModifier,
};
