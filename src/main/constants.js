// ES 모듈 import 문을 CommonJS require로 변경
const path = require('path');
const { app } = require('electron');
const isDev = require('electron-is-dev');

// 개발 모드 확인
const isDevMode = process.env.NODE_ENV === 'development';

// 앱 상태 관리
const appState = {
  mainWindow: null,
  tray: null,
  miniViewWindow: null,
  analyticsWindow: null,
  allowQuit: false,
  isClosing: false,
  isFullscreen: false,
  autoHideToolbar: false,
  lastActive: Date.now(),
  idleTimeout: 5 * 60 * 1000, // 5분
  settings: {
    darkMode: false,
    minimizeToTray: true,
    showTrayNotifications: true,
    startMinimized: false,
    autoHideToolbar: false,
    idleThreshold: 5, // 분
    useHardwareAcceleration: true,
    reduceMemoryInBackground: true,
    maxMemoryThreshold: 200, // MB
    loggingLevel: 'info',
    processingMode: 'auto', // 'performance', 'balanced', 'eco'
    windowMode: 'normal' // 'normal', 'fullscreen', 'fullscreen-auto-hide'
  },
  memoryMonitorInterval: 60000,
  memoryThreshold: {
    high: 150,
    critical: 250
  },
  paths: {
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
    temp: app.getPath('temp'),
    logs: path.join(app.getPath('userData'), 'logs'),
    settings: path.join(app.getPath('userData'), 'settings.json'),
    database: path.join(app.getPath('userData'), 'database.sqlite')
  }
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

// 앱 경로 상수
const APP_PATHS = {
  root: app.getAppPath(),
  userData: app.getPath('userData'),
  preload: path.join(app.getAppPath(), 'preload.js'),
  error: path.join(app.getAppPath(), 'error.html')
};

// UI 관련 상수
const UI_CONSTANTS = {
  minWidth: 800,
  minHeight: 600,
  defaultWidth: 1200,
  defaultHeight: 800,
  toolbarHeight: 38,
  statusBarHeight: 24
};

// 모든 상수를 한 번에 내보냄
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
  APP_PATHS,
  UI_CONSTANTS,
  MEMORY_CHECK_INTERVAL,
  BACKGROUND_ACTIVITY_INTERVAL,
  LOW_MEMORY_THRESHOLD,
  HIGH_MEMORY_THRESHOLD,
  CRITICAL_MEMORY_THRESHOLD
};
