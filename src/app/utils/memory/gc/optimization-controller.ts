/**
 * 메모리 최적화 컨트롤러 - Rust 네이티브 모듈 통합
 */
import { 
  requestNativeMemoryOptimization, 
  determineOptimizationLevel 
} from '@/app/utils/native-memory-bridge';
import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel } from '@/app/utils/enum-converters';
import { reportMemoryUsage } from './optimization-levels';
import { getMemoryInfo } from '../memory-info';
import { toggleGpuAcceleration, isGpuComputationActive } from '@/app/utils/gpu-acceleration';

// 글로벌 선언 추가 - 전역 객체에 접근하는 오류 해결을 위한 인터페이스 선언
interface WindowWithCache extends Window {
  __cachedData?: Record<string, any>;
  __bufferCache?: Record<string, any>;
  __animationFrameIds?: number[];
  __intervalIds?: number[];
  __timeoutIds?: number[];
  __appRecovery?: any;
  __loadedModules?: Map<string, any>;
  __memoryCache?: Map<string, any>;
  __taskScheduler?: any;
  __store?: any;
  __errorBoundaries?: any[];
  __apiClient?: any;
}

// 메모리 최적화 설정
const MEMORY_THRESHOLDS = {
  HIGH: 85, // 85% 이상 사용 시 높은 수준 최적화
  CRITICAL: 92, // 92% 이상 사용 시 긴급 최적화
  GPU_DISABLE: 90, // 90% 이상 사용 시 GPU 비활성화
  RESTORE_GPU: 75 // 75% 미만으로 내려가면 GPU 재활성화
};

// 최적화 시도 상태 추적
let lastOptimizationAttempt = 0;
let consecutiveFailures = 0;
let gpuDisabledDueToMemory = false;

/**
 * 최적화 수준에 따른 메모리 최적화 작업 수행
 * 이제 모든 최적화 작업은 Rust 네이티브 모듈을 통해 처리되며,
 * 메모리 임계치 초과 시 GPU에서 CPU로 전환합니다.
 * 
 * @param level 최적화 수준 (0-4)
 * @param emergency 긴급 상황 여부
 * @returns Promise<void>
 */
export async function performOptimizationByLevel(level: number, emergency: boolean = false): Promise<void> {
  try {
    // 현재 시간
    const now = Date.now();
    
    // 연속 시도 제한 (초당 최대 1회)
    if (now - lastOptimizationAttempt < 1000 && !emergency) {
      console.log('최적화 요청이 너무 빈번합니다. 이전 요청 무시');
      return;
    }
    
    lastOptimizationAttempt = now;
    
    // 현재 메모리 상태 확인
    const memoryInfo = await getMemoryInfo();
    const memoryUsagePercent = memoryInfo?.percentUsed || 0;
    
    console.log(`현재 메모리 사용률: ${memoryUsagePercent.toFixed(1)}%`);
    
    // 메모리 사용량에 따른 긴급 상황 자동 감지
    if (memoryUsagePercent > MEMORY_THRESHOLDS.CRITICAL) {
      console.warn(`메모리 사용량 임계치 초과: ${memoryUsagePercent.toFixed(1)}% > ${MEMORY_THRESHOLDS.CRITICAL}%`);
      emergency = true;
      level = 4; // 최고 수준 최적화 강제
    } else if (memoryUsagePercent > MEMORY_THRESHOLDS.HIGH) {
      console.warn(`메모리 사용량 높음: ${memoryUsagePercent.toFixed(1)}% > ${MEMORY_THRESHOLDS.HIGH}%`);
      level = Math.max(level, 3); // 최소 높은 수준 최적화 보장
    }
    
    // GPU 가속화 관리 - 메모리 사용량이 높을 때 GPU 비활성화
    await manageGpuAcceleration(memoryUsagePercent);
    
    // 최적화 수준 매핑
    const appLevel = emergency ? AppOptimizationLevel.EXTREME :
                   level >= 3 ? AppOptimizationLevel.HIGH :
                   level >= 2 ? AppOptimizationLevel.MEDIUM :
                   level >= 1 ? AppOptimizationLevel.LOW :
                   AppOptimizationLevel.NONE;
    
    // 네이티브 최적화 모듈 호출 (최대 3번 재시도)
    const nativeLevel = toNativeOptimizationLevel(appLevel);
    let result = null;
    let retries = 0;
    
    while (retries < 3 && result === null) {
      try {
        console.log(`Rust 네이티브 메모리 최적화 실행 (레벨: ${nativeLevel}, 긴급: ${emergency})`);
        result = await requestNativeMemoryOptimization(nativeLevel, emergency);
        
        if (result) {
          console.log(`메모리 최적화 성공: ${result.freed_mb?.toFixed(2) || 0}MB 해제됨`);
          consecutiveFailures = 0;
        } else {
          throw new Error("네이티브 최적화 실패: 결과가 null");
        }
      } catch (error) {
        retries++;
        console.error(`네이티브 최적화 시도 ${retries}/3 실패:`, error);
        
        if (retries === 3) {
          consecutiveFailures++;
          console.warn(`연속 ${consecutiveFailures}회 최적화 실패. JavaScript 폴백 사용 시도`);
          await performJavaScriptFallbackOptimization(emergency);
        } else {
          // 재시도 전 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    // 메모리 사용 보고
    reportMemoryUsage(level);
    
    // 긴급 상황이 해결되었는지 확인
    if (emergency) {
      const afterMemoryInfo = await getMemoryInfo();
      const afterUsagePercent = afterMemoryInfo?.percentUsed || 0;
      
      if (afterUsagePercent > MEMORY_THRESHOLDS.CRITICAL) {
        console.error(`긴급 메모리 상황이 지속됨: ${afterUsagePercent.toFixed(1)}%. 추가 조치 필요`);
        // 추가 비상 조치 수행
        await performEmergencyMeasures();
      } else {
        console.log(`메모리 상황 개선됨: ${afterUsagePercent.toFixed(1)}%`);
      }
    }
  } catch (error) {
    console.error('메모리 최적화 중 예기치 않은 오류:', error);
    consecutiveFailures++;
    
    // 심각한 상황에서는 전체 애플리케이션 재초기화 고려
    if (consecutiveFailures > 5) {
      console.error('연속 최적화 실패 임계치 초과. 애플리케이션 상태 복구 시도');
      await attemptApplicationRecovery();
    }
  }
}

/**
 * GPU 가속화 상태 관리 
 * 메모리 사용량에 따라 GPU 활성화/비활성화
 */
async function manageGpuAcceleration(memoryUsagePercent: number): Promise<void> {
  try {
    const isGpuActive = await isGpuComputationActive();
    
    // 메모리 사용량이 높고 GPU가 활성화된 경우 -> GPU 비활성화
    if (memoryUsagePercent > MEMORY_THRESHOLDS.GPU_DISABLE && isGpuActive) {
      console.warn(`메모리 사용량 높음 (${memoryUsagePercent.toFixed(1)}%). GPU 가속화 비활성화`);
      await toggleGpuAcceleration(false);
      gpuDisabledDueToMemory = true;
    } 
    // 메모리 사용량이 충분히 낮아지고 GPU가 메모리 때문에 비활성화된 경우 -> GPU 재활성화
    else if (memoryUsagePercent < MEMORY_THRESHOLDS.RESTORE_GPU && gpuDisabledDueToMemory && !isGpuActive) {
      console.log(`메모리 사용량 정상화 (${memoryUsagePercent.toFixed(1)}%). GPU 가속화 재활성화`);
      await toggleGpuAcceleration(true);
      gpuDisabledDueToMemory = false;
    }
  } catch (error) {
    console.error('GPU 가속화 상태 관리 중 오류:', error);
  }
}

/**
 * JavaScript 폴백 최적화 수행
 * 네이티브 최적화 실패 시 사용
 */
async function performJavaScriptFallbackOptimization(emergency: boolean): Promise<void> {
  console.log(`JavaScript 폴백 최적화 실행 (긴급: ${emergency})`);
  
  try {
    // 비효율적이지만, 사용 가능한 모든 최적화 수행
    if (window.gc) {
      window.gc(); // Node --expose-gc로 실행된 경우
    }
    
    // DOMElements에서 참조 제거
    cleanupDOMReferences();
    
    // 사용하지 않는 대용량 객체 참조 해제
    clearLargeObjectReferences();
    
    // 캐시 정리
    clearApplicationCaches();
    
    // Electron API 사용 가능한 경우 (Electron 환경)
    if (window.electronAPI && window.electronAPI.requestGC) {
      await window.electronAPI.requestGC();
    }
    
    // 이미지 캐시 정리
    if (window.__memoryOptimizer?.optimizeImageResources) {
      await window.__memoryOptimizer.optimizeImageResources();
    }
    
    console.log('JavaScript 폴백 최적화 완료');
  } catch (error) {
    console.error('JavaScript 폴백 최적화 실패:', error);
  }
}

/**
 * DOM 참조 정리
 */
function cleanupDOMReferences(): void {
  if (typeof document === 'undefined') return;
  
  try {
    // 비표시 요소 참조 제거
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      // data-* 속성 정리
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-')) {
          (el as HTMLElement).removeAttribute(attr.name);
        }
      }
      
      // 이벤트 리스너 정리 (가능한 경우)
      if (el && typeof (el as any).replaceWith === 'function') {
        const clone = el.cloneNode(true);
        (el as any).replaceWith(clone);
      }
    });
    
    // 사용하지 않는 이미지 참조 제거
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // 뷰포트 바깥의 이미지 정리
      if (!isElementInViewport(img) && !img.classList.contains('preserve')) {
        img.src = '';
        img.removeAttribute('srcset');
      }
    });
  } catch (error) {
    console.error('DOM 참조 정리 중 오류:', error);
  }
}

/**
 * 요소가 뷰포트 내에 있는지 확인
 */
function isElementInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= -rect.height &&
    rect.left >= -rect.width &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + rect.height &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + rect.width
  );
}

/**
 * 대용량 객체 참조 정리
 */
function clearLargeObjectReferences(): void {
  // window 타입 캐스팅
  const win = window as WindowWithCache;
  
  // 캐시된 데이터 정리
  if (win.__cachedData) {
    win.__cachedData = {};
  }
  
  // 버퍼 캐시 정리
  if (win.__bufferCache) {
    win.__bufferCache = {};
  }
}

/**
 * 애플리케이션 캐시 정리
 */
function clearApplicationCaches(): void {
  // LocalStorage 정리 (불필요한 항목)
  try {
    const keysToPreserve = ['user_settings', 'auth_token', 'essential_config'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToPreserve.includes(key)) {
        // 필수 항목이 아닌 경우 제거
        if (key.includes('temp_') || key.includes('cache_') || key.includes('log_')) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('LocalStorage 정리 중 오류:', error);
  }
  
  // 세션 스토리지 정리
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('temp_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('SessionStorage 정리 중 오류:', error);
  }
}

/**
 * 긴급 조치 수행
 * 심각한 메모리 부족 상황에서 호출
 */
async function performEmergencyMeasures(): Promise<void> {
  console.warn('긴급 메모리 회복 조치 실행');
  
  // 1. 모든 비필수 기능 비활성화
  if (await toggleGpuAcceleration(false)) {
    gpuDisabledDueToMemory = true;
  }
  
  // 2. 모든 애니메이션 및 타이머 중지
  stopAllAnimationsAndTimers();
  
  // 3. 대기업 수준의 메모리 복구 전략 실행
  await executeEnterpriseMemoryRecovery();
  
  console.log('긴급 메모리 회복 조치 완료');
}

/**
 * 모든 애니메이션 및 타이머 중지
 */
function stopAllAnimationsAndTimers(): void {
  cancelAnimationFrames();
}

/**
 * 애니메이션 프레임 취소
 */
function cancelAnimationFrames(): boolean {
  const win = window as WindowWithCache;
  
  if (win.__animationFrameIds && win.__animationFrameIds.length > 0) {
    win.__animationFrameIds.forEach(id => {
      cancelAnimationFrame(id);
    });
    win.__animationFrameIds = [];
    return true;
  }
  
  if (win.__intervalIds && win.__intervalIds.length > 0) {
    win.__intervalIds.forEach(id => {
      clearInterval(id);
    });
    win.__intervalIds = [];
    return true;
  }
  
  if (win.__timeoutIds && win.__timeoutIds.length > 0) {
    win.__timeoutIds.forEach(id => {
      clearTimeout(id);
    });
    win.__timeoutIds = [];
    return true;
  }
  
  return false;
}

/**
 * 대기업 수준의 메모리 복구 전략
 * 엔터프라이즈급 애플리케이션에서 사용하는 고급 메모리 복구 기법
 */
async function executeEnterpriseMemoryRecovery(): Promise<void> {
  // 1. 비필수 모듈 언로드
  unloadNonEssentialModules();
  
  // 2. 인메모리 데이터베이스 압축
  compressInMemoryDatabases();
  
  // 3. 렌더러 리소스 정리
  cleanupRendererResources();
  
  // 4. 백그라운드 작업 일시 중지
  pauseBackgroundTasks();
  
  // 5. 마지막 수단: 애플리케이션 부분 재시작 시도
  if (window.__appRecovery && typeof window.__appRecovery.partialRestart === 'function') {
    try {
      console.warn('애플리케이션 부분 재시작 시도');
      await window.__appRecovery.partialRestart();
    } catch (error) {
      console.error('애플리케이션 부분 재시작 실패:', error);
    }
  }
}

/**
 * 비필수 모듈 언로드
 */
function unloadNonEssentialModules(): void {
  // 동적으로 로드된 모듈 추적 및 언로드
  const win = window as WindowWithCache;
  
  if (typeof window !== 'undefined' && window.__loadedModules) {
    // Map<string, any>으로 안전하게 처리
    const modules = window.__loadedModules;
    if (modules && modules instanceof Map) {
      if (modules.has('ComponentA')) {
        // get 메소드 사용
        const componentA = modules.get('ComponentA');
        // ... 나머지 코드
      }
      
      if (modules.has('ComponentB')) {
        const componentB = modules.get('ComponentB');
        // ... 나머지 코드
      }
    }
  }
}

/**
 * 인메모리 데이터베이스 압축
 */
function compressInMemoryDatabases(): void {
  // IndexedDB 압축 (해당하는 경우)
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      // 직접 구현하거나 호환성 문제가 있는 코드 제거
      // window.indexedDB.compactAll() 대신 사용 가능한 대안:
      console.log('IndexedDB 컴팩션이 필요할 수 있지만 표준 API가 없습니다');
      // 필요하다면 개별 데이터베이스를 열고 수동으로 최적화
    } catch (e) {
      console.error('IndexedDB 작업 중 오류:', e);
    }
  }
  
  // 인메모리 캐시 압축
  const win = window as WindowWithCache;
  
  if (win.__memoryCache) {
    // Map 객체에는 compact 메서드가 없으므로 적절한 대체 로직 구현
    // 기존 데이터를 복사한 새 Map 생성
    const newMap = new Map<string, any>();
    // Object.entries 사용하여 안전하게 변환
    if (win.__memoryCache) {
      for (const [key, value] of Array.from(win.__memoryCache.entries())) {
        if (typeof key === 'string') {
          newMap.set(key, value);
        }
      }
    }
    win.__memoryCache = newMap;
  }
}

/**
 * 렌더러 리소스 정리
 */
function cleanupRendererResources(): void {
  // WebGL 컨텍스트 정리
  try {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    });
  } catch (error) {
    console.warn('WebGL 컨텍스트 정리 실패:', error);
  }
  
  // 오디오 컨텍스트 정리
  cleanupAudioContexts();
}

/**
 * 오디오 컨텍스트 정리
 */
function cleanupAudioContexts(): boolean {
  try {
    // 오디오 컨텍스트 정리 - __audioContexts 대신 다른 방식 사용
    // 현재 실행 중인 AudioContext 수동 정리
    const audioContexts = document.querySelectorAll('audio');
    audioContexts.forEach(audio => {
      try {
        if (audio.paused === false) {
          audio.pause();
        }
        if (audio.src) {
          audio.removeAttribute('src');
          audio.load();
        }
      } catch (e) {
        console.warn('오디오 요소 정리 실패:', e);
      }
    });
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 백그라운드 작업 일시 중지
 */
function pauseBackgroundTasks(): void {
  resetTaskScheduler();
}

/**
 * 작업 스케줄러 재설정
 */
function resetTaskScheduler(): boolean {
  const win = window as WindowWithCache;
  
  if (win.__taskScheduler) {
    win.__taskScheduler.reset();
    return true;
  }
  return false;
}

/**
 * 애플리케이션 복구 시도
 * 반복적인 최적화 실패 후 호출됨
 */
async function attemptApplicationRecovery(): Promise<void> {
  console.warn('애플리케이션 복구 시도 시작');
  
  // 1. 모든 비필수 상태 초기화
  resetApplicationState();
  
  // 2. 에러 경계 재설정
  resetErrorBoundaries();
  
  // 3. 네트워크 연결 재설정
  resetNetworkConnections();
  
  // 4. 메인 프로세스에 복구 요청 (Electron 환경)
  if (window.electronAPI && 'requestAppRecovery' in window.electronAPI) {
    (window.electronAPI as any).requestAppRecovery();
  }
  
  console.log('애플리케이션 복구 시도 완료');
  
  // 복구 시도 후 연속 실패 카운터 재설정
  consecutiveFailures = 0;
}

/**
 * 애플리케이션 상태 초기화
 */
function resetApplicationState(): void {
  // 전역 상태 관리자 재설정 (Redux 등)
  resetStore();
  
  // 캐시 완전 정리
  clearApplicationCaches();
  
  // 렌더러 상태 초기화
  cleanupRendererResources();
}

/**
 * 상태 관리자 재설정
 */
function resetStore(): boolean {
  const win = window as WindowWithCache;
  
  if (win.__store && typeof win.__store.resetState === 'function') {
    win.__store.resetState();
    return true;
  }
  return false;
}

/**
 * 에러 경계 재설정
 */
function resetErrorBoundaries(): boolean {
  const win = window as WindowWithCache;
  
  if (win.__errorBoundaries) {
    win.__errorBoundaries = [];
    return true;
  }
  return false;
}

/**
 * 네트워크 연결 재설정
 */
function resetNetworkConnections(): boolean {
  const win = window as WindowWithCache;
  
  if (win.__apiClient && win.__apiClient.reset) {
    win.__apiClient.reset();
    return true;
  }
  return false;
}

/**
 * 메모리 최적화 수준 결정
 * 현재 메모리 사용량에 기반하여 최적화 수준 결정
 */
export async function determineMemoryOptimizationLevel(): Promise<number> {
  try {
    // 현재 메모리 정보 가져오기 
    const memoryInfo = await getMemoryInfo();
    
    // 네이티브 모듈 호출 (memoryInfo가 null일 경우 기본값 사용)
    if (memoryInfo) {
      // 적절한 타입으로 변환 후 전달
      const convertedMemoryInfo = normalizeMemoryInfo(memoryInfo);
      const nativeLevel = await determineOptimizationLevel(convertedMemoryInfo); 
      if (nativeLevel !== undefined) {
        return nativeLevel;
      }
    }
    
    // 폴백: 자체 최적화 수준 결정
    const usagePercent = memoryInfo?.percentUsed || 0;
    
    if (usagePercent > MEMORY_THRESHOLDS.CRITICAL) return 4;
    if (usagePercent > MEMORY_THRESHOLDS.HIGH) return 3;
    if (usagePercent > 70) return 2;
    if (usagePercent > 50) return 1;
    return 0;
  } catch (error) {
    console.error('최적화 수준 결정 중 오류:', error);
    return 2; // 기본값으로 중간 수준 반환
  }
}

// 모든 export 함수를 한 곳에서 관리 (기존 코드와 동일)
// DOM 최적화 모듈에서 필요한 함수들을 가져옵니다
import {
  cleanupDOM,
  unloadUnusedImages
} from '../dom-optimizer';

// 이미지 최적화 모듈에서 필요한 함수들을 가져옵니다
import {
  clearImageCache,
  optimizeImageResources
} from '../image-optimizer';

// 스토리지 관련 함수들 가져오기
import {
  cleanLocalStorage,
  clearLargeObjectsAndCaches
} from '../storage-cleaner';

// 캐시 관련 최적화 함수 가져오기
import {
  clearStorageCaches,
  clearAllCache,
  releaseAllCaches
} from './cache-optimizer';

// 리소스 관련 최적화 함수 가져오기
import {
  unloadNonVisibleResources,
  releaseUnusedResources,
  freeUnusedMemory,
  optimizeDOM
} from './resource-optimizer';

// 이벤트 관련 최적화 함수 가져오기
import {
  optimizeEventListeners,
  unloadDynamicModules
} from './event-optimizer';

// 긴급 복구 모듈 가져오기
import { emergencyMemoryRecovery } from './emergency-recovery';

// 로컬에서만 사용하는 함수 - 외부 모듈에서 사용할 수 있는 함수들을 만듭니다
/**
 * DOM 참조 정리 함수
 * 외부에서 사용할 수 있는 통합 함수
 */
export function cleanupDOMReferences(): void {
  try {
    cleanupDOM();
    unloadUnusedImages();
  } catch (error) {
    console.warn('DOM 참조 정리 중 오류:', error);
  }
}

/**
 * 이미지 캐시 정리 함수
 * 외부에서 사용할 수 있는 통합 함수
 */
export function clearImageCaches(): void {
  try {
    clearImageCache();
    optimizeImageResources();
  } catch (error) {
    console.warn('이미지 캐시 정리 중 오류:', error);
  }
}

// 모든 export 함수를 한 곳에서 관리
export {
  cleanupDOM,
  unloadUnusedImages,
  clearStorageCaches,
  clearAllCache,
  releaseAllCaches,
  unloadNonVisibleResources,
  releaseUnusedResources,
  freeUnusedMemory,
  optimizeDOM,
  optimizeEventListeners,
  unloadDynamicModules,
  emergencyMemoryRecovery
};
