/**
 * 렌더러 프로세스 메모리 최적화 유틸리티
 * 브라우저 환경에서 메모리 사용량을 모니터링하고 관리하는 기능 제공
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../components/ToastContext';
import { MemoryUsageInfo } from '../../types/app-types';

// 메모리 최적화 설정 인터페이스
export interface MemoryOptimizerOptions {
  /** 메모리 사용량 임계치 (MB) */
  threshold?: number;
  /** 모니터링 간격 (ms) */
  checkInterval?: number;
  /** 경고 표시 여부 */
  showWarnings?: boolean;
  /** 자동 최적화 활성화 여부 */
  autoOptimize?: boolean;
  /** 디버그 로그 활성화 여부 */
  debug?: boolean;
}

/**
 * 사용 가능한 전체 메모리 용량 추정 (Chrome 환경)
 * @returns {number} 메모리 크기 (MB)
 */
export function estimateTotalMemory(): number {
  try {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      return Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
    }
    // 브라우저에서 메모리 정보를 지원하지 않을 경우 기본값
    return 2048; // 2GB를 기본값으로 가정
  } catch (error) {
    console.error('메모리 용량 추정 중 오류:', error);
    return 1024;
  }
}

/**
 * 현재 메모리 사용량 정보 얻기 (Chrome 환경)
 * @returns {MemoryUsageInfo | null} 메모리 사용량 정보
 */
export function getMemoryInfo(): MemoryUsageInfo | null {
  try {
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const heapUsed = memoryInfo.usedJSHeapSize;
      const heapTotal = memoryInfo.totalJSHeapSize;
      const heapUsedMB = Math.round(heapUsed / (1024 * 1024) * 10) / 10;
      
      return {
        heapUsed,
        heapTotal,
        heapUsedMB,
      };
    }
    return null;
  } catch (error) {
    console.error('메모리 정보 획득 중 오류:', error);
    return null;
  }
}

/**
 * 메모리 해제를 권장하는 함수
 * 실제 GC를 강제하지는 않지만, 힌트를 제공함
 */
export function suggestGarbageCollection(): void {
  try {
    // 대형 배열 생성 및 삭제로 GC 유도
    if (!window.gc) {
      const arr = [];
      for (let i = 0; i < 10; i++) {
        arr.push(new ArrayBuffer(1024 * 1024)); // 각 1MB
      }
      // 배열 참조 해제
      arr.length = 0;
    } else {
      // window.gc가 있는 경우 직접 호출
      window.gc();
    }
    
    // Electron IPC를 통한 GC 요청
    if (window.electronAPI) {
      window.electronAPI.requestGC && window.electronAPI.requestGC();
    }
  } catch (error) {
    console.warn('GC 제안 중 오류:', error);
  }
}

/**
 * 대형 객체 캐시 처리를 위한 WeakMap
 * 순환 참조 방지와 GC 허용을 위해 WeakMap 사용
 */
const objectCache = new WeakMap<object, boolean>();

/**
 * 객체를 약한 참조로 캐싱
 * @param key 객체 키 (참조형만 가능)
 * @param value 저장할 값
 */
export function weakCache<T extends object>(key: T, value: boolean = true): void {
  objectCache.set(key, value);
}

/**
 * 약한 참조 캐시에서 객체 확인
 * @param key 객체 키
 * @returns {boolean} 캐시 존재 여부
 */
export function hasWeakCache<T extends object>(key: T): boolean {
  return objectCache.has(key);
}

/**
 * 메모리 경고 표시를 위한 임계값 (기본값: 90% 사용)
 */
const DEFAULT_WARNING_THRESHOLD = 90; // %

/**
 * 현재 메모리 사용량 상태를 백분율로 계산
 * @returns {number} 사용 비율 (0-100%)
 */
export function getMemoryUsagePercentage(): number {
  try {
    const memInfo = getMemoryInfo();
    if (!memInfo) return 0;
    
    // jsHeapSizeLimit은 항상 사용 가능하지 않을 수 있으므로
    // totalJSHeapSize을 기준으로 계산
    return Math.round((memInfo.heapUsed / memInfo.heapTotal) * 100);
  } catch (error) {
    console.error('메모리 사용률 계산 중 오류:', error);
    return 0;
  }
}

/**
 * 메모리 최적화 수행 함수 (내부 구현)
 * 불필요한 캐시 정리, 대형 객체 참조 해제 등 수행
 * @param {boolean} aggressive 적극적 최적화 여부
 */
function internalOptimizeMemory(aggressive: boolean = false): void {
  try {
    // 1. 불필요한 DOM 참조 해제
    // 필요 없는 이벤트 리스너 제거 등
    
    // 2. GC 힌트 제공
    suggestGarbageCollection();
    
    // 3. Electron 메인 프로세스에 메모리 최적화 요청
    if (window.electronAPI && window.electronAPI.optimizeMemory) {
      window.electronAPI.optimizeMemory(aggressive);
    }
    
    // 4. 적극적 모드일 경우 추가 작업
    if (aggressive) {
      // 이미지 캐시 정리
      clearImageCache();
      
      // 로컬 스토리지의 불필요한 데이터 정리
      cleanLocalStorage();
    }
  } catch (error) {
    console.error('메모리 최적화 중 오류:', error);
  }
}

/**
 * 메모리 최적화 수행 함수
 * 불필요한 캐시 정리, 대형 객체 참조 해제 등 수행
 * @param {boolean} aggressive 적극적 최적화 여부
 */
export async function optimizeMemory(deepCleanup = false): Promise<boolean> {
  try {
    // 큰 객체와 캐시 정리
    clearLargeObjectsAndCaches();
    
    // DOM 요소 정리
    cleanupDOM();
    
    // 심층 정리 모드인 경우 추가 작업
    if (deepCleanup) {
      // 이미지 참조 해제
      unloadUnusedImages();
      
      // 사용하지 않는 이벤트 리스너 정리
      cleanupEventListeners();
    }
    
    // GC 요청
    await requestGC();
    
    // 백엔드에도 메모리 최적화 요청
    if (window.electronAPI && typeof window.electronAPI.optimizeMemory === 'function') {
      await window.electronAPI.optimizeMemory(deepCleanup);
    }
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return false;
  }
}

/**
 * 이미지 캐시 정리
 * 렌더러에 로드된 이미지 캐시를 효율적으로 관리
 */
function clearImageCache(): void {
  try {
    // 화면에 보이지 않는 이미지 선택
    const images = document.querySelectorAll('img:not([data-keep-cache="true"])');
    images.forEach(img => {
      if (!isElementInViewport(img)) {
        // HTMLImageElement로 타입 캐스팅하여 src 속성에 접근
        const imgElement = img as HTMLImageElement;
        const originalSrc = imgElement.src;
        if (originalSrc) {
          imgElement.setAttribute('data-original-src', originalSrc);
          imgElement.src = '';
          
          // 필요할 때 복원하기 위한 이벤트 리스너
          imgElement.addEventListener('error', () => {
            const savedSrc = imgElement.getAttribute('data-original-src');
            if (savedSrc) imgElement.src = savedSrc;
          }, { once: true });
        }
      }
    });
  } catch (error) {
    console.warn('이미지 캐시 정리 중 오류:', error);
  }
}

/**
 * LocalStorage 정리
 * 불필요하거나 오래된 데이터 정리
 */
function cleanLocalStorage(): void {
  try {
    // 임시 데이터 정리 (예: 'temp_' 로 시작하는 항목들)
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('temp_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('로컬 스토리지 정리 중 오류:', error);
  }
}

/**
 * 요소가 뷰포트 내에 있는지 확인
 * @param {Element} el 확인할 요소
 * @returns {boolean} 뷰포트 내 존재 여부
 */
function isElementInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 메모리 최적화 훅
 * React 컴포넌트에서 메모리 관리를 위한 커스텀 훅
 * @param {MemoryOptimizerOptions} options 메모리 최적화 옵션
 * @returns {Object} 메모리 정보 및 컨트롤 함수
 */
export function useMemoryOptimizer(options: MemoryOptimizerOptions = {}) {
  // 기본 옵션 설정
  const {
    threshold = 80, // 기본 임계치 80MB
    checkInterval = 30000, // 기본 체크 간격 30초
    showWarnings = true,
    autoOptimize = true,
    debug = false,
  } = options;
  
  const [memoryInfo, setMemoryInfo] = useState<MemoryUsageInfo | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  
  // 메모리 정보 갱신 함수
  const updateMemoryInfo = useCallback(() => {
    const info = getMemoryInfo();
    setMemoryInfo(info);
    
    // 임계치 초과 체크
    if (info && showWarnings && info.heapUsedMB > threshold) {
      if (debug) {
        console.warn(`메모리 사용량 경고: ${info.heapUsedMB}MB (임계치: ${threshold}MB)`);
      }
      
      // 토스트 메시지로 경고 표시
      showToast(`메모리 사용량이 높습니다: ${info.heapUsedMB}MB`, 'warning');
      
      // 자동 최적화가 활성화된 경우 메모리 정리 수행
      if (autoOptimize) {
        runMemoryOptimization();
      }
    }
    
    return info;
  }, [threshold, showWarnings, autoOptimize, debug, showToast]);
  
  // 메모리 최적화 실행 함수
  const runMemoryOptimization = useCallback(async () => {
    try {
      if (isOptimizing) return; // 이미 최적화 중이면 중복 실행 방지
      
      setIsOptimizing(true);
      
      // 메모리 최적화 실행
      internalOptimizeMemory(false);
      
      // GC 요청이 처리될 시간 제공
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 최적화 후 메모리 정보 갱신
      updateMemoryInfo();
      
      // 완료 알림 (디버그 모드일 때만)
      if (debug) {
        console.log('메모리 최적화 완료');
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug]);
  
  // 긴급 메모리 최적화 실행 함수
  const runEmergencyOptimization = useCallback(async () => {
    try {
      if (isOptimizing) return;
      
      setIsOptimizing(true);
      showToast('긴급 메모리 최적화를 실행합니다...', 'info');
      
      // 적극적인 메모리 최적화 실행
      internalOptimizeMemory(true);
      
      // GC 요청 후 충분한 처리 시간 제공
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 최적화 후 메모리 정보 갱신
      const newInfo = updateMemoryInfo();
      
      // 최적화 결과 알림
      if (debug && newInfo) {
        showToast(`메모리 최적화 완료: ${newInfo.heapUsedMB}MB`, 'success');
      }
    } catch (error) {
      console.error('긴급 메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug, showToast]);
  
  // 주기적 메모리 모니터링 설정
  useEffect(() => {
    // 초기 메모리 정보 확인
    updateMemoryInfo();
    
    // 주기적인 메모리 체크 시작
    intervalRef.current = setInterval(() => {
      updateMemoryInfo();
    }, checkInterval);
    
    // 페이지 가시성 변경 이벤트에 따른 처리
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 메모리 정보 갱신
        updateMemoryInfo();
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 클린업 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateMemoryInfo, checkInterval]);
  
  // 메인 프로세스로부터의 메모리 최적화 요청 처리
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Electron IPC 이벤트 리스너 설정 (메인 프로세스로부터의 GC 요청 처리)
    if (window.electronAPI && window.electronAPI.onRequestGC) {
      cleanup = window.electronAPI.onRequestGC((data: { emergency: boolean }) => {
        if (data.emergency) {
          runEmergencyOptimization();
        } else {
          runMemoryOptimization();
        }
        
        // 결과 알림
        if (window.electronAPI && window.electronAPI.rendererGCCompleted) {
          const info = getMemoryInfo();
          window.electronAPI.rendererGCCompleted({
            timestamp: Date.now(),
            success: true,
            memoryInfo: info,
          });
        }
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [runMemoryOptimization, runEmergencyOptimization]);
  
  return {
    memoryInfo,
    isOptimizing,
    updateMemoryInfo,
    optimizeMemory: runMemoryOptimization,
    emergencyOptimize: runEmergencyOptimization,
  };
}

// 전역 네임스페이스에 메서드 노출 (디버깅 및 콘솔 접근용)
if (typeof window !== 'undefined') {
  (window as any).__memoryOptimizer = {
    getMemoryInfo,
    optimizeMemory: internalOptimizeMemory,
    suggestGarbageCollection,
    getMemoryUsagePercentage,
    optimizeImageResources
  };
}

// 전역 인터페이스 확장 (window.gc 접근을 위한 타입 정의)
declare global {
  interface Window {
    gc?: () => void;
    // electronAPI 타입은 제거 (electron.d.ts에서 정의된 타입 사용)
  }
}

/**
 * 메모리 최적화 유틸리티
 * 
 * 프론트엔드(렌더러 프로세스)에서 메모리 사용량을 최적화하기 위한 
 * 유틸리티 함수들을 제공합니다.
 */

/**
 * 메모리 사용량 정보를 가져옵니다.
 * @returns Promise<MemoryInfo>
 */
export async function getMemoryUsage(): Promise<MemoryInfo> {
  try {
    // Electron API 사용 가능한 경우
    if (window.electronAPI && typeof window.electronAPI.getMemoryUsage === 'function') {
      return await window.electronAPI.getMemoryUsage();
    }
    
    // 일반 브라우저 환경에서는 performance API 사용
    if (window.performance && window.performance.memory) {
      const memory = (window.performance as any).memory;
      
      return {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
        heapUsedMB: Math.round(memory.usedJSHeapSize / (1024 * 1024) * 10) / 10,
        percentUsed: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    
    // 정보를 가져올 수 없는 경우 기본값 반환
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      unavailable: true
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      heapUsedMB: 0,
      percentUsed: 0,
      error: String(error)
    };
  }
}

/**
 * 수동으로 가비지 컬렉션을 요청합니다.
 * @param {boolean} emergency - 긴급 모드 여부
 * @returns Promise<GCResult>
 */
export async function requestGC(emergency = false): Promise<GCResult> {
  try {
    // 메모리 정보 수집 (GC 전)
    const memoryBefore = await getMemoryUsage();
    
    // Electron API를 통한 GC 요청
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      await window.electronAPI.requestGC();
    }
    
    // 브라우저 창 객체를 통한 메모리 힌트
    if (window.gc) {
      window.gc();
    }
    
    // 약간의 지연 후 메모리 정보 다시 수집 (GC 이후)
    await new Promise(resolve => setTimeout(resolve, 100));
    const memoryAfter = await getMemoryUsage();
    
    const freedMemory = memoryBefore.heapUsed - memoryAfter.heapUsed;
    const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
    
    return {
      success: true,
      memoryBefore,
      memoryAfter,
      freedMemory,
      freedMB,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('GC 요청 오류:', error);
    return {
      success: false,
      timestamp: Date.now(),
      error: String(error)
    };
  }
}

/**
 * 큰 객체와 캐시를 정리합니다.
 */
function clearLargeObjectsAndCaches(): void {
  try {
    // 로컬 스토리지의 임시 항목 정리
    if (window.localStorage) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // 모든 응용 프로그램 캐시 정리 시도
    if (window.caches) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('temp') || cacheName.includes('nonessential')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  } catch (error) {
    console.error('캐시 정리 오류:', error);
  }
}

/**
 * DOM 요소를 정리합니다.
 */
function cleanupDOM(): void {
  try {
    // 숨겨진 컨텐츠의 비표시 처리
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.innerHTML = '';
      }
    });
    
    // 임시 요소 제거
    const tempElements = document.querySelectorAll('.temp-element, .cached-view');
    tempElements.forEach(el => el.remove());
  } catch (error) {
    console.error('DOM 정리 오류:', error);
  }
}

/**
 * 사용하지 않는 이미지 참조를 해제합니다.
 */
function unloadUnusedImages(): void {
  try {
    // 화면에 보이지 않는 이미지 참조 해제
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      // 뷰포트 밖에 있거나 숨겨진 이미지
      if (rect.top < -1000 || rect.bottom > window.innerHeight + 1000 || 
          rect.left < -1000 || rect.right > window.innerWidth + 1000 ||
          img.style.display === 'none' || img.style.visibility === 'hidden') {
        
        // 원본 src 저장 후 비우기
        if (!img.dataset.originalSrc && img.src) {
          img.dataset.originalSrc = img.src;
          img.src = '';
        }
      } else if (img.dataset.originalSrc && !img.src) {
        // 다시 보이는 이미지는 복원
        img.src = img.dataset.originalSrc;
      }
    });
  } catch (error) {
    console.error('이미지 정리 오류:', error);
  }
}

/**
 * 사용하지 않는 이벤트 리스너를 정리합니다.
 * 주의: 이 기능은 직접 관리되는 리스너만 제거할 수 있습니다.
 */
function cleanupEventListeners(): void {
  // 앱에서 관리하는 이벤트 리스너 제거 로직
  // (이 부분은 애플리케이션의 이벤트 관리 방식에 따라 구현해야 함)
}

/**
 * 메모리 정보 인터페이스
 */
export interface MemoryInfo {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit?: number;
  heapUsedMB: number;
  percentUsed: number;
  unavailable?: boolean;
  error?: string;
}

/**
 * GC 결과 인터페이스
 */
export interface GCResult {
  success: boolean;
  timestamp: number;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
  freedMemory?: number;
  freedMB?: number;
  error?: string;
}

/**
 * 이미지 리소스를 최적화하여 메모리 사용량을 줄입니다.
 * @returns Promise<boolean>
 */
export async function optimizeImageResources(): Promise<boolean> {
  try {
    // 1. 화면에 보이지 않는 이미지 검색
    const images = document.querySelectorAll('img:not([data-optimized])');
    let optimizedCount = 0;
    
    for (const img of Array.from(images)) {
      const imgElement = img as HTMLImageElement;
      const rect = imgElement.getBoundingClientRect();
      
      // 화면에 보이지 않는 이미지이고 소스가 있는 경우
      if ((rect.top < -window.innerHeight || rect.bottom > window.innerHeight * 2 ||
           rect.left < -window.innerWidth || rect.right > window.innerWidth * 2) && 
          imgElement.src && !imgElement.src.startsWith('data:')) {
        
        // 원본 소스 저장
        const originalSrc = imgElement.src;
        imgElement.setAttribute('data-original-src', originalSrc);
        
        // 빈 이미지 또는 초소형 플레이스홀더로 대체
        imgElement.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        
        // 이미지가 다시 보이게 되면 복원하기 위한 Intersection Observer 설정
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const targetImg = entry.target as HTMLImageElement;
              const originalSrc = targetImg.getAttribute('data-original-src');
              
              if (originalSrc) {
                targetImg.src = originalSrc;
                targetImg.removeAttribute('data-original-src');
                targetImg.setAttribute('data-optimized', 'restored');
              }
              
              observer.disconnect();
            }
          });
        }, { rootMargin: '200px' }); // 뷰포트 주변 200px 영역까지 고려
        
        observer.observe(imgElement);
        imgElement.setAttribute('data-optimized', 'true');
        optimizedCount++;
      }
    }
    
    if (optimizedCount > 0) {
      console.log(`이미지 리소스 최적화 완료: ${optimizedCount}개 이미지 처리됨`);
    }
    
    // 2. 초대형 캔버스 및 SVG 요소 처리
    const heavyElements = document.querySelectorAll('canvas[width][height], svg[width][height]');
    heavyElements.forEach(element => {
      const width = parseInt(element.getAttribute('width') || '0');
      const height = parseInt(element.getAttribute('height') || '0');
      
      // 너무 큰 캔버스/SVG가 메모리를 많이 차지할 수 있음
      if (width * height > 1000000) { // 1M 픽셀 이상
        if (!element.hasAttribute('data-optimized')) {
          // 화면에 보이지 않을 때만 처리
          const rect = element.getBoundingClientRect();
          if (rect.top < -window.innerHeight || rect.bottom > window.innerHeight * 2) {
            element.setAttribute('data-optimized', 'hidden');
            // HTMLElement로 타입 캐스팅하여 style 속성에 접근
            const htmlElement = element as HTMLElement;
            htmlElement.setAttribute('data-original-display', htmlElement.style.display);
            htmlElement.style.display = 'none';
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('이미지 리소스 최적화 오류:', error);
    return false;
  }
}
