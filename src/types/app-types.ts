/**
 * 타이핑 통계 애플리케이션에 사용되는 타입 정의
 * 모듈화된 타입스크립트 구조를 위해 별도 파일로 분리
 */

// 타이핑 통계 관련 타입 정의
export interface TypingStatsUpdate {
  keyCount: number;
  typingTime: number;
  windowTitle?: string;
  browserName?: string;
  totalChars?: number;
  totalCharsNoSpace?: number;
  totalWords?: number;
  pages?: number;
  accuracy?: number;
  isTracking?: boolean;
}

export interface TypingStatsState {
  keyCount: number;
  typingTime: number;
  windowTitle: string;
  browserName: string;
  totalChars: number;
  totalCharsNoSpace: number;
  totalWords: number;
  pages: number;
  accuracy: number;
}

export interface RecordData {
  content: string;
  keyCount: number;
  typingTime: number;
  timestamp: string;
  windowTitle?: string;
  browserName?: string;
  totalChars?: number;
  totalWords?: number;
  pages?: number;
  accuracy?: number;
}

export interface StatsSaved extends RecordData {
  success: boolean;
}

// 로그 항목 관련 타입
export interface LogEntry {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
  window_title?: string;
  browser_name?: string;
  total_chars?: number;
  total_words?: number;
  pages?: number;
  accuracy?: number;
}

// 설정 관련 타입
export interface EnabledCategories {
  docs: boolean;
  office: boolean;
  coding: boolean;
  sns: boolean;
}

export type WindowModeType = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
export type ProcessingModeType = 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';

export interface TraySettings {
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
}

export interface SettingsState {
  enabledCategories: EnabledCategories;
  autoStartMonitoring: boolean;
  darkMode: boolean;
  windowMode: WindowModeType;
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  enableMiniView: boolean;
  useHardwareAcceleration: boolean;
  processingMode: ProcessingModeType;
  maxMemoryThreshold: number;
  resumeAfterIdle: boolean;
}

// 디버깅 정보 관련 타입
export interface DebugInfo {
  isTracking: boolean;
  currentStats: {
    keyCount: number;
    typingTime: number;
    startTime: number | null;
    lastActiveTime: number | null;
    currentWindow: string | null;
    currentBrowser: string | null;
    totalChars: number;
    totalWords: number;
    totalCharsNoSpace: number;
    pages: number;
    accuracy: number;
  };
  platform: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface BrowserInfo {
  name: string | null;
  isGoogleDocs: boolean;
  title: string | null;
}

// 타이핑 패턴 분석 관련 타입
export interface TypingPatternOptions {
  sequenceLength?: number;
  maxResults?: number;
  maxSamples?: number;
  analyzeRhythm?: boolean;
  trackMemory?: boolean;
}

export interface TypingPatternResult {
  avgInterval: number;
  commonSequences: TypingSequence[];
  patternQuality: 'consistent' | 'varied' | 'irregular' | 'unknown';
  sampleSize: number;
  rhythmPattern?: string;
  memoryUsage?: MemoryUsageInfo;
}

export interface TypingSequence {
  sequence: string;
  count: number;
}

export interface TypingPerformanceResult {
  description: string;
  efficiency: number;
  keysPerMinute: number;
  typingTime: number;
  performanceLevel: 'expert' | 'advanced' | 'proficient' | 'average' | 'slow' | 'beginner' | 'none';
  sustainableRate: number;
}

// 메모리 사용량 정보 인터페이스
export interface MemoryUsageInfo {
  heapUsed: number;
  heapTotal: number;
  heapUsedMB: number;
  percentUsed?: number;
  timestamp?: number;
}

// 웹사이트 카테고리 관련 타입
export interface WebsiteCategory {
  pattern: string;
  name: string;
}

export interface WebsiteCategories {
  docs: WebsiteCategory[];
  office: WebsiteCategory[];
  coding: WebsiteCategory[];
  sns: WebsiteCategory[];
}
