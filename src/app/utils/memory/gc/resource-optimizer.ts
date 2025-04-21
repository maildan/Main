/**
 * 리소스 최적화 유틸리티
 * 메모리를 많이 사용하는 리소스들을 최적화하고 해제하는 함수들을 제공합니다.
 */

// WindowWithResources 자체 인터페이스 사용으로 외부 의존성 제거

// 윈도우에 확장 속성을 정의하는 인터페이스
interface WindowWithResources {
  __objectUrls?: Map<string, string>;
  __widgetCache?: Record<string, any>;
  __styleCache?: Record<string, any>;
  __imageResizeCache?: Record<string, any>; // Map이 아닌 Record로 통일
  __textureCache?: Map<string, string>;
  __objectCache?: Map<string, any>;
  __memoryCache?: Map<string, any>;
  __bufferCache?: Record<string, any>;
  _dynamicModules?: Map<string, any>;
  gc?: () => void;
}

/**
 * 화면에 보이지 않는 리소스 언로드
 * 뷰포트 밖에 있는 이미지, 비디오 등의 리소스 메모리 해제
 */
export function unloadNonVisibleResources(): boolean {
  try {
    // 화면에 보이지 않는 이미지 리소스 언로드
    const images = document.querySelectorAll('img:not([data-keep-loaded="true"])');
    let count = 0;

    images.forEach(img => {
      if (!isElementInViewport(img)) {
        // 원본 src 저장
        const imgElement = img as HTMLImageElement;
        const originalSrc = imgElement.getAttribute('src');
        if (originalSrc && originalSrc !== '') {
          // 데이터 속성에 원본 src 저장
          imgElement.setAttribute('data-original-src', originalSrc);
          // src 속성 비우기
          imgElement.src = '';
          count++;
        }
      }
    });

    // 화면에 보이지 않는 비디오 일시 중지
    const videos = document.querySelectorAll('video:not([data-keep-playing="true"])');
    videos.forEach(video => {
      if (!isElementInViewport(video)) {
        const videoElement = video as HTMLVideoElement;
        if (!videoElement.paused) {
          videoElement.pause();
          count++;
        }
      }
    });

    // 화면에 보이지 않는 iframe 비활성화
    const iframes = document.querySelectorAll('iframe:not([data-keep-loaded="true"])');
    iframes.forEach(iframe => {
      if (!isElementInViewport(iframe)) {
        const iframeElement = iframe as HTMLIFrameElement;
        const originalSrc = iframeElement.getAttribute('src');
        if (originalSrc && originalSrc !== 'about:blank') {
          iframeElement.setAttribute('data-original-src', originalSrc);
          iframeElement.src = 'about:blank';
          count++;
        }
      }
    });

    if (count > 0) {
      console.log(`화면에 보이지 않는 리소스 ${count}개 언로드됨`);
    }

    return count > 0;
  } catch (error) {
    console.error('비표시 리소스 언로드 중 오류:', error);
    return false;
  }
}

/**
 * 미사용 리소스 해제
 * 메모리 내 사용되지 않는 리소스 해제
 */
export function releaseUnusedResources(): boolean {
  try {
    let count = 0;

    // 캔버스 컨텍스트 정리
    const canvases = document.querySelectorAll('canvas:not([data-keep-context="true"])');
    canvases.forEach(canvas => {
      try {
        // WebGL 컨텍스트 정리
        const canvasElement = canvas as HTMLCanvasElement;
        const gl = canvasElement.getContext('webgl') || canvasElement.getContext('webgl2');
        if (gl) {
          const ext = gl.getExtension('WEBGL_lose_context');
          if (ext) {
            ext.loseContext();
            count++;
          }
        }

        // 2D 컨텍스트도 정리 (지원 가능한 브라우저에서)
        const ctx = canvasElement.getContext('2d');
        if (ctx && typeof ctx.reset === 'function') {
          // @ts-ignore - 일부 최신 브라우저에서만 지원
          ctx.reset();
          count++;
        }
      } catch (_e) {
        // 무시
      }
    });

    // 오디오 컨텍스트 정리
    const audioElements = document.querySelectorAll('audio:not([data-keep-loaded="true"])');
    audioElements.forEach(audio => {
      const audioElement = audio as HTMLAudioElement;
      if (audioElement.paused) {
        audioElement.src = '';
        audioElement.load();
        count++;
      }
    });

    // 객체 URL 정리
    if (window.URL && typeof URL.revokeObjectURL === 'function') {
      // 객체 URL 맵 처리
      const win = window as unknown as WindowWithResources;
      const objectUrls = win.__objectUrls;

      if (objectUrls instanceof Map) {
        objectUrls.forEach((_, url) => {
          try {
            URL.revokeObjectURL(url);
            count++;
          } catch (e) {
            // 무시
          }
        });
        objectUrls.clear();
      }
    }

    if (count > 0) {
      console.log(`사용하지 않는 리소스 ${count}개 해제됨`);
    }

    return count > 0;
  } catch (error) {
    console.error('미사용 리소스 해제 중 오류:', error);
    return false;
  }
}

/**
 * 사용하지 않는 메모리 해제
 * 임시 변수 및 캐시 정리
 */
export function freeUnusedMemory(): boolean {
  try {
    let clearedItems = 0;

    // 윈도우 객체 확장
    const win = window as unknown as WindowWithResources;

    // 위젯 캐시 정리
    if (win.__widgetCache) {
      const widgetCache = win.__widgetCache;
      let itemsToRemove: string[] = [];

      for (const key in widgetCache) {
        // 비활성 상태인 위젯만 정리
        if (widgetCache[key]?.state === 'inactive') {
          itemsToRemove.push(key);
        }
      }

      // 삭제 작업 분리 (객체 순회 중 수정 방지)
      itemsToRemove.forEach(key => {
        delete widgetCache[key];
        clearedItems++;
      });
    }

    // 계산된 스타일 캐시 정리
    if (win.__styleCache) {
      if (Object.keys(win.__styleCache).length > 1000) {
        // 캐시가 너무 큰 경우 전체 삭제
        win.__styleCache = {};
        clearedItems += 1000; // 대략적인 추정값
      }
    }

    // 이미지 자동 크기 조정 캐시 정리
    if (win.__imageResizeCache) {
      const count = Object.keys(win.__imageResizeCache).length;
      // 빈 객체로 초기화
      win.__imageResizeCache = {};
      clearedItems += count;
    }

    if (clearedItems > 0) {
      console.log(`사용하지 않는 메모리 해제: ${clearedItems}개 항목 정리됨`);
    }

    // 브라우저에 메모리 해제 힌트 제공
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        // 사용 가능한 경우 GC 실행
        if (typeof win.gc === 'function') {
          win.gc();
        }
      });
    }

    return clearedItems > 0;
  } catch (error) {
    console.error('미사용 메모리 해제 중 오류:', error);
    return false;
  }
}

/**
 * DOM 최적화
 * DOM 구조 최적화 및 메모리 누수 방지
 */
export function optimizeDOM(): boolean {
  try {
    let optimizedCount = 0;

    // 과도하게 깊은 DOM 깊이를 가진 요소 검사
    const deepElements = findDeepDOMElements();
    if (deepElements.length > 0) {
      console.warn(`과도하게 깊은 DOM 구조 발견: ${deepElements.length}개`);
    }

    // 큰 DOM 노드 최적화
    const largeTextNodes = findLargeTextNodes();
    largeTextNodes.forEach(node => {
      // 텍스트 노드가 너무 큰 경우 잘라내기
      if (node.textContent && node.textContent.length > 5000) {
        node.textContent = node.textContent.substring(0, 5000) + '...';
        optimizedCount++;
      }
    });

    // 깊은 이벤트 리스너 정리
    cleanupDuplicateEventListeners();

    // 다양한 DOM 최적화 기법 적용
    removeEmptyNodes();
    mergeAdjacentTextNodes();

    // CSS 클래스 최적화 (너무 많은 클래스를 가진 요소)
    optimizeCSSClasses();

    return optimizedCount > 0;
  } catch (error) {
    console.error('DOM 최적화 중 오류:', error);
    return false;
  }
}

/**
 * Object URL 정리
 * 더 이상 사용되지 않는 Object URL을 해제하여 메모리를 절약합니다.
 */
export function revokeUnusedObjectURLs(): void {
  try {
    const win = window as unknown as WindowWithResources;

    // 객체 URL 맵이 없으면 생성
    if (!win.__objectUrls) {
      win.__objectUrls = new Map<string, string>();
      return;
    }

    // 사용하지 않는 객체 URL 해제
    const now = Date.now();
    const expiryTime = 30000; // 30초
    let revokedCount = 0;

    win.__objectUrls.forEach((creationTime: string, url: string) => {
      if (now - parseInt(creationTime) > expiryTime) {
        URL.revokeObjectURL(url);
        win.__objectUrls?.delete(url);
        revokedCount++;
      }
    });

    if (revokedCount > 0) {
      console.log(`${revokedCount}개의 미사용 객체 URL 해제됨`);
    }
  } catch (error) {
    console.warn('객체 URL 정리 중 오류:', error);
  }
}

/**
 * 위젯 캐시 정리
 * 커스텀 UI 위젯의 캐시를 정리합니다.
 */
export function clearWidgetCache(): void {
  try {
    const win = window as unknown as WindowWithResources;

    // 위젯 캐시가 없으면 건너뜀
    if (!win.__widgetCache) {
      win.__widgetCache = {};
      return;
    }

    // 객체의 개수는 Object.keys().length로 측정
    const size = Object.keys(win.__widgetCache).length;
    // Record 형태의 객체 초기화
    win.__widgetCache = {};

    if (size > 0) {
      console.log(`위젯 캐시 정리: ${size}개 항목 제거됨`);
    }
  } catch (error) {
    console.warn('위젯 캐시 정리 중 오류:', error);
  }
}

/**
 * 스타일 캐시 정리
 * 동적으로 생성된 스타일에 대한 참조를 정리합니다.
 */
export function clearStyleCache(): void {
  try {
    const win = window as unknown as WindowWithResources;

    // 스타일 캐시가 없으면 생성
    if (!win.__styleCache) {
      win.__styleCache = {};
      return;
    }

    // 캐시 항목 수가 너무 많으면 모두 정리
    const cacheSize = Object.keys(win.__styleCache).length;
    win.__styleCache = {};

    if (cacheSize > 0) {
      console.log(`스타일 캐시 정리: ${cacheSize}개 항목 제거됨`);
    }
  } catch (error) {
    console.warn('스타일 캐시 정리 중 오류:', error);
  }
}

/**
 * 이미지 리사이즈 캐시 정리
 */
export function clearImageResizeCache(): void {
  try {
    const win = window as unknown as WindowWithResources;
    if (win.__imageResizeCache) {
      win.__imageResizeCache = {};
    }
  } catch (error) {
    console.error('이미지 리사이즈 캐시 정리 중 오류:', error);
  }
}

/**
 * 텍스처 캐시 정리
 * 사용되지 않는 텍스처 캐시를 정리합니다.
 */
export function cleanupTextureCache(): number {
  try {
    const win = window as unknown as WindowWithResources;

    // 텍스처 캐시가 없으면 생성
    if (!win.__textureCache) {
      win.__textureCache = new Map<string, string>();
      return 0;
    }

    // 이전 크기 기록
    const cacheSize = win.__textureCache.size || 0;

    // 캐시 초기화
    win.__textureCache.clear();

    return cacheSize;
  } catch (error) {
    console.error('텍스처 캐시 정리 오류:', error);
    return 0;
  }
}

/**
 * 객체 캐시 정리
 * 사용되지 않는 객체 캐시를 정리합니다.
 */
export function cleanupObjectCache(): number {
  try {
    const win = window as unknown as WindowWithResources;

    // 객체 캐시가 없으면 생성
    if (!win.__objectCache) {
      win.__objectCache = new Map<string, any>();
      return 0;
    }

    // 이전 크기 기록
    const cacheSize = win.__objectCache.size || 0;

    // 캐시 초기화
    win.__objectCache.clear();

    return cacheSize;
  } catch (error) {
    console.error('객체 캐시 정리 오류:', error);
    return 0;
  }
}

/**
 * 리소스 최적화
 * 리소스를 최적화하는 기본 함수
 */
export function optimizeResources(): number {
  // 기본 구현
  return 0;
}

// 유틸리티 함수들

/**
 * 요소가 뷰포트 내에 있는지 확인
 */
function isElementInViewport(el: Element): boolean {
  try {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= -rect.height * 2 && // 위쪽으로 2배 확장
      rect.left >= -rect.width * 2 && // 왼쪽으로 2배 확장
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) + rect.height * 2 && // 아래쪽으로 2배 확장
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) + rect.width * 2 // 오른쪽으로 2배 확장
    );
  } catch (e) {
    return false;
  }
}

/**
 * 과도하게 깊은 DOM 요소 찾기
 */
function findDeepDOMElements(maxDepth: number = 15): Element[] {
  const deepElements: Element[] = [];

  function checkElementDepth(element: Element, depth: number) {
    if (depth > maxDepth) {
      deepElements.push(element);
      return;
    }

    Array.from(element.children).forEach(child => {
      checkElementDepth(child, depth + 1);
    });
  }

  // 문서 바디부터 시작
  if (document.body) {
    Array.from(document.body.children).forEach(child => {
      checkElementDepth(child, 1);
    });
  }

  return deepElements;
}

/**
 * 큰 텍스트 노드 찾기
 */
function findLargeTextNodes(): Text[] {
  const largeNodes: Text[] = [];

  function findTextNodes(element: Node) {
    if (element.nodeType === Node.TEXT_NODE) {
      const textNode = element as Text;
      if (textNode.textContent && textNode.textContent.length > 5000) {
        largeNodes.push(textNode);
      }
    } else {
      Array.from(element.childNodes).forEach(findTextNodes);
    }
  }

  if (document.body) {
    findTextNodes(document.body);
  }

  return largeNodes;
}

/**
 * 중복된 이벤트 리스너 정리
 */
function cleanupDuplicateEventListeners(): void {
  // 이벤트 리스너 정리는 브라우저 API로 직접 접근할 수 없음
  // 대신, 과도한 이벤트 리스너를 가진 요소를 복제하여 리스너 제거

  try {
    const elements = document.querySelectorAll('[data-event-heavy="true"]');
    elements.forEach(el => {
      const clone = el.cloneNode(true);
      if (el.parentNode) {
        el.parentNode.replaceChild(clone, el);
      }
    });
  } catch (e) {
    console.warn('이벤트 리스너 정리 중 오류:', e);
  }
}

/**
 * 빈 노드 제거
 */
function removeEmptyNodes(): void {
  try {
    // 빈 텍스트 노드 및 의미 없는 노드 제거
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // 공백만 있는 텍스트 노드 필터링
        if (node.textContent?.trim() === '') {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    const nodesToRemove: Node[] = [];
    let node;

    // 최대 100개 노드만 처리 (성능 문제 방지)
    let count = 0;
    while ((node = walker.nextNode()) && count < 100) {
      // 제거 대상인지 확인 (부모가 있고, 스크립트/스타일이 아닌 경우)
      if (
        node.parentNode &&
        !(node.parentNode.nodeName === 'SCRIPT' || node.parentNode.nodeName === 'STYLE')
      ) {
        nodesToRemove.push(node);
        count++;
      }
    }

    // 노드 제거
    nodesToRemove.forEach(node => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  } catch (e) {
    console.warn('빈 노드 제거 중 오류:', e);
  }
}

/**
 * 인접한 텍스트 노드 병합
 */
function mergeAdjacentTextNodes(): void {
  try {
    // 인접한 텍스트 노드 병합 (성능 향상)
    const elements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');

    // 최대 100개 요소만 처리 (성능 문제 방지)
    Array.from(elements)
      .slice(0, 100)
      .forEach(el => {
        el.normalize();
      });
  } catch (e) {
    console.warn('텍스트 노드 병합 중 오류:', e);
  }
}

/**
 * CSS 클래스 최적화
 */
function optimizeCSSClasses(): void {
  try {
    const elements = document.querySelectorAll('*[class]');

    // 최대 100개 요소만 처리 (성능 문제 방지)
    Array.from(elements)
      .slice(0, 100)
      .forEach(el => {
        const classesStr = el.getAttribute('class');
        if (classesStr) {
          const classes = classesStr.split(/\s+/);

          // 클래스가 30개 이상인 경우 최적화
          if (classes.length > 30) {
            // 중복 클래스 제거 및 클래스 수 제한
            const uniqueClasses = Array.from(new Set(classes)).slice(0, 30);
            el.setAttribute('class', uniqueClasses.join(' '));
          }
        }
      });
  } catch (e) {
    console.warn('CSS 클래스 최적화 중 오류:', e);
  }
}

/**
 * 리소스 최적화 유틸리티
 * 메모리에서 사용하지 않는 리소스를 해제하는 함수
 */

/**
 * 동적 리소스 정리
 * @returns {boolean} 성공 여부
 */
export function cleanupResources(): boolean {
  try {
    // 1. 사용하지 않는 캐시 지우기
    clearUnusedCaches();

    // 2. 사용하지 않는 객체 참조 제거
    removeUnusedObjectReferences();

    // 3. 대형 배열 및 버퍼 정리
    cleanupLargeArrays();

    return true;
  } catch (error) {
    console.error('리소스 정리 중 오류:', error);
    return false;
  }
}

/**
 * 사용하지 않는 캐시 정리
 */
function clearUnusedCaches(): void {
  try {
    // 애플리케이션 전용 캐시 정리
    const win = window as unknown as WindowWithResources;
    if (win.__memoryCache instanceof Map) {
      // 일정 시간 이상 사용하지 않은 캐시 항목 제거
      const now = Date.now();
      const CACHE_TTL = 30 * 60 * 1000; // 30분

      win.__memoryCache.forEach((value, key) => {
        if (value && typeof value === 'object' && 'lastAccess' in value) {
          if (now - (value.lastAccess as number) > CACHE_TTL) {
            win.__memoryCache?.delete(key);
          }
        }
      });
    }

    // 스타일 캐시 정리
    if (win.__styleCache) {
      win.__styleCache = {};
    }
  } catch (error) {
    console.warn('캐시 정리 중 오류:', error);
  }
}

/**
 * 사용하지 않는 객체 참조 제거
 */
function removeUnusedObjectReferences(): void {
  try {
    // 동적 모듈 관리자를 통한 참조 정리 (있는 경우)
    const win = window as unknown as WindowWithResources;
    if (win._dynamicModules instanceof Map) {
      const modules = win._dynamicModules;
      const now = Date.now();
      const MODULE_UNUSED_THRESHOLD = 60 * 60 * 1000; // 1시간

      modules.forEach((module, name) => {
        if (module && typeof module === 'object' && 'lastUsed' in module) {
          // 오랫동안 사용하지 않은 모듈은 언로드
          if (now - (module.lastUsed as number) > MODULE_UNUSED_THRESHOLD) {
            // 타입 안전하게 unload 메서드 호출
            if (
              module &&
              typeof module === 'object' &&
              'unload' in module &&
              typeof module.unload === 'function'
            ) {
              try {
                module.unload();
              } catch (_e) {
                console.warn(`모듈 '${name}' 언로드 중 오류:`, _e);
              }
            }
            modules.delete(name);
          }
        }
      });
    }
  } catch (error) {
    console.warn('객체 참조 정리 중 오류:', error);
  }
}

/**
 * 대형 배열 및 버퍼 정리
 */
function cleanupLargeArrays(): void {
  try {
    // 버퍼 캐시 정리
    const win = window as unknown as WindowWithResources;
    if (win.__bufferCache) {
      // 각 버퍼에 대해 참조 제거 여부 결정
      Object.keys(win.__bufferCache).forEach(key => {
        if (win.__bufferCache && key in win.__bufferCache) {
          // 참조만 제거 (GC가 처리하도록)
          win.__bufferCache[key] = null;
          delete win.__bufferCache[key];
        }
      });
    }
  } catch (error) {
    console.warn('배열 및 버퍼 정리 중 오류:', error);
  }
}

// 윈도우 타입 확장 부분 수정

// Window 타입을 직접 확장하는 대신, 별도 타입으로 두고 필요시 타입 단언 사용
export type { WindowWithResources };
