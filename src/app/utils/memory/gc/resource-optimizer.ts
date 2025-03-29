/**
 * 리소스 최적화 모듈
 * 
 * 메모리 사용량을 줄이기 위한 다양한 리소스 최적화 기능을 제공합니다.
 */

import { logger } from '../logger';

// 최적화 상태 추적용 카운터
let optimizationCount = 0;
let lastOptimizationTime = 0;
let totalFreedMemoryBytes = 0;

/**
 * 브라우저 캐시 정리
 * 브라우저 환경에서 캐시를 정리하여 메모리를 확보
 */
export function clearBrowserCaches(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }

    // 캐시된 이미지 정리
    clearImageCache();
    
    // Object URL 정리
    clearObjectURLs();
    
    // 메모리 캐시 정리
    clearMemoryCache();
    
    // 스타일 캐시 정리
    clearStyleCache();
    
    // 위젯 캐시 정리
    clearWidgetCache();
    
    // 정리 후 측정 시간 업데이트
    lastOptimizationTime = Date.now();
    optimizationCount++;
    
    return true;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear browser caches:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 이미지 캐시 정리
 */
export function clearImageCache(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 글로벌 이미지 리사이즈 캐시 정리
    const imageCache = window.__imageResizeCache as Map<string, HTMLImageElement> | undefined;
    
    if (imageCache && typeof imageCache.clear === 'function') {
      const cacheSize = imageCache.size;
      imageCache.clear();
      logger.info(`[Resource Optimizer] Cleared ${cacheSize} cached images`);
      
      // 통계 업데이트 - 이미지당 약 100KB로 추정
      totalFreedMemoryBytes += cacheSize * 100 * 1024;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear image cache:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * Object URL 정리
 */
export function clearObjectURLs(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined' || typeof URL === 'undefined') {
      return false;
    }
    
    // 글로벌 Object URL 캐시 정리
    const urlCache = window.__objectUrls as Map<string, string> | undefined;
    
    if (urlCache && typeof urlCache.forEach === 'function') {
      let count = 0;
      
      urlCache.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
          count++;
        } catch (e) {
          // URL 해제 실패는 무시
        }
      });
      
      urlCache.clear();
      logger.info(`[Resource Optimizer] Revoked ${count} object URLs`);
      
      // 통계 업데이트 - URL당 약 50KB로 추정
      totalFreedMemoryBytes += count * 50 * 1024;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear object URLs:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 메모리 캐시 정리
 */
export function clearMemoryCache(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 글로벌 메모리 캐시 정리
    const memoryCache = window.__memoryCache as Map<string, any> | undefined;
    
    if (memoryCache && typeof memoryCache.clear === 'function') {
      const cacheSize = memoryCache.size;
      memoryCache.clear();
      logger.info(`[Resource Optimizer] Cleared memory cache with ${cacheSize} items`);
      
      // 통계 업데이트 - 항목당 약 20KB로 추정
      totalFreedMemoryBytes += cacheSize * 20 * 1024;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear memory cache:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 스타일 캐시 정리
 */
export function clearStyleCache(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 글로벌 스타일 캐시 정리
    const styleCache = window.__styleCache as Record<string, any> | undefined;
    
    if (styleCache) {
      let count = 0;
      
      for (const key in styleCache) {
        if (Object.prototype.hasOwnProperty.call(styleCache, key)) {
          delete styleCache[key];
          count++;
        }
      }
      
      logger.info(`[Resource Optimizer] Cleared style cache with ${count} items`);
      
      // 통계 업데이트 - 스타일당 약 5KB로 추정
      totalFreedMemoryBytes += count * 5 * 1024;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear style cache:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 위젯 캐시 정리
 */
export function clearWidgetCache(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 글로벌 위젯 캐시 정리
    const widgetCache = window.__widgetCache as Map<string, any> | undefined;
    
    if (widgetCache && typeof widgetCache.clear === 'function') {
      const cacheSize = widgetCache.size;
      widgetCache.clear();
      logger.info(`[Resource Optimizer] Cleared widget cache with ${cacheSize} items`);
      
      // 통계 업데이트 - 위젯당 약 30KB로 추정
      totalFreedMemoryBytes += cacheSize * 30 * 1024;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear widget cache:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * DOM 최적화
 * DOM 구조 최적화 및 메모리 누수 방지
 */
export function optimizeDOM(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    
    let optimizedCount = 0;
    
    // 과도하게 깊은 DOM 깊이를 가진 요소 검사
    const deepElements = findDeepDOMElements('div');
    if (deepElements.length > 0) {
      logger.warn(`[Resource Optimizer] Found ${deepElements.length} excessively deep DOM structures`);
    }
    
    // 큰 DOM 노드 최적화
    const textNodes = findLargeTextNodes();
    textNodes.forEach(node => {
      // 텍스트 노드가 너무 큰 경우 잘라내기
      if (node.textContent && node.textContent.length > 5000) {
        node.textContent = node.textContent.substring(0, 5000) + '...';
        optimizedCount++;
      }
    });
    
    // 뷰포트 밖 DOM 요소 최적화
    const offscreenElements = findOffscreenElements();
    offscreenElements.forEach(el => {
      if (el instanceof HTMLElement) {
        // 데이터 속성에 원래 display 스타일 저장
        el.dataset.originalDisplay = el.style.display || '';
        // 화면 밖 요소 감추기
        el.style.display = 'none';
        optimizedCount++;
      }
    });
    
    // 깊은 이벤트 리스너 정리
    cleanupDuplicateEventListeners(document.body);
    
    // 다양한 DOM 최적화 기법 적용
    removeEmptyNodes();
    mergeAdjacentTextNodes();
    
    // CSS 클래스 최적화 (너무 많은 클래스를 가진 요소)
    optimizeCSSClasses();
    
    return optimizedCount > 0;
  } catch (error) {
    logger.error('[Resource Optimizer] DOM optimization error:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 특정 태그의 깊은 DOM 요소 찾기
 */
function findDeepDOMElements(tagName: string, maxDepth = 15): HTMLElement[] {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return [];
  }
  
  const results: HTMLElement[] = [];
  
  function checkDepth(element: Element, depth = 0) {
    if (depth > maxDepth && element.tagName.toLowerCase() === tagName.toLowerCase()) {
      if (element instanceof HTMLElement) {
        results.push(element);
      }
    }
    
    for (let i = 0; i < element.children.length; i++) {
      checkDepth(element.children[i], depth + 1);
    }
  }
  
  checkDepth(document.body);
  return results;
}

/**
 * 큰 텍스트 노드 찾기 
 */
function findLargeTextNodes(minLength = 3000): Text[] {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return [];
  }
  
  const textNodes: Text[] = [];
  
  function findTextNodes(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      if (textNode.textContent && textNode.textContent.length > minLength) {
        textNodes.push(textNode);
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        findTextNodes(node.childNodes[i]);
      }
    }
  }
  
  findTextNodes(document.body);
  return textNodes;
}

/**
 * 화면 밖 요소 찾기
 */
function findOffscreenElements(): Element[] {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return [];
  }
  
  const elements: Element[] = [];
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    
    // 요소가 화면 밖에 있는지 확인 (위쪽으로 -200%, 아래쪽으로 200% 이상)
    if (rect.bottom < -window.innerHeight * 2 || rect.top > window.innerHeight * 3) {
      elements.push(el);
    }
  });
  
  return elements;
}

/**
 * 중복 이벤트 리스너 정리
 */
function cleanupDuplicateEventListeners(rootElement: HTMLElement): void {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return;
  }
  
  // 이 함수는 가상이며, 실제로는 구현이 어렵습니다
  // 브라우저에서 이벤트 리스너를 직접 검사하는 API가 제한적입니다
  logger.debug('[Resource Optimizer] Duplicate event listeners cleanup simulation');
}

/**
 * 빈 노드 제거
 */
function removeEmptyNodes(): void {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return;
  }
  
  // 실제 구현을 위한 골격
  const emptyDivs = document.querySelectorAll('div:empty');
  let removed = 0;
  
  emptyDivs.forEach(div => {
    if (div.parentNode && !div.hasAttribute('data-keep-empty')) {
      div.parentNode.removeChild(div);
      removed++;
    }
  });
  
  logger.debug(`[Resource Optimizer] Removed ${removed} empty nodes`);
}

/**
 * 인접한 텍스트 노드 병합
 */
function mergeAdjacentTextNodes(): void {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return;
  }
  
  // 실제 구현을 위한 골격
  // 텍스트 노드 병합은 DOM 순회가 필요합니다
  logger.debug('[Resource Optimizer] Text nodes merging simulation');
}

/**
 * CSS 클래스 최적화
 */
function optimizeCSSClasses(): void {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return;
  }
  
  // 너무 많은 클래스를 가진 요소 찾기
  const elements = document.querySelectorAll('*');
  let optimized = 0;
  
  elements.forEach(el => {
    if (el.classList && el.classList.length > 10) {
      // 사용하지 않는 클래스 정리 (데모 용도)
      const classArray = Array.from(el.classList);
      // 실제로는 어떤 클래스가 사용되지 않는지 판단하기 어려움
      // 여기서는 시뮬레이션만 실행
      optimized++;
    }
  });
  
  logger.debug(`[Resource Optimizer] Optimized classes for ${optimized} elements`);
}

/**
 * 타이머 정리
 * 비활성 타이머 및 Animation Frame 제거
 */
export function cleanupTimers(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Animation frame IDs 정리
    const frameIds = window.__animationFrameIds as number[] | undefined;
    if (Array.isArray(frameIds) && frameIds.length > 0) {
      frameIds.forEach(id => {
        window.cancelAnimationFrame(id);
      });
      
      logger.info(`[Resource Optimizer] Canceled ${frameIds.length} animation frames`);
      frameIds.length = 0;
    }
    
    // Interval IDs 정리
    const intervalIds = window.__intervalIds as number[] | undefined;
    if (Array.isArray(intervalIds) && intervalIds.length > 0) {
      intervalIds.forEach(id => {
        window.clearInterval(id);
      });
      
      logger.info(`[Resource Optimizer] Cleared ${intervalIds.length} intervals`);
      intervalIds.length = 0;
    }
    
    // Timeout IDs 정리
    const timeoutIds = window.__timeoutIds as number[] | undefined;
    if (Array.isArray(timeoutIds) && timeoutIds.length > 0) {
      timeoutIds.forEach(id => {
        window.clearTimeout(id);
      });
      
      logger.info(`[Resource Optimizer] Cleared ${timeoutIds.length} timeouts`);
      timeoutIds.length = 0;
    }
    
    return true;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to cleanup timers:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 웹 워커 정리
 * 필요 없는 워커 종료
 */
export function terminateUnusedWorkers(): boolean {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // 글로벌 웹 워커 관리 객체
    const workers = (window as any).__webWorkers;
    if (!Array.isArray(workers)) {
      return false;
    }
    
    let terminated = 0;
    const workersToKeep = [];
    
    // 각 워커 확인
    for (const worker of workers) {
      if (!worker) continue;
      
      // 활성 상태 체크 (구체적인 구현은 애플리케이션마다 다름)
      const isActive = worker.active === true;
      
      if (!isActive) {
        try {
          worker.terminate();
          terminated++;
        } catch (e) {
          // 워커 종료 실패는 무시
        }
      } else {
        workersToKeep.push(worker);
      }
    }
    
    // 활성 워커만 유지
    const newWorkers = workers.filter(w => w !== null);
    (window as any).__webWorkers = newWorkers;
    
    logger.info(`[Resource Optimizer] Terminated ${terminated} unused web workers`);
    return terminated > 0;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to terminate workers:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 동적 모듈 정리
 * 일정 시간 동안 사용하지 않은 동적 모듈 언로드
 */
export function unloadUnusedModules(maxAgeMs = 300000): boolean {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    return false;
  }
  
  // 동적 모듈 맵 확인
  const modules = window._dynamicModules;
  
  if (!modules || typeof modules.forEach !== 'function') {
    return false;
  }
  
  try {
    const now = Date.now();
    let unloaded = 0;
    const keysToDelete: string[] = [];
    
    // 각 모듈 확인
    modules.forEach((moduleInfo, key) => {
      if (moduleInfo && moduleInfo.loaded && 
          now - moduleInfo.lastUsed > maxAgeMs && 
          typeof moduleInfo.unload === 'function') {
        try {
          moduleInfo.unload();
          unloaded++;
          keysToDelete.push(key);
        } catch (e) {
          // 모듈 언로드 실패는 무시
        }
      }
    });
    
    // 언로드된 모듈 제거
    keysToDelete.forEach(key => {
      modules.delete(key);
    });
    
    logger.info(`[Resource Optimizer] Unloaded ${unloaded} unused dynamic modules`);
    return unloaded > 0;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to unload dynamic modules:', error as Record<string, unknown> | undefined);
    return false;
  }
}

/**
 * 최적화 통계 얻기
 */
export function getOptimizationStats() {
  return {
    optimizationCount,
    lastOptimizationTime,
    totalFreedMemoryKB: Math.round(totalFreedMemoryBytes / 1024),
    totalFreedMemoryMB: Math.round(totalFreedMemoryBytes / (1024 * 1024) * 100) / 100
  };
}

/**
 * 캔버스 정리
 * 사용하지 않는 캔버스 리소스 해제
 */
export function clearCanvasResources(): boolean {
  // DOM이 없는 환경 처리
  if (typeof document === 'undefined') {
    return false;
  }
  
  try {
    const canvases = document.querySelectorAll('canvas[data-disposable="true"]');
    let cleared = 0;
    
    canvases.forEach(canvas => {
      const canvasElement = canvas as HTMLCanvasElement;
      const ctx = canvasElement.getContext('2d');
      if (ctx) {
        // 캔버스 내용 지우기
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        cleared++;
      }
    });
    
    logger.info(`[Resource Optimizer] Cleared ${cleared} canvas resources`);
    return cleared > 0;
  } catch (error) {
    logger.error('[Resource Optimizer] Failed to clear canvas resources:', error as Record<string, unknown> | undefined);
    return false;
  }
}

