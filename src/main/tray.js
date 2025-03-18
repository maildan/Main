const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');
const { appState } = require('./constants');
const { debugLog } = require('./utils');

let tray = null;
let currentStatsTab = 'typing'; // 현재 선택된 통계 탭: 'typing', 'document', 'accuracy'

/**
 * 시스템 트레이 초기화
 */
function setupTray() {
  if (tray) return tray; // 이미 생성된 경우 재사용

  try {
    // 트레이 아이콘 생성 - 더 큰 크기로 설정
    const iconPath = path.join(__dirname, '../../public/tray-icon.png');
    let iconImage = nativeImage.createFromPath(iconPath);
    
    // 아이콘 크기 확인 - 너무 작으면 더 큰 아이콘 파일 있는지 체크
    const hdpiIconPath = path.join(__dirname, '../../public/tray-icon@2x.png');
    if (iconImage.isEmpty() || !iconImage.toBitmap().length) {
      // 기본 아이콘이 없거나 불러오기에 실패한 경우 앱 아이콘으로 대체
      const appIconPath = path.join(__dirname, '../../public/app-icon.png');
      iconImage = nativeImage.createFromPath(appIconPath);
      
      // 여전히 실패하면 기본 아이콘 사용
      if (iconImage.isEmpty()) {
        iconImage = nativeImage.createEmpty();
        console.warn('트레이 아이콘을 불러올 수 없습니다. 기본 아이콘을 사용합니다.');
      }
    }
    
    // 플랫폼에 맞게 아이콘 크기 조절
    const iconSize = process.platform === 'darwin' ? 22 : 16; // macOS는 더 큰 아이콘
    iconImage = iconImage.resize({ width: iconSize, height: iconSize });
    
    tray = new Tray(iconImage);
    
    // 툴팁 설정
    tray.setToolTip('타이핑 통계 앱 - 실시간 모니터링 중');
    
    // 트레이 메뉴 설정
    updateTrayMenu();
    
    // 트레이 아이콘 클릭 이벤트
    tray.on('click', () => {
      // 미니뷰 설정이 활성화되어 있으면 미니뷰 토글
      if (appState.settings.enableMiniView) {
        const { toggleMiniView } = require('./window');
        toggleMiniView();
      } else {
        // 기존 동작 유지
        if (appState.mainWindow) {
          if (appState.mainWindow.isVisible()) {
            if (appState.mainWindow.isMinimized()) {
              appState.mainWindow.restore();
            }
          } else {
            appState.mainWindow.show();
            appState.mainWindow.focus();
          }
        }
      }
    });
    
    debugLog('시스템 트레이 설정 완료');
    return tray;
  } catch (error) {
    debugLog('시스템 트레이 설정 오류:', error);
    return null;
  }
}

/**
 * 트레이 메뉴 업데이트
 */
function updateTrayMenu() {
  if (!tray) return;
  
  const isTracking = appState.isTracking;
  const stats = appState.currentStats;
  
  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    if (!seconds) return '0초';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`;
    } else {
      return `${remainingSeconds}초`;
    }
  };
  
  // 속도 계산 함수
  const getTypingSpeed = (keyCount, seconds) => {
    return seconds > 0 ? Math.round((keyCount / seconds) * 60) : 0;
  };
  
  // 통계 정보 생성
  const statsSection = [
    {
      label: '🔄 통계 보기',
      submenu: [
        {
          id: 'typing',
          label: '⌨️ 타이핑 정보',
          type: 'radio',
          checked: currentStatsTab === 'typing',
          click: () => { 
            currentStatsTab = 'typing';
            updateTrayMenu();
          }
        },
        {
          id: 'document',
          label: '📝 문서 정보',
          type: 'radio',
          checked: currentStatsTab === 'document',
          click: () => { 
            currentStatsTab = 'document'; 
            updateTrayMenu();
          }
        },
        {
          id: 'accuracy',
          label: '🎯 정확도 & 속도',
          type: 'radio',
          checked: currentStatsTab === 'accuracy',
          click: () => { 
            currentStatsTab = 'accuracy';
            updateTrayMenu();
          }
        }
      ]
    }
  ];
  
  // 현재 선택된 탭에 따른 통계 정보
  let currentTabStats = [];
  switch (currentStatsTab) {
    case 'typing':
      currentTabStats = [
        { label: `타자 수: ${stats.keyCount.toLocaleString()}` },
        { label: `타이핑 시간: ${formatTime(stats.typingTime)}` },
        { label: `평균 속도: ${getTypingSpeed(stats.keyCount, stats.typingTime)} 타/분` }
      ];
      break;
      
    case 'document':
      currentTabStats = [
        { label: `단어 수: ${(stats.totalWords || 0).toLocaleString()}` },
        { label: `글자 수: ${(stats.totalChars || 0).toLocaleString()}` },
        { label: `페이지 수: ${(stats.pages || 0).toFixed(1)}` }
      ];
      break;
      
    case 'accuracy':
      currentTabStats = [
        { label: `정확도: ${stats.accuracy || 100}%` },
        { label: `공백 제외 글자 수: ${(stats.totalCharsNoSpace || 0).toLocaleString()}` }
      ];
      break;
  }
  
  // 현재 추적 중인 창 정보
  const windowInfo = stats.currentWindow ?
    [{ label: `📌 현재 창: ${stats.currentWindow.substring(0, 30)}${stats.currentWindow && stats.currentWindow.length > 30 ? '...' : ''}` }] :
    [];
  
  // 미니뷰 메뉴 항목 추가
  const miniViewMenuItem = appState.settings.enableMiniView ?
    {
      label: '🔍 미니뷰 토글',
      click: () => {
        const { toggleMiniView } = require('./window');
        toggleMiniView();
      }
    } : null;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${isTracking ? '✅ 모니터링 중' : '⏸️ 모니터링 중지됨'}`,
      enabled: false
    },
    ...windowInfo,
    { type: 'separator' },
    ...statsSection,
    { type: 'separator' },
    ...currentTabStats,
    { type: 'separator' },
    {
      label: isTracking ? '⏹️ 모니터링 중지' : '▶️ 모니터링 시작',
      click: () => {
        if (isTracking) {
          if (appState.mainWindow) {
            appState.mainWindow.webContents.send('stop-tracking-from-tray');
          }
        } else {
          if (appState.mainWindow) {
            appState.mainWindow.webContents.send('start-tracking-from-tray');
          }
        }
      }
    },
    {
      label: '🔍 통계 저장',
      click: () => {
        if (appState.mainWindow) {
          appState.mainWindow.show();
          appState.mainWindow.focus();
          appState.mainWindow.webContents.send('open-save-stats-dialog');
        }
      }
    },
    // 미니뷰 메뉴 항목 조건부 추가
    ...(miniViewMenuItem ? [miniViewMenuItem] : []),
    { type: 'separator' },
    {
      label: '📊 통계 화면 열기',
      click: () => {
        if (appState.mainWindow) {
          appState.mainWindow.show();
          appState.mainWindow.focus();
          appState.mainWindow.webContents.send('switch-to-tab', 'stats');
        }
      }
    },
    {
      label: '⚙️ 설정',
      click: () => {
        if (appState.mainWindow) {
          appState.mainWindow.show();
          appState.mainWindow.focus();
          appState.mainWindow.webContents.send('switch-to-tab', 'settings');
        }
      }
    },
    { type: 'separator' },
    { 
      label: '❌ 종료',
      click: () => {
        appState.allowQuit = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // 트레이 아이콘 업데이트 (모니터링 중이면 다른 아이콘 표시)
  const iconName = isTracking ? 'tray-icon-active.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, `../../public/${iconName}`);
  
  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      const resizedIcon = process.platform === 'darwin' ? 
        icon.resize({ width: 22, height: 22 }) : 
        icon.resize({ width: 16, height: 16 });
      tray.setImage(resizedIcon);
    }
  } catch (error) {
    debugLog('트레이 아이콘 변경 오류:', error);
  }
  
  // 툴팁 업데이트
  const tooltipPrefix = isTracking ? '타이핑 통계 앱 - 모니터링 중' : '타이핑 통계 앱 - 비활성 상태';
  const speed = getTypingSpeed(stats.keyCount, stats.typingTime);
  const tooltipText = isTracking ? 
    `${tooltipPrefix}\n타자 수: ${stats.keyCount} (${speed} 타/분)` : 
    tooltipPrefix;
  tray.setToolTip(tooltipText);
}

/**
 * 트레이 제거
 */
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * 모니터링 상태 변경 시 트레이 메뉴 업데이트
 */
function updateTrayState() {
  updateTrayMenu();
}

module.exports = {
  setupTray,
  destroyTray,
  updateTrayState,
  updateTrayMenu // 트레이 메뉴 수동 업데이트 함수 내보내기
};
