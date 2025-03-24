/**
 * 메모리 최적화 설정 관리
 * 
 * 사용자 지정 메모리 최적화 설정을 관리하고 저장합니다.
 * 네이티브 모듈과 JavaScript 구현 간의 선택 및 자동 폴백 옵션을 제공합니다.
 */

// 메모리 최적화 기본 설정 인터페이스
export interface MemorySettings {
  // 구현 선택 옵션
  preferNativeImplementation: boolean;  // 네이티브 구현 선호
  enableAutomaticFallback: boolean;     // 자동 폴백 활성화
  fallbackRetryDelay: number;           // 폴백 후 재시도 간격 (ms)
  
  // 자동 최적화 설정
  enableAutomaticOptimization: boolean; // 자동 최적화 활성화
  optimizationThreshold: number;        // 최적화 임계값 (MB)
  optimizationInterval: number;         // 최적화 체크 간격 (ms)
  
  // 고급 설정
  aggressiveGC: boolean;                // 적극적 GC 사용
  enableLogging: boolean;               // 상세 로깅 활성화
  enablePerformanceMetrics: boolean;    // 성능 측정 활성화
  
  // 메모리 풀 설정
  useMemoryPool: boolean;               // 메모리 풀 사용
  poolCleanupInterval: number;          // 풀 정리 간격 (ms)
  
  // 컴포넌트 특정 최적화
  componentSpecificSettings: {
    [componentId: string]: {
      optimizeOnUnmount: boolean;       // 언마운트 시 최적화
      aggressiveCleanup: boolean;       // 적극적 정리
    }
  };
}

// 기본 설정 값
const DEFAULT_SETTINGS: MemorySettings = {
  preferNativeImplementation: true,
  enableAutomaticFallback: true,
  fallbackRetryDelay: 300000, // 5분
  
  enableAutomaticOptimization: true,
  optimizationThreshold: 100, // 100MB
  optimizationInterval: 60000, // 1분
  
  aggressiveGC: false,
  enableLogging: true,
  enablePerformanceMetrics: true,
  
  useMemoryPool: true,
  poolCleanupInterval: 300000, // 5분
  
  componentSpecificSettings: {}
};

// 로컬 스토리지 키
const STORAGE_KEY = 'typingStatsMemorySettings';

/**
 * 현재 메모리 설정 로드
 * @returns MemorySettings 현재 설정
 */
export function loadMemorySettings(): MemorySettings {
  try {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (!storedSettings) {
      return DEFAULT_SETTINGS;
    }
    
    // 저장된 설정과 기본 설정 병합
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(storedSettings)
    };
  } catch (error) {
    console.error('메모리 설정 로드 오류:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 메모리 설정 저장
 * @param settings 저장할 설정
 */
export function saveMemorySettings(settings: MemorySettings): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('메모리 설정 저장 오류:', error);
  }
}

/**
 * 특정 컴포넌트의 메모리 설정 업데이트
 * @param componentId 컴포넌트 ID
 * @param componentSettings 컴포넌트 설정
 */
export function updateComponentSettings(
  componentId: string,
  componentSettings: {
    optimizeOnUnmount: boolean;
    aggressiveCleanup: boolean;
  }
): void {
  const settings = loadMemorySettings();
  
  settings.componentSpecificSettings = {
    ...settings.componentSpecificSettings,
    [componentId]: componentSettings
  };
  
  saveMemorySettings(settings);
}

/**
 * 특정 컴포넌트의 메모리 설정 가져오기
 * @param componentId 컴포넌트 ID
 * @returns 컴포넌트 설정
 */
export function getComponentSettings(
  componentId: string
): {
  optimizeOnUnmount: boolean;
  aggressiveCleanup: boolean;
} {
  const settings = loadMemorySettings();
  return settings.componentSpecificSettings[componentId] || {
    optimizeOnUnmount: true,
    aggressiveCleanup: false
  };
}

/**
 * 메모리 설정을 기본값으로 재설정
 */
export function resetMemorySettings(): void {
  saveMemorySettings(DEFAULT_SETTINGS);
}
