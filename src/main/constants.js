const path = require('path');
const { app } = require('electron');  // Electron의 app 모듈 임포트 추가

// 개발 모드 확인
const isDev = process.env.NODE_ENV === 'development';

// 앱 상태 관리
const appState = {
  mainWindow: null,
  miniViewWindow: null, // 미니뷰 창 참조
  miniViewStatsInterval: null, // 미니뷰 통계 전송 인터벌
  miniViewLastMode: 'icon', // 미니뷰 마지막 모드 ('icon' 또는 'normal')
  isTracking: false,
  keyboardListener: null,
  windowMode: 'windowed',
  autoHideToolbar: false,
  autoHideCssKey: null, // CSS 키 저장을 위해 추가
  backgroundCssKey: null, // 백그라운드 모드 CSS 키
  allowQuit: false, // 완전히 종료할지 여부
  tray: null, // 트레이 객체 참조
  updateInterval: null, // 통계 업데이트 인터벌 참조
  lastGcTime: Date.now(), // 마지막 GC 실행 시간
  idleTime: 0, // 사용자 마지막 활동 이후 경과 시간
  memoryUsage: {
    lastCheck: Date.now(),
    heapUsed: 0,
    heapTotal: 0,
    rss: 0
  },
  currentStats: {
    keyCount: 0,
    typingTime: 0,
    startTime: null,
    lastActiveTime: null,
    currentWindow: null,
    currentBrowser: null,
    totalChars: 0,
    totalWords: 0,
    totalCharsNoSpace: 0,
    pages: 0,
    accuracy: 100
  },
  settings: {
    enabledCategories: {
      docs: true,
      office: true,
      coding: true,
      sns: true
    },
    autoStartMonitoring: true,
    resumeAfterIdle: true, // 유휴 상태 후 자동 재시작 (신규 추가)
    idleTimeout: 300, // 유휴 상태 판단 시간 (초) (신규 추가)
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true, // 트레이로 최소화 설정 (기본값 true)
    showTrayNotifications: true, // 트레이 알림 표시 여부
    reduceMemoryInBackground: true, // 백그라운드에서 메모리 사용 감소
    enableMiniView: true, // 미니뷰 활성화 기본값
    useHardwareAcceleration: false, // 하드웨어 가속 사용 여부
    processingMode: 'auto', // 처리 모드 - 'auto', 'normal', 'cpu-intensive', 'gpu-intensive'
    garbageCollectionInterval: 60000, // 주기적 GC 실행 간격 (ms)
    maxMemoryThreshold: 100, // 메모리 임계치 (MB)
    autoCleanupLogs: true, // 오래된 로그 자동 정리
    maxHistoryItems: 500, // 최대 히스토리 항목 수
    logRetentionDays: 30 // 로그 보관 일수
  },
  inBackgroundMode: false,
  gpuEnabled: false, // GPU 가속 사용 여부
  gpuResources: null, // GPU 관련 리소스 저장 객체
  isRestarting: false // 재시작 관련 상태 추가
};

// IDLE 시간 기준 증가
const IDLE_TIMEOUT = 5000; // 3초에서 5초로 증가

// 메모리 최적화 관련 상수 업데이트
const MEMORY_CHECK_INTERVAL = 30000; // 30초마다 메모리 체크
const BACKGROUND_ACTIVITY_INTERVAL = 10000; // 백그라운드 활동 간격
const LOW_MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB
const HIGH_MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
const CRITICAL_MEMORY_THRESHOLD = 150 * 1024 * 1024; // 150MB

// 단축키나 특수키를 필터링하기 위한 키 목록
const SPECIAL_KEYS = [
  'Alt', 'Control', 'Shift', 'Meta', 'CapsLock', 'Tab',
  'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'PrintScreen', 'ScrollLock', 'Pause', 'Insert', 'Home', 'PageUp', 'PageDown', 'End', 'Delete',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'ContextMenu', 'AltGraph', 'Dead',
  'Backspace', 'Enter', 'NumLock', 'NumpadEnter', 'NumpadDivide', 'NumpadMultiply',
  'NumpadSubtract', 'NumpadAdd', 'NumpadDecimal'
];

// 브라우저 프로세스 이름 목록
const BROWSER_PROCESS_NAMES = [
  'chrome', 'firefox', 'msedge', 'edge', 'safari', 'opera', 'operagx', 'operaair',
  'brave', 'vivaldi', 'arc', 'zenbrowser', 'zen', 'yandex', 
  'maxthon', 'chromium', 'dragon', 'iron', 'torch', 'whale', 'naver'
];

// 브라우저 표시 이름 매핑
const BROWSER_DISPLAY_NAMES = {
  'chrome': 'Google Chrome',
  'firefox': 'Mozilla Firefox',
  'msedge': 'Microsoft Edge',
  'edge': 'Microsoft Edge',
  'safari': 'Apple Safari',
  'opera': 'Opera',
  'operagx': 'Opera GX',
  'operaair': 'Opera Air',
  'brave': 'Brave',
  'vivaldi': 'Vivaldi',
  'arc': 'Arc Browser',
  'zenbrowser': 'Zen Browser',
  'zen': 'Zen Browser',
  'yandex': 'Yandex Browser',
  'maxthon': 'Maxthon',
  'chromium': 'Chromium',
  'dragon': 'Comodo Dragon',
  'iron': 'SRWare Iron',
  'torch': 'Torch Browser',
  'whale': '네이버 웨일',
  'naver': '네이버 브라우저'
};

// 지원되는 웹사이트 카테고리
const SUPPORTED_WEBSITES = {
  // 문서 작업
  docs: [
    { pattern: 'docs.google.com/document', name: '구글 문서' },
    { pattern: 'docs.google.com/spreadsheets', name: '구글 스프레드시트' },
    { pattern: 'docs.google.com/presentation', name: '구글 프레젠테이션' },
    { pattern: 'notion.so', name: 'Notion' },
    { pattern: 'onenote.com', name: 'OneNote' },
    { pattern: 'evernote.com', name: 'Evernote' },
  ],
  
  // 오피스 웹앱
  office: [
    { pattern: 'office.com', name: 'Microsoft Office' },
    { pattern: 'office.com/word', name: 'Word 온라인' },
    { pattern: 'office.com/excel', name: 'Excel 온라인' },
    { pattern: 'office.com/powerpoint', name: 'PowerPoint 온라인' },
    { pattern: 'hancom.com', name: '한컴오피스' },
  ],
  
  // 코딩 관련
  coding: [
    { pattern: 'github.com', name: 'GitHub' },
    { pattern: 'gitlab.com', name: 'GitLab' },
    { pattern: 'bitbucket.org', name: 'Bitbucket' },
    { pattern: 'codesandbox.io', name: 'CodeSandbox' },
    { pattern: 'codepen.io', name: 'CodePen' },
    { pattern: 'replit.com', name: 'Replit' },
  ],
  
  // SNS/메신저
  sns: [
    { pattern: 'facebook.com', name: 'Facebook' },
    { pattern: 'twitter.com', name: 'Twitter' },
    { pattern: 'instagram.com', name: 'Instagram' },
    { pattern: 'slack.com', name: 'Slack' },
    { pattern: 'discord.com', name: 'Discord' },
    { pattern: 'telegram.org', name: 'Telegram' },
  ],
};

// 웹사이트 URL 패턴 목록 (모든 카테고리 통합)
const WEBSITE_URL_PATTERNS = Object.values(SUPPORTED_WEBSITES).flat().map(site => site.pattern);

// Google Docs URL 패턴
const GOOGLE_DOCS_URL_PATTERNS = [
  'docs.google.com/document',
  'docs.google.com/spreadsheets',
  'docs.google.com/presentation',
  'docs.google.com/forms',
  'docs.google.com/drawings'
];

// Google Docs 창 제목 패턴
const GOOGLE_DOCS_TITLE_PATTERNS = [
  'google docs', '구글 문서', '구글 스프레드시트', 'google sheets',
  'google slides', '구글 프레젠테이션', 'google forms', '구글 설문지',
  'google drawings', '구글 그림', '.gdoc', '.gsheet', '.gslides'
];

// 설정 파일 경로
const userDataPath = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, '../../userData') // 개발 환경
  : app.getPath('userData'); // 프로덕션 환경

const settingsPath = path.join(userDataPath, 'settings.json');

module.exports = {
  appState,
  isDev,
  IDLE_TIMEOUT,
  SPECIAL_KEYS,
  BROWSER_PROCESS_NAMES,
  BROWSER_DISPLAY_NAMES,
  SUPPORTED_WEBSITES,
  WEBSITE_URL_PATTERNS,
  GOOGLE_DOCS_URL_PATTERNS,
  GOOGLE_DOCS_TITLE_PATTERNS,
  settingsPath,
  userDataPath,
  MEMORY_CHECK_INTERVAL,
  BACKGROUND_ACTIVITY_INTERVAL,
  LOW_MEMORY_THRESHOLD,
  HIGH_MEMORY_THRESHOLD,
  CRITICAL_MEMORY_THRESHOLD
};
