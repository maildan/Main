/**
 * GPU 가속화 및 하드웨어 가속 최적화 유틸리티
 * 실무 최적화 전략에 따른 GPU 가속화 기능 제공
 */

// GPU 가속 효과가 큰 임계값 (픽셀 크기)
const GPU_ACCELERATION_THRESHOLDS = {
  CANVAS_AREA: 500000,    // 500,000 픽셀 (약 700x700)
  ANIMATION_FRAMES: 10,   // 초당 10 프레임 이상에서 가속 필요
  TRANSFORM_ELEMENTS: 50  // CSS 변환 요소가 50개 이상일 때 하드웨어 가속 권장
};

// GPU 가속 상태 추적
let gpuAccelerationStatus = {
  hardwareAccelerated: false,
  gpuTier: 0, // 0: 알 수 없음, 1: 저사양, 2: 중간, 3: 고사양
  lastCheck: 0,
  acceleratedElements: new WeakSet(),
  canvas3DContexts: new WeakMap<HTMLCanvasElement, WebGLRenderingContext | WebGL2RenderingContext>(),
  failedDetection: false
};

/**
 * GPU 하드웨어 가속 가능 여부 확인
 * @returns GPU 가속 가능 여부
 */
export async function detectGPUAcceleration(): Promise<boolean> {
  try {
    // 캐시된 결과 반환 (1분 이내)
    const now = Date.now();
    if (now - gpuAccelerationStatus.lastCheck < 60000 && !gpuAccelerationStatus.failedDetection) {
      return gpuAccelerationStatus.hardwareAccelerated;
    }
    
    // 이미 전역 객체에 GPU 정보가 있는 경우
    if (window.__gpuInfo?.isHardwareAccelerated) {
      gpuAccelerationStatus.hardwareAccelerated = window.__gpuInfo.isHardwareAccelerated();
      gpuAccelerationStatus.lastCheck = now;
      return gpuAccelerationStatus.hardwareAccelerated;
    }
    
    // WebGL을 통한 GPU 가속 확인
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    // WebGL 1.0 먼저 시도
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    // WebGL 2.0 시도
    if (!gl) {
      gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    }
    
    if (!gl) {
      console.warn('WebGL 컨텍스트를 얻을 수 없음: GPU 가속 불가능');
      gpuAccelerationStatus.hardwareAccelerated = false;
      gpuAccelerationStatus.failedDetection = true;
      gpuAccelerationStatus.lastCheck = now;
      return false;
    }
    
    // GPU 정보 가져오기
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
      
      console.debug('GPU 정보:', { renderer, vendor });
      
      // GPU 티어 추정 (간단한 휴리스틱)
      if (renderer) {
        if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Radeon')) {
          gpuAccelerationStatus.gpuTier = 3; // 고사양
        } else if (renderer.includes('Intel') && !renderer.includes('HD Graphics')) {
          gpuAccelerationStatus.gpuTier = 2; // 중간
        } else if (!renderer.includes('SwiftShader') && !renderer.includes('ANGLE') && !renderer.includes('Mesa')) {
          gpuAccelerationStatus.gpuTier = 2; // 중간 (기본값)
        } else {
          gpuAccelerationStatus.gpuTier = 1; // 저사양 또는 소프트웨어 렌더링
        }
      }
      
      // 소프트웨어 렌더링 감지
      const isSoftwareRenderer = 
        renderer?.includes('SwiftShader') || 
        renderer?.includes('ANGLE') || 
        renderer?.includes('llvmpipe') ||
        renderer?.includes('Basic');
      
      gpuAccelerationStatus.hardwareAccelerated = !isSoftwareRenderer;
    } else {
      // Debug info를 얻을 수 없는 경우 기본적으로 하드웨어 가속 가능 가정
      gpuAccelerationStatus.hardwareAccelerated = true;
      gpuAccelerationStatus.gpuTier = 1; // 정보 없음 - 기본 저사양 가정
    }
    
    // 추가 확인: CSS 3D 변환 지원
    const testElement = document.createElement('div');
    testElement.style.transform = 'translate3d(0, 0, 0)';
    const has3DTransforms = window.getComputedStyle(testElement).transform === 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)';
    
    // CSS 3D 변환 지원하지 않으면 하드웨어 가속 불가능
    if (!has3DTransforms) {
      gpuAccelerationStatus.hardwareAccelerated = false;
    }
    
    // 전역 GPU 정보 객체 설정
    window.__gpuInfo = {
      getGPUTier: () => ({
        tier: gpuAccelerationStatus.gpuTier,
        type: getTierDescription(gpuAccelerationStatus.gpuTier)
      }),
      isHardwareAccelerated: () => gpuAccelerationStatus.hardwareAccelerated
    };
    
    // 상태 업데이트
    gpuAccelerationStatus.lastCheck = now;
    return gpuAccelerationStatus.hardwareAccelerated;
  } catch (error) {
    console.error('GPU 가속 감지 중 오류:', error);
    gpuAccelerationStatus.failedDetection = true;
    gpuAccelerationStatus.lastCheck = Date.now();
    return false;
  }
}

/**
 * GPU 티어 설명 반환
 * @param tier GPU 티어
 * @returns 설명 문자열
 */
function getTierDescription(tier: number): string {
  switch (tier) {
    case 3: return 'high-end';
    case 2: return 'mid-range';
    case 1: return 'low-end';
    default: return 'unknown';
  }
}

/**
 * 요소에 하드웨어 가속 적용
 * @param element 가속할 DOM 요소
 * @param options 가속 옵션
 */
export function applyHardwareAcceleration(
  element: HTMLElement, 
  options: { 
    force?: boolean;           // 항상 적용 여부
    useTranslate3d?: boolean;  // transform: translate3d 사용
    useWillChange?: boolean;   // will-change 속성 사용
    highPriority?: boolean;    // 높은 우선순위 (애니메이션 요소)
  } = {}
): void {
  try {
    // 이미 가속 중인 요소 확인
    if (gpuAccelerationStatus.acceleratedElements.has(element)) {
      return;
    }
    
    const { 
      force = false, 
      useTranslate3d = true, 
      useWillChange = true,
      highPriority = false
    } = options;
    
    // 하드웨어 가속이 불가능하고 강제 적용이 아닌 경우 무시
    if (!gpuAccelerationStatus.hardwareAccelerated && !force) return;
    
    // 성능 영향 평가 (면적 기준)
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // 작은 요소는 가속이 오히려 성능 저하를 가져올 수 있음
    // 단, 높은 우선순위 요소는 항상 가속 적용
    if (!highPriority && area < 100 && !force) return;
    
    // 하드웨어 가속 적용
    const style = element.style;
    
    // GPU 티어에 따른 최적화 전략 조정
    const gpuTier = gpuAccelerationStatus.gpuTier;
    
    if (useTranslate3d || highPriority) {
      // translate3d를 사용한 GPU 가속
      // 이미 transform이 설정되어 있으면 그대로 유지하고 translate3d만 추가
      const currentTransform = style.transform;
      if (!currentTransform || currentTransform === 'none') {
        style.transform = 'translate3d(0, 0, 0)';
      } else if (!currentTransform.includes('translate3d')) {
        style.transform = `${currentTransform} translate3d(0, 0, 0)`;
      }
    }
    
    // will-change 속성은 고사양 GPU에서만 최대한 활용
    // 저사양 GPU에서는 메모리 부담이 크므로 필요한 경우만 적용
    if (useWillChange && (gpuTier >= 2 || highPriority)) {
      // 애니메이션 대상 요소인 경우 transform + opacity로 최적화
      if (highPriority) {
        style.willChange = 'transform, opacity';
      } else {
        style.willChange = 'transform';
      }
    }
    
    // IE 대응이 필요한 경우
    if (typeof (window as any).MSCSSMatrix !== 'undefined') {
      // msTransform 대신 표준 transform 사용
      style.transform = style.transform;
    }
    
    // 캐시에 저장
    gpuAccelerationStatus.acceleratedElements.add(element);
  } catch (error) {
    console.warn('하드웨어 가속 적용 중 오류:', error);
  }
}

/**
 * Canvas에 WebGL 컨텍스트 생성 및 최적화
 * @param canvas 타겟 캔버스
 * @param preferWebGL2 WebGL 2 선호 여부
 * @returns WebGL 컨텍스트
 */
export function createOptimizedWebGLContext(
  canvas: HTMLCanvasElement,
  preferWebGL2: boolean = true
): WebGLRenderingContext | WebGL2RenderingContext | null {
  try {
    // 이미 생성된 컨텍스트가 있으면 반환
    if (gpuAccelerationStatus.canvas3DContexts.has(canvas)) {
      return gpuAccelerationStatus.canvas3DContexts.get(canvas) || null;
    }
    
    // WebGL 컨텍스트 옵션
    const contextOptions: WebGLContextAttributes = {
      alpha: false,           // 투명도 불필요한 경우 성능 향상
      antialias: false,       // 안티앨리어싱은 필요한 경우만 활성화
      depth: true,            // 3D 렌더링 필요 시
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      stencil: false,         // 스텐실 버퍼 필요한 경우만 활성화
      desynchronized: true    // 지연 감소를 위해 활성화
    };
    
    // GPU 티어와 요소 크기에 따라 옵션 조정
    const rect = canvas.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // 큰 캔버스이고 고사양 GPU인 경우 안티앨리어싱 활성화
    if (area > GPU_ACCELERATION_THRESHOLDS.CANVAS_AREA && gpuAccelerationStatus.gpuTier >= 2) {
      contextOptions.antialias = true;
    }
    
    // WebGL 버전 결정
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    
    if (preferWebGL2) {
      gl = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext;
    }
    
    // WebGL 2를 지원하지 않으면 WebGL 1로 폴백
    if (!gl) {
      gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext;
    }
    
    if (!gl) {
      console.warn('WebGL 컨텍스트를 생성할 수 없습니다.');
      return null;
    }
    
    // 성능 최적화 설정
    applyWebGLOptimizations(gl, area);
    
    // 캐시에 저장
    gpuAccelerationStatus.canvas3DContexts.set(canvas, gl);
    
    return gl;
  } catch (error) {
    console.error('WebGL 컨텍스트 생성 중 오류:', error);
    return null;
  }
}

/**
 * WebGL 컨텍스트에 성능 최적화 적용
 * @param gl WebGL 컨텍스트
 * @param area 캔버스 영역 (픽셀)
 */
function applyWebGLOptimizations(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  area: number
): void {
  try {
    // 확장 기능 가져오기
    const isWebGL2 = !!(gl as WebGL2RenderingContext).drawBuffers;
    
    // 아래 확장 기능들이 성능 향상에 도움
    if (!isWebGL2) {
      // WebGL 1 확장
      gl.getExtension('OES_element_index_uint');
      gl.getExtension('OES_vertex_array_object');
    }
    
    // 공통 확장
    gl.getExtension('EXT_texture_filter_anisotropic');
    
    // 캔버스 크기가 크면 GPU 메모리 사용량을 줄이기 위한 설정
    if (area > GPU_ACCELERATION_THRESHOLDS.CANVAS_AREA) {
      // 큰 텍스처 처리를 위한 확장 (필요한 경우)
      gl.getExtension('OES_texture_float');
      gl.getExtension('WEBGL_compressed_texture_s3tc');
    }
    
    // 기본 상태 설정
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    
    // 뎁스 테스트 설정 (필요한 경우)
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // 최적화를 위한 힌트 설정
    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST);
  } catch (error) {
    console.warn('WebGL 최적화 적용 중 오류:', error);
  }
}

// WebGL 리소스 타입 정의
interface WebGLResources {
  buffers?: WebGLBuffer[];
  textures?: WebGLTexture[];
  framebuffers?: WebGLFramebuffer[];
  shaders?: WebGLShader[];
  programs?: WebGLProgram[];
}

/**
 * 불필요한 WebGL 리소스 정리
 * @param gl WebGL 컨텍스트
 * @param resources 정리할 리소스 목록
 */
export function cleanupWebGLResources(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  resources: WebGLResources
): void {
  try {
    const { buffers, textures, framebuffers, shaders, programs } = resources;
    
    // 버퍼 삭제
    if (buffers && buffers.length > 0) {
      buffers.forEach(buffer => {
        if (buffer) gl.deleteBuffer(buffer);
      });
    }
    
    // 텍스처 삭제
    if (textures && textures.length > 0) {
      textures.forEach(texture => {
        if (texture) gl.deleteTexture(texture);
      });
    }
    
    // 프레임버퍼 삭제
    if (framebuffers && framebuffers.length > 0) {
      framebuffers.forEach(framebuffer => {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
      });
    }
    
    // 쉐이더 삭제
    if (shaders && shaders.length > 0) {
      shaders.forEach(shader => {
        if (shader) gl.deleteShader(shader);
      });
    }
    
    // 프로그램 삭제
    if (programs && programs.length > 0) {
      programs.forEach(program => {
        if (program) gl.deleteProgram(program);
      });
    }
  } catch (error) {
    console.warn('WebGL 리소스 정리 중 오류:', error);
  }
}

/**
 * 요소에 CSS 하드웨어 가속 최적화를 적용하는 React 훅
 */
export function enableGPUAcceleration(): void {
  try {
    // GPU 가속을 사용할 수 있는지 확인
    detectGPUAcceleration().then(supported => {
      if (!supported) {
        console.warn('GPU 하드웨어 가속이 지원되지 않습니다.');
        return;
      }
      
      // 애니메이션 요소에 하드웨어 가속 적용
      const animatedElements = document.querySelectorAll('.animated, .animate, [data-animate="true"], .animation');
      animatedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          applyHardwareAcceleration(el, { highPriority: true });
        }
      });
      
      // 차트 요소에 하드웨어 가속 적용
      const chartElements = document.querySelectorAll('.chart, .graph, canvas[data-chart="true"]');
      chartElements.forEach(el => {
        if (el instanceof HTMLElement) {
          applyHardwareAcceleration(el, { useWillChange: true });
        }
      });
      
      // 스크롤 컨테이너에 하드웨어 가속 적용
      const scrollContainers = document.querySelectorAll('.scroll-container, [data-scroll="true"], .overflow-auto');
      scrollContainers.forEach(el => {
        if (el instanceof HTMLElement) {
          applyHardwareAcceleration(el, { useTranslate3d: true });
        }
      });
    });
  } catch (error) {
    console.error('GPU 가속 활성화 중 오류:', error);
  }
}

// 브라우저 환경에서만 실행
if (typeof window !== 'undefined') {
  // GPU 가속 감지 자동 실행 (페이지 로드 후)
  if (document.readyState === 'complete') {
    detectGPUAcceleration();
  } else {
    window.addEventListener('load', () => {
      // 페이지 로드 완료 후 GPU 가속 감지 및 최적화
      setTimeout(() => detectGPUAcceleration(), 1000);
    });
  }
  
  // 전역 객체에 GPU 가속 함수 노출
  (window as any).__gpuAccelerator = {
    detectGPUAcceleration,
    applyHardwareAcceleration,
    createOptimizedWebGLContext,
    cleanupWebGLResources,
    enableGPUAcceleration,
    getStatus: () => ({ ...gpuAccelerationStatus })
  };
}

/**
 * 현재 GPU 가속화 상태 확인
 * @returns {boolean} GPU 가속화 활성화 여부
 */
export function isGPUAccelerationEnabled(): boolean {
  try {
    // 캐시된 정보 사용 (있는 경우)
    if (window.__gpuInfo !== undefined) {
      return window.__gpuInfo?.isAccelerated ?? false;
    }

    // 캐시된 정보가 없으면 직접 확인
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return false;
    }
    
    // WebGL 타입으로 명시적 캐스팅 추가
    const glContext = gl as WebGLRenderingContext;
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // WebGL 렌더러 문자열 기반으로 확인
    const accelerated = !(
      renderer.includes('SwiftShader') || 
      renderer.includes('Basic Renderer') ||
      renderer.includes('Software') ||
      renderer.includes('llvmpipe')
    );
    
    // 결과 캐싱
    window.__gpuInfo = {
      renderer,
      isAccelerated: accelerated
    };
    
    return accelerated;
  } catch (error) {
    console.warn('GPU 가속화 상태 확인 오류:', error);
    return false;
  }
}

/**
 * 현재 GPU 정보 가져오기
 * @returns {Object} GPU 정보
 */
export function getGPUInfo(): { renderer: string, vendor: string, isAccelerated: boolean } {
  // 캐시된 정보 사용 (있는 경우)
  if (window.__gpuInfo) {
    return {
      renderer: window.__gpuInfo.renderer || 'Unknown',
      vendor: window.__gpuInfo.vendor || 'Unknown',
      isAccelerated: window.__gpuInfo.isAccelerated || false
    };
  }
  
  // GPU 정보 가져오기
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    return { renderer: 'Unknown', vendor: 'Unknown', isAccelerated: false };
  }
  
  // WebGL 타입으로 명시적 캐스팅 추가
  const glContext = gl as WebGLRenderingContext;
  const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
  const vendor = debugInfo ? glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
  
  const isAccelerated = !(
    renderer.includes('SwiftShader') || 
    renderer.includes('Basic Renderer') ||
    renderer.includes('Software') ||
    renderer.includes('llvmpipe')
  );
  
  // 결과 캐싱
  window.__gpuInfo = {
    renderer,
    vendor,
    isAccelerated
  };
  
  return { renderer, vendor, isAccelerated };
}
