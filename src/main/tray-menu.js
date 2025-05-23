/**
 * 시스템 트레이 메뉴 관리 모듈
 *
 * 플랫폼별 최적화된 시스템 트레이 기능 제공:
 * - 운영체제별 최적화된 트레이 아이콘 생성
 * - 대시보드, 설정 등 중요 기능 빠른 접근
 * - GPU 가속, 자동 실행 등 주요 설정 토글 기능
 * - macOS에서 자동 다크/라이트 모드 아이콘 전환
 * - 설정 변경 시 자동 메뉴 업데이트
 */

const { app, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const platform = require('./platform');
const store = require('./store');
const gpuUtils = require('./gpu-utils');
const autoLaunch = require('./auto-launch');

// 트레이 인스턴스 (싱글톤)
let trayInstance = null;

// 트레이 아이콘 경로 (운영체제별)
const TRAY_ICONS = {
  default: {
    normal: 'tray-icon',
    active: 'tray-icon-active',
  },
  win32: {
    normal: 'tray-icon-win',
    active: 'tray-icon-win-active',
  },
  darwin: {
    normal: {
      light: 'tray-icon-mac',
      dark: 'tray-icon-mac-white',
    },
    active: {
      light: 'tray-icon-mac-active',
      dark: 'tray-icon-mac-white-active',
    },
  },
  linux: {
    normal: 'tray-icon-linux',
    active: 'tray-icon-linux-active',
  },
};

/**
 * 트레이 아이콘 파일 경로 반환
 * @param {string} state 아이콘 상태 ('normal' | 'active')
 * @returns {string|null} 아이콘 파일 경로 또는 null
 */
function getIconPath(state = 'normal') {
  // state가 없을 경우 기본값 설정
  state = state || 'normal';
  
  try {
    let iconName;
    
    // 플랫폼에 따라 아이콘 파일 이름 설정
    if (platform.isMacOS()) {
      // macOS에서는 템플릿 이미지 사용 가능
      iconName = `tray-icon-${state}-Template.png`;
    } else if (platform.isWindows()) {
      // Windows에서는 16x16 ICO 파일 선호
      iconName = `tray-icon-${state}.ico`;
    } else {
      // 기타 플랫폼(Linux 등)
      iconName = `tray-icon-${state}.png`;
    }
    
    // 가능한 아이콘 경로들
    const possiblePaths = [
      // 1. 공개 디렉토리 확인
      path.join(__dirname, '../../public/icons', iconName),
      // 2. 리소스 디렉토리 확인
      path.join(__dirname, '../../resources/icons', iconName),
      // 3. 애셋 디렉토리 확인
      path.join(__dirname, '../../assets/icons', iconName),
      // 4. 기본 아이콘으로 대체
      path.join(__dirname, '../../public', 'app_icon.webp'),
      path.join(__dirname, '../../public', 'app-icon.png')
    ];
    
    // 존재하는 첫 번째 아이콘 파일 반환
    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }
    
    // 아이콘 파일이 없는 경우
    log.warn(`트레이 아이콘 파일을 찾을 수 없음: ${iconName}`);
    return null;
  } catch (error) {
    log.error('트레이 아이콘 경로 계산 오류:', error);
    return null;
  }
}

/**
 * 트레이 아이콘 이미지 생성
 * @param {string} state 아이콘 상태 ('normal' | 'active')
 * @returns {Electron.NativeImage} 네이티브 이미지 객체
 */
function createTrayIcon(state = 'normal') {
  try {
    const iconPath = getIconPath(state || 'normal');

    // 아이콘 파일이 없으면 빈 이미지 반환
    if (!iconPath || !fs.existsSync(iconPath)) {
      log.warn(`트레이 아이콘 파일이 없습니다: ${iconPath}`);
      return nativeImage.createEmpty();
    }

    // 아이콘 이미지 생성 - undefined 체크 추가
    const icon = nativeImage.createFromPath(iconPath);

    // macOS에서는 템플릿 이미지로 설정 (시스템이 자동으로 색상 조절)
    if (platform.isMacOS && typeof platform.isMacOS === 'function' && platform.isMacOS()) {
      icon.setTemplateImage(true);
    }

    return icon;
  } catch (error) {
    log.error('트레이 아이콘 생성 실패:', error);
    return nativeImage.createEmpty();
  }
}

/**
 * 트레이 메뉴 생성
 * @param {Object} options 메뉴 옵션
 * @returns {Electron.Menu} 메뉴 객체
 */
function createTrayMenu(options = {}) {
  const {
    windows = {},
    isGpuAccelerationEnabled = gpuUtils.isAccelerationEnabled(),
    isAutoLaunchEnabled = autoLaunch.isEnabled(),
  } = options;

  // 앱 정보
  const appVersion = app.getVersion();
  const appName = app.getName();

  // 메뉴 템플릿 생성
  const menuTemplate = [
    // 앱 상태 정보 (클릭 불가 항목)
    {
      label: `${appName} v${appVersion}`,
      enabled: false,
    },
    { type: 'separator' },

    // 대시보드 열기
    {
      label: '대시보드 열기',
      click: () => {
        if (windows.main) {
          windows.main.show();
          windows.main.focus();
        }
      },
    },

    // 미니 뷰 열기
    {
      label: '미니 뷰 열기',
      click: () => {
        if (windows.miniView) {
          windows.miniView.show();
          windows.miniView.focus();
        } else if (windows.main) {
          // 메인 창으로 미니 뷰 열기 명령 전송
          windows.main.webContents.send('open-mini-view');
        }
      },
    },

    // 설정 열기
    {
      label: '설정',
      click: () => {
        if (windows.main) {
          windows.main.show();
          windows.main.focus();
          windows.main.webContents.send('open-settings');
        }
      },
    },

    { type: 'separator' },

    // GPU 가속 토글
    {
      label: 'GPU 가속',
      type: 'checkbox',
      checked: isGpuAccelerationEnabled,
      click: menuItem => {
        const enabled = menuItem.checked;

        // 설정 저장
        store.set('gpuAcceleration', enabled);

        // GPU 상태 업데이트
        gpuUtils.setAcceleration(enabled);

        // 변경사항 알림 (앱 재시작 필요)
        if (windows.main) {
          windows.main.webContents.send('gpu-acceleration-changed', enabled);
        }
      },
    },

    // 시작 시 자동 실행 토글
    {
      label: '시작 시 자동 실행',
      type: 'checkbox',
      checked: isAutoLaunchEnabled,
      click: menuItem => {
        const enabled = menuItem.checked;

        // 설정 저장 및 자동 실행 업데이트
        store.set('autoLaunch', enabled);
        autoLaunch.setEnabled(enabled);
      },
    },

    { type: 'separator' },

    // 도움말 메뉴
    {
      label: '도움말',
      submenu: [
        {
          label: '문서',
          click: () => {
            shell.openExternal('https://loop.app/docs');
          },
        },
        {
          label: '웹사이트',
          click: () => {
            shell.openExternal('https://loop.app');
          },
        },
        {
          label: '버그 신고',
          click: () => {
            shell.openExternal('https://github.com/loop/loop/issues');
          },
        },
        { type: 'separator' },
        {
          label: '개발자 도구',
          click: () => {
            if (windows.main) {
              windows.main.webContents.openDevTools({ mode: 'detach' });
            }
          },
        },
      ],
    },

    { type: 'separator' },

    // 앱 종료
    {
      label: '종료',
      click: () => {
        app.quit();
      },
    },
  ];

  // 메뉴 생성 및 반환
  return Menu.buildFromTemplate(menuTemplate);
}

/**
 * 트레이 메뉴 업데이트
 * @param {Object} options 메뉴 옵션
 */
function updateTrayMenu(options = {}) {
  if (!trayInstance) return;

  try {
    const menu = createTrayMenu(options);
    trayInstance.setContextMenu(menu);

    // 툴팁 업데이트
    const appName = app.getName();
    trayInstance.setToolTip(`${appName} - 실행 중`);
  } catch (error) {
    log.error('트레이 메뉴 업데이트 실패:', error);
  }
}

/**
 * 시스템 트레이 아이콘 업데이트
 * @param {string} state 아이콘 상태 ('normal' | 'active')
 */
function updateTrayIcon(state = 'normal') {
  if (!trayInstance) return;

  try {
    const icon = createTrayIcon(state);
    trayInstance.setImage(icon);
  } catch (error) {
    log.error('트레이 아이콘 업데이트 실패:', error);
  }
}

/**
 * 시스템 트레이 초기화
 * @param {Object} options 초기화 옵션
 * @returns {Electron.Tray} 트레이 인스턴스
 */
function init(options = {}) {
  // 트레이가 이미 존재하면 기존 인스턴스 반환
  if (trayInstance) {
    updateTrayMenu(options);
    return trayInstance;
  }

  try {
    // 트레이 아이콘 생성
    const icon = createTrayIcon('normal');
    trayInstance = new Tray(icon);

    // 앱 이름 툴팁 설정
    const appName = app.getName();
    trayInstance.setToolTip(`${appName} - 실행 중`);

    // 트레이 메뉴 설정
    updateTrayMenu(options);

    // macOS: 다크 모드 변경 감지하여 아이콘 업데이트
    if (platform.isMacOS()) {
      platform.onThemeChange(() => {
        updateTrayIcon('normal');
      });
    }

    // 설정 변경 이벤트 리스너
    store.onDidChange('gpuAcceleration', newValue => {
      updateTrayMenu({ ...options, isGpuAccelerationEnabled: newValue });
    });

    store.onDidChange('autoLaunch', newValue => {
      updateTrayMenu({ ...options, isAutoLaunchEnabled: newValue });
    });

    // 트레이 클릭 이벤트 (맥OS는 우클릭, 윈도우/리눅스는 좌클릭)
    if (platform.isMacOS()) {
      trayInstance.on('right-click', () => {
        trayInstance.popUpContextMenu();
      });

      trayInstance.on('click', () => {
        if (options.windows && options.windows.main) {
          const win = options.windows.main;
          if (win.isVisible()) {
            win.hide();
          } else {
            win.show();
            win.focus();
          }
        }
      });
    } else {
      // Windows/Linux는 좌클릭으로 메뉴 표시
      trayInstance.on('click', () => {
        trayInstance.popUpContextMenu();
      });
    }

    log.info('시스템 트레이 초기화 완료');
    return trayInstance;
  } catch (error) {
    log.error('시스템 트레이 초기화 실패:', error);
    return null;
  }
}

/**
 * 트레이 인스턴스 파괴
 */
function destroy() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
    log.info('시스템 트레이 제거됨');
  }
}

module.exports = {
  init,
  destroy,
  updateTrayMenu,
  updateTrayIcon,
  get instance() {
    return trayInstance;
  },
};
