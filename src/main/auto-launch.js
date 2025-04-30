/**
 * 시스템 자동 시작 관리 모듈
 *
 * 애플리케이션이 시스템 시작 시 자동으로 실행되도록 설정합니다.
 * 다양한, 운영체제에서 작동하는 자동 시작 기능을 제공합니다.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { exec, execSync } = require('child_process');
const AutoLaunch = require('auto-launch');
const { getStore } = require('./store');

// 앱 실행 파일 경로
const getExecutablePath = () => {
  const exeName = app.getName() + '.exe';

  // 개발 환경에서는 electron.exe, 배포 환경에서는 앱 이름
  if (app.isPackaged) {
    return path.resolve(process.execPath);
  } else {
    // 개발 모드에서는 npm start로 실행하므로 electron 실행 파일 경로 반환
    const electronPath = path.resolve(process.execPath);
    log.info(`개발 환경 실행 경로: ${electronPath}`);
    return electronPath;
  }
};

// 자동 시작 설정 객체
let autoLauncher = null;

/**
 * 자동 시작 초기화
 * @returns {Promise<boolean>} 초기화 성공 여부
 */
async function initialize() {
  try {
    // 설정 저장소에서 자동 시작 설정 값 가져오기
    const store = getStore();
    const autoLaunchEnabled = store.get('general.autoLaunch', true);

    // 자동 시작 객체 초기화
    autoLauncher = new AutoLaunch({
      name: app.getName(),
      path: getExecutablePath(),
      isHidden: store.get('general.startMinimized', false),
    });

    // 현재 자동 시작 상태 확인 후 설정과 동기화
    const isEnabled = await isAutoLaunchEnabled();

    if (autoLaunchEnabled && !isEnabled) {
      await enableAutoLaunch();
      log.info('자동 시작 활성화됨');
    } else if (!autoLaunchEnabled && isEnabled) {
      await disableAutoLaunch();
      log.info('자동 시작 비활성화됨');
    }

    // 설정 변경 이벤트 리스너 등록
    store.onDidChangeKey('general.autoLaunch', async newValue => {
      if (newValue) {
        await enableAutoLaunch();
        log.info('자동 시작 설정 변경: 활성화');
      } else {
        await disableAutoLaunch();
        log.info('자동 시작 설정 변경: 비활성화');
      }
    });

    store.onDidChangeKey('general.startMinimized', async newValue => {
      // 숨김 모드 설정 변경 시 자동 시작 재설정
      await updateAutoLauncher();
      log.info(`자동 시작 숨김 모드 설정 변경: ${newValue}`);
    });

    log.info('자동 시작 모듈 초기화 완료');
    return true;
  } catch (error) {
    log.error('자동 시작 초기화 오류:', error);
    return false;
  }
}

/**
 * 자동 시작 활성화
 * @returns {Promise<boolean>} 성공 여부
 */
async function enableAutoLaunch() {
  try {
    if (!autoLauncher) {
      const store = getStore();
      autoLauncher = new AutoLaunch({
        name: app.getName(),
        path: getExecutablePath(),
        isHidden: store.get('general.startMinimized', false),
      });
    }

    // 자동 실행 설정
    await autoLauncher.enable();

    // 설정 저장
    getStore().set('general.autoLaunch', true);

    return true;
  } catch (error) {
    log.error('자동 시작 활성화 오류:', error);

    // 실패 시 대체 방법 시도
    return fallbackEnableAutoLaunch();
  }
}

/**
 * 자동 시작 비활성화
 * @returns {Promise<boolean>} 성공 여부
 */
async function disableAutoLaunch() {
  try {
    if (!autoLauncher) {
      const store = getStore();
      autoLauncher = new AutoLaunch({
        name: app.getName(),
        path: getExecutablePath(),
        isHidden: store.get('general.startMinimized', false),
      });
    }

    // 자동 실행 해제
    await autoLauncher.disable();

    // 설정 저장
    getStore().set('general.autoLaunch', false);

    return true;
  } catch (error) {
    log.error('자동 시작 비활성화 오류:', error);

    // 실패 시 대체 방법 시도
    return fallbackDisableAutoLaunch();
  }
}

/**
 * 현재 자동 시작 활성화 상태 확인
 * @returns {Promise<boolean>} 활성화 상태
 */
async function isAutoLaunchEnabled() {
  try {
    if (!autoLauncher) {
      const store = getStore();
      autoLauncher = new AutoLaunch({
        name: app.getName(),
        path: getExecutablePath(),
        isHidden: store.get('general.startMinimized', false),
      });
    }

    return await autoLauncher.isEnabled();
  } catch (error) {
    log.error('자동 시작 상태 확인 오류:', error);

    // 실패 시 대체 방법으로 확인
    return fallbackCheckAutoLaunchStatus();
  }
}

/**
 * 자동 시작 설정 업데이트
 * @returns {Promise<boolean>} 성공 여부
 */
async function updateAutoLauncher() {
  try {
    const store = getStore();
    const isEnabled = await isAutoLaunchEnabled();
    const shouldBeEnabled = store.get('general.autoLaunch', true);

    // 현재 인스턴스 재구성
    autoLauncher = new AutoLaunch({
      name: app.getName(),
      path: getExecutablePath(),
      isHidden: store.get('general.startMinimized', false),
    });

    // 필요한 경우 상태 변경
    if (shouldBeEnabled) {
      if (!isEnabled) {
        await autoLauncher.enable();
      } else {
        // Windows에서는 업데이트를 위해 비활성화 후 재활성화가 필요할 수 있음
        await autoLauncher.disable();
        await autoLauncher.enable();
      }
    } else if (isEnabled) {
      await autoLauncher.disable();
    }

    return true;
  } catch (error) {
    log.error('자동 시작 설정 업데이트 오류:', error);
    return false;
  }
}

/**
 * 대체 방법으로 자동 시작 활성화 (auto-launch 패키지 실패 시)
 * @returns {Promise<boolean>} 성공 여부
 */
async function fallbackEnableAutoLaunch() {
  try {
    const appName = app.getName();
    const execPath = getExecutablePath();

    // Windows 레지스트리 설정
    if (process.platform === 'win32') {
      const regCommand = `REG ADD HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v "${appName}" /t REG_SZ /d "${execPath.replace(/\\/g, '\\\\')}" /f`;
      execSync(regCommand);
      log.info('Windows 레지스트리에 자동 시작 항목 추가 완료');
    }
    // macOS 시작 항목 설정
    else if (process.platform === 'darwin') {
      const plistPath = path.join(
        app.getPath('home'),
        'Library',
        'LaunchAgents',
        `${appName}.plist`
      );
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${appName}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>`;

      fs.writeFileSync(plistPath, plistContent);
      log.info('macOS 시작 항목 설정 완료');
    }
    // Linux 자동 시작 항목 설정
    else if (process.platform === 'linux') {
      const desktopEntry = `[Desktop Entry]
Type=Application
Version=1.0
Name=${appName}
Comment=${appName} Application
Exec=${execPath}
StartupNotify=false
Terminal=false
`;

      const desktopPath = path.join(
        app.getPath('home'),
        '.config',
        'autostart',
        `${appName}.desktop`
      );

      // 디렉토리가 없으면 생성
      const autoStartDir = path.dirname(desktopPath);
      if (!fs.existsSync(autoStartDir)) {
        fs.mkdirSync(autoStartDir, { recursive: true });
      }

      fs.writeFileSync(desktopPath, desktopEntry);
      fs.chmodSync(desktopPath, 0o755); // 실행 권한 부여
      log.info('Linux 자동 시작 항목 설정 완료');
    }

    // 설정 저장
    getStore().set('general.autoLaunch', true);

    return true;
  } catch (error) {
    log.error('대체 자동 시작 활성화 오류:', error);
    return false;
  }
}

/**
 * 대체 방법으로 자동 시작 비활성화 (auto-launch 패키지 실패 시)
 * @returns {Promise<boolean>} 성공 여부
 */
async function fallbackDisableAutoLaunch() {
  try {
    const appName = app.getName();

    // Windows 레지스트리 설정 제거
    if (process.platform === 'win32') {
      const regCommand = `REG DELETE HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v "${appName}" /f`;
      execSync(regCommand);
      log.info('Windows 레지스트리에서 자동 시작 항목 제거 완료');
    }
    // macOS 시작 항목 제거
    else if (process.platform === 'darwin') {
      const plistPath = path.join(
        app.getPath('home'),
        'Library',
        'LaunchAgents',
        `${appName}.plist`
      );
      if (fs.existsSync(plistPath)) {
        fs.unlinkSync(plistPath);
        log.info('macOS 시작 항목 제거 완료');
      }
    }
    // Linux 자동 시작 항목 제거
    else if (process.platform === 'linux') {
      const desktopPath = path.join(
        app.getPath('home'),
        '.config',
        'autostart',
        `${appName}.desktop`
      );
      if (fs.existsSync(desktopPath)) {
        fs.unlinkSync(desktopPath);
        log.info('Linux 자동 시작 항목 제거 완료');
      }
    }

    // 설정 저장
    getStore().set('general.autoLaunch', false);

    return true;
  } catch (error) {
    log.error('대체 자동 시작 비활성화 오류:', error);
    return false;
  }
}

/**
 * 대체 방법으로 자동 시작 상태 확인 (auto-launch 패키지 실패 시)
 * @returns {Promise<boolean>} 활성화 상태
 */
async function fallbackCheckAutoLaunchStatus() {
  try {
    const appName = app.getName();

    // Windows 레지스트리 확인
    if (process.platform === 'win32') {
      const regCommand = `REG QUERY HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v "${appName}"`;
      try {
        execSync(regCommand, { stdio: 'ignore' });
        return true;
      } catch (e) {
        return false;
      }
    }
    // macOS 시작 항목 확인
    else if (process.platform === 'darwin') {
      const plistPath = path.join(
        app.getPath('home'),
        'Library',
        'LaunchAgents',
        `${appName}.plist`
      );
      return fs.existsSync(plistPath);
    }
    // Linux 자동 시작 항목 확인
    else if (process.platform === 'linux') {
      const desktopPath = path.join(
        app.getPath('home'),
        '.config',
        'autostart',
        `${appName}.desktop`
      );
      return fs.existsSync(desktopPath);
    }

    return false;
  } catch (error) {
    log.error('대체 자동 시작 상태 확인 오류:', error);
    return false;
  }
}

module.exports = {
  initialize,
  enableAutoLaunch,
  disableAutoLaunch,
  isAutoLaunchEnabled,
  updateAutoLauncher,
};
