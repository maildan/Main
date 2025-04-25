/**
 * 애플리케이션 전역에서 사용하는 공통 타입 정의
 */

/**
 * 기본 응답 타입
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: number;
}

/**
 * GPU 정보 타입
 */
export interface GpuInfo {
  features: Record<string, string>;
  settings: {
    gpuAcceleration: boolean;
    hardwareAcceleration: boolean;
    vsync: boolean;
    webGLEnabled: boolean;
    batteryOptimizationMode: string;
    onBattery?: boolean;
  };
  acceleration: boolean;
  hardwareAcceleration: boolean;
  timestamp: number;
}

/**
 * 배터리 정보 타입
 */
export interface BatteryInfo {
  onBattery: boolean;
  level?: number;
  charging?: boolean;
  dischargingTime?: number;
  timestamp: number;
}

/**
 * 시스템 정보 타입
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  hostname: string;
  uptime: number;
  loadAverage: number[];
  userInfo: {
    username: string;
    uid: number;
    gid: number;
    homedir: string;
  };
  onBattery: boolean;
  appVersion: string;
  timestamp: number;
}

/**
 * 애플리케이션 설정 타입
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  startOnBoot: boolean;
  minimizeToTray: boolean;
  updateAutomatically: boolean;
  gpu: {
    gpuAcceleration: boolean;
    hardwareAcceleration: boolean;
    vsync: boolean;
    webGLEnabled: boolean;
    batteryOptimizationMode: 'auto' | 'always' | 'never';
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    batteryAlert: boolean;
    updateAlert: boolean;
  };
  performance: {
    memoryLimit: number;
    energySaving: boolean;
    idleThreshold: number;
  };
}

/**
 * 스크린샷 정보 타입
 */
export interface Screenshot {
  name: string;
  path: string;
  timestamp: number;
  dataURL?: string;
  width?: number;
  height?: number;
}

/**
 * 메모리 사용량 정보 타입
 */
export interface MemoryUsage {
  lastCheck: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  percentUsed: number;
}

/**
 * 페이지네이션 요청 타입
 */
export interface PaginationRequest {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

/**
 * 사용자 타입
 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

/**
 * 권한 타입
 */
export type Permission = 
  | 'read:settings'
  | 'write:settings'
  | 'read:users'
  | 'write:users'
  | 'read:logs'
  | 'write:logs'
  | 'take:screenshot'
  | 'read:system'
  | 'write:system';

/**
 * 역할별 권한 매핑
 */
export const RolePermissions: Record<string, Permission[]> = {
  'admin': [
    'read:settings',
    'write:settings',
    'read:users',
    'write:users',
    'read:logs',
    'write:logs',
    'take:screenshot',
    'read:system',
    'write:system'
  ],
  'user': [
    'read:settings',
    'take:screenshot',
    'read:system'
  ]
};
