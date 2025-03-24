/**
 * 긴급 메모리 복구 모듈
 */
import { getMemoryInfo } from '../memory-info';
import { toggleGpuAcceleration } from '@/app/utils/gpu-acceleration';
import { logMemoryUsage, MemoryEventType } from '../logger';
import { OptimizationResult } from '@/types';
import { normalizeMemoryInfo } from '../format-utils';

// Window 확장 인터페이스 정의 추가
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
  gc?: () => void;
}

/**
 * 긴급 메모리 복구 수행
 * 
 * 애플리케이션이 매우 높은 메모리 사용량을 보일 때 호출됩니다.
 * 가장 적극적인 메모리 최적화를 수행하고 비필수적인 기능을 일시적으로 비활성화합니다.
 * 
 * @returns Promise<OptimizationResult> 긴급 복구 결과
 */
export async function emergencyMemoryRecovery(): Promise<OptimizationResult> {
  try {
    // 긴급 복구 로그 기록
    await logMemoryUsage(
      MemoryEventType.OPTIMIZATION,
      '긴급 메모리 복구 수행 시작'
    );
    
    const memoryBefore = await getMemoryInfo();
    
    if (!memoryBefore) {
      throw new Error('메모리 정보를 가져올 수 없습니다');
    }
    
    // 1. GPU 가속화 비활성화
    try {
      await toggleGpuAcceleration(false);
      console.log('GPU 가속화 비활성화 완료');
    } catch (error) {
      console.error('GPU 가속화 비활성화 오류:', error);
    }
    
    // 2. 모든 애니메이션 프레임 및 타이머 취소
    cancelAllTimers();
    
    // 3. 캐시 및 버퍼 정리
    clearAllCaches();
    
    // 4. WebGL 컨텍스트 정리
    releaseWebGLContexts();
    
    // 5. 강제 가비지 컬렉션 요청 (가능한 경우)
    await forceGarbageCollection();
    
    // 6. 대용량 객체 해제
    releaseLargeObjectReferences();
    
    // 복구 후 메모리 정보 가져오기
    await new Promise(resolve => setTimeout(resolve, 500));
    const memoryAfter = await getMemoryInfo();
    
    if (!memoryAfter) {
      throw new Error('복구 후 메모리 정보를 가져올 수 없습니다');
    }
    
    // 해제된 메모리 계산
    const freedMemory = Math.max(0, memoryBefore.heapUsed - memoryAfter.heapUsed);
    const freedMB = freedMemory / (1024 * 1024);
    
    console.log(`긴급 메모리 복구 완료: ${freedMB.toFixed(2)}MB 해제됨`);
    
    // 메모리 복구 성공 로그
    await logMemoryUsage(
      MemoryEventType.OPTIMIZATION,
      `긴급 메모리 복구 완료: ${freedMB.toFixed(2)}MB 해제됨`
    );
    
    // 표준화된 결과 반환
    const normalizedBefore = normalizeMemoryInfo(memoryBefore);
    const normalizedAfter = normalizeMemoryInfo(memoryAfter);
    
    // 최적화 결과 반환 - null 값을 제거하고 undefined로 변경
    return {
      success: true,
      optimization_level: 4, // 최고 수준
      memory_before: normalizedBefore,
      memory_after: normalizedAfter,
      freed_memory: freedMemory,
      freed_mb: freedMB,
      duration: 500, // 복구에 약 500ms 소요
      timestamp: Date.now(),
      error: undefined // null이 아닌 undefined 사용
    };
  } catch (error) {
    console.error('긴급 메모리 복구 실패:', error);
    return {
      success: false,
      optimization_level: 4,
      memory_before: undefined, // null이 아닌 undefined 사용
      memory_after: undefined,  // null이 아닌 undefined 사용
      freed_memory: 0,
      freed_mb: 0,
      duration: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 모든 타이머 취소
 */
function cancelAllTimers(): void {
  const win = window as WindowWithCache;
  
  // 애니메이션 프레임 취소
  if (win.__animationFrameIds && Array.isArray(win.__animationFrameIds)) {
    win.__animationFrameIds.forEach((id: number) => {
      cancelAnimationFrame(id);
    });
    win.__animationFrameIds = [];
  }
  
  // 인터벌 취소
  if (win.__intervalIds && Array.isArray(win.__intervalIds)) {
    win.__intervalIds.forEach((id: number) => {
      clearInterval(id);
    });
    win.__intervalIds = [];
  }
  
  // 타임아웃 취소
  if (win.__timeoutIds && Array.isArray(win.__timeoutIds)) {
    win.__timeoutIds.forEach((id: number) => {
      clearTimeout(id);
    });
    win.__timeoutIds = [];
  }
}

/**
 * 모든 캐시 정리
 */
function clearAllCaches(): void {
  const win = window as WindowWithCache;
  
  // 필요한 경우 캐시 초기화
  if (win.__cachedData) {
    win.__cachedData = {};
  }
  
  // 버퍼 캐시 정리
  if (win.__bufferCache) {
    win.__bufferCache = {};
  }
  
  // MemoryCache 정리
  if (win.__memoryCache instanceof Map) {
    win.__memoryCache.clear();
  }
  
  // 애플리케이션 캐시 스토리지 정리 (가능한 경우)
  if ('caches' in window) {
    try {
      // Service Worker 캐시 API (비동기 작업이지만 오류 없이 진행)
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('temp-cache') || cacheName.includes('non-essential')) {
            caches.delete(cacheName).catch(() => {});
          }
        });
      }).catch(() => {});
    } catch (e) {
      // 무시
    }
  }
}

/**
 * WebGL 컨텍스트 정리
 */
function releaseWebGLContexts(): void {
  const win = window as WindowWithCache;
  
  // WebGL 컨텍스트 정리
  try {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      try {
        const gl = (canvas as HTMLCanvasElement).getContext('webgl') || 
                 (canvas as HTMLCanvasElement).getContext('webgl2');
        
        if (gl) {
          const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
          if (ext) {
            ext.loseContext();
          }
        }
      } catch (e) {
        // 무시
      }
    });
  } catch (e) {
    // 무시
  }
}

/**
 * 강제 가비지 컬렉션 요청
 */
async function forceGarbageCollection(): Promise<void> {
  // 전역 GC 함수가 있는 경우 (Node.js --expose-gc)
  if (typeof window !== 'undefined' && 'gc' in window && typeof window.gc === 'function') {
    try {
      (window as WindowWithCache).gc?.();
    } catch (e) {
      // 무시
    }
  }
  
  // 대용량 배열 생성/해제로 GC 유도
  try {
    const largeArray = new Array(1000000).fill(0);
    for (let i = 0; i < 10; i++) {
      largeArray.push(new Array(100000).fill(0));
    }
    // 참조 삭제
    // @ts-ignore
    largeArray = null;
  } catch (e) {
    // 무시
  }
  
  // GC 작업 시간 제공
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * 대용량 객체 참조 해제
 */
function releaseLargeObjectReferences(): void {
  clearDOMReferences();
  cleanupAudioContexts();
  releaseOffscreenImages();
}

/**
 * DOM 참조 정리
 */
function clearDOMReferences(): void {
  try {
    // 비표시 DOM 요소 참조 제거
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    
    hiddenElements.forEach(el => {
      // 자식 요소 제거
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
      
      // 속성 정리
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  } catch (e) {
    // 무시
  }
}

/**
 * 오디오 컨텍스트 정리
 */
function cleanupAudioContexts(): boolean {
  try {
    // 오디오 요소 정리
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      try {
        const audioElement = audio as HTMLAudioElement;
        if (!audioElement.paused) {
          audioElement.pause();
        }
        if (audioElement.src) {
          audioElement.src = '';
          audioElement.load();
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
 * 화면 밖 이미지 리소스 해제
 */
function releaseOffscreenImages(): boolean {
  try {
    const images = document.querySelectorAll('img');
    let count = 0;
    
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      // 뷰포트 밖에 있는 이미지
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        const imgElement = img as HTMLImageElement;
        if (imgElement.src && !imgElement.src.startsWith('data:')) {
          // 원본 src 저장 후 제거
          imgElement.setAttribute('data-original-src', imgElement.src);
          imgElement.src = '';
          count++;
        }
      }
    });
    
    return count > 0;
  } catch (e) {
    return false;
  }
}

export default emergencyMemoryRecovery;
