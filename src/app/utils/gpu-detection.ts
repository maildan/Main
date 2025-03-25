/**
 * GPU 감지 및 호환성 유틸리티
 * 
 * 이 모듈은 클라이언트의 GPU 하드웨어를 감지하고 사용 가능한 기능을 확인합니다.
 * 다양한 브라우저와 운영체제 환경에서 최적의 GPU 가속 방법을 제공합니다.
 */

import { isGpuAccelerationEnabled } from './gpu-acceleration';

// GPU 기능 호환성 인터페이스
export interface GpuCapabilities {
  webGLSupported: boolean;
  webGL2Supported: boolean;
  webGPUSupported: boolean;
  hardwareAccelerated: boolean;
  vendor: string;
  renderer: string;
  isDiscrete: boolean;  // 독립형 GPU인지 여부
  memorySizeMB?: number; // GPU 메모리 크기 (MB)
  driverVersion?: string;
  gpuTier: number; // 1-저사양, 2-중간, 3-고사양
}

// GPU 벤더 enum
export enum GpuVendor {
  UNKNOWN = 'unknown',
  NVIDIA = 'nvidia',
  AMD = 'amd',
  INTEL = 'intel',
  APPLE = 'apple',
  MICROSOFT = 'microsoft',
  QUALCOMM = 'qualcomm',
  ARM = 'arm',
  IMAGINATION = 'imagination',
  SOFTPIPE = 'software',
  SWIFTSHADER = 'swiftshader'
}

// 아키텍처에 따른 GPU 분류 (독립 GPU vs 통합 GPU)
export enum GpuArchitecture {
  UNKNOWN = 'unknown',
  INTEGRATED = 'integrated',
  DISCRETE = 'discrete'
}

// GPU 메모리 캐시 (반복 감지 방지)
const gpuCache = {
  capabilities: null as GpuCapabilities | null,
  lastCheck: 0,
  vendor: GpuVendor.UNKNOWN,
  architecture: GpuArchitecture.UNKNOWN
};

/**
 * GPU 기능 감지
 * 
 * 클라이언트의 GPU 기능을 감지하고 호환성 정보를 반환합니다.
 */
export async function detectGpuCapabilities(): Promise<GpuCapabilities> {
  // 캐시된 정보가 있으면 재사용 (30초 이내)
  const now = Date.now();
  if (gpuCache.capabilities && now - gpuCache.lastCheck < 30000) {
    return gpuCache.capabilities;
  }
  
  // 기본 기능 설정
  const capabilities: GpuCapabilities = {
    webGLSupported: false,
    webGL2Supported: false,
    webGPUSupported: false,
    hardwareAccelerated: false,
    vendor: 'unknown',
    renderer: 'unknown',
    isDiscrete: false,
    gpuTier: 0
  };
  
  try {
    // 서버 사이드 렌더링 환경에서는 빈 객체 반환
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return capabilities;
    }
    
    // WebGL 지원 확인
    const canvas = document.createElement('canvas');
    
    // WebGL 1.0 확인
    let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    capabilities.webGLSupported = !!gl;
    
    if (gl) {
      // GPU 정보 가져오기
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        capabilities.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
        capabilities.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }
      
      // 하드웨어 가속 여부 확인
      capabilities.hardwareAccelerated = isHardwareAccelerated(capabilities.renderer);
      
      // 벤더 식별
      gpuCache.vendor = identifyVendor(capabilities.vendor, capabilities.renderer);
      
      // 아키텍처 식별
      gpuCache.architecture = identifyArchitecture(capabilities.renderer, gpuCache.vendor);
      capabilities.isDiscrete = gpuCache.architecture === GpuArchitecture.DISCRETE;
      
      // GPU 티어 결정
      capabilities.gpuTier = determineGpuTier(
        gpuCache.vendor, 
        capabilities.renderer, 
        gpuCache.architecture, 
        capabilities.hardwareAccelerated
      );
    }
    
    // WebGL 2.0 확인
    let gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    capabilities.webGL2Supported = !!gl2;
    
    // WebGPU 확인 (아직 모든 브라우저에서 지원되지 않음)
    capabilities.webGPUSupported = 'gpu' in navigator;
    
    // GPU 메모리 크기 추정 (가능한 경우)
    if (gl && gpuCache.vendor !== GpuVendor.UNKNOWN) {
      capabilities.memorySizeMB = estimateGpuMemory(gl, gpuCache.vendor, capabilities.gpuTier);
    }
    
    // 캐시에 저장
    gpuCache.capabilities = capabilities;
    gpuCache.lastCheck = now;
    
    return capabilities;
  } catch (error) {
    console.error('GPU 기능 감지 중 오류:', error);
    return capabilities;
  }
}

/**
 * 하드웨어 가속 여부 확인
 */
function isHardwareAccelerated(renderer: string): boolean {
  const softwareRenderers = [
    'swiftshader', 'llvmpipe', 'software', 'mesa offscreen', 
    'microsoft basic render', 'gdi generic', 'virgl', 
    'virtual box', 'basic render'
  ];
  
  renderer = renderer.toLowerCase();
  return !softwareRenderers.some(sr => renderer.includes(sr));
}

/**
 * GPU 벤더 식별
 */
function identifyVendor(vendor: string, renderer: string): GpuVendor {
  const vendorLower = vendor.toLowerCase();
  const rendererLower = renderer.toLowerCase();
  
  if (vendorLower.includes('nvidia') || rendererLower.includes('nvidia')) {
    return GpuVendor.NVIDIA;
  } else if (vendorLower.includes('amd') || rendererLower.includes('amd') || 
             vendorLower.includes('ati') || rendererLower.includes('radeon')) {
    return GpuVendor.AMD;
  } else if (vendorLower.includes('intel') || rendererLower.includes('intel')) {
    return GpuVendor.INTEL;
  } else if (vendorLower.includes('apple') || rendererLower.includes('apple')) {
    return GpuVendor.APPLE;
  } else if (vendorLower.includes('microsoft') || rendererLower.includes('microsoft')) {
    return GpuVendor.MICROSOFT;
  } else if (vendorLower.includes('qualcomm') || rendererLower.includes('adreno')) {
    return GpuVendor.QUALCOMM;
  } else if (vendorLower.includes('arm') || rendererLower.includes('mali')) {
    return GpuVendor.ARM;
  } else if (vendorLower.includes('imagination') || rendererLower.includes('powervr')) {
    return GpuVendor.IMAGINATION;
  } else if (rendererLower.includes('swiftshader')) {
    return GpuVendor.SWIFTSHADER;
  } else if (rendererLower.includes('llvmpipe') || rendererLower.includes('softpipe')) {
    return GpuVendor.SOFTPIPE;
  }
  
  return GpuVendor.UNKNOWN;
}

/**
 * GPU 아키텍처 식별 (통합 vs 독립)
 */
function identifyArchitecture(renderer: string, vendor: GpuVendor): GpuArchitecture {
  const rendererLower = renderer.toLowerCase();
  
  // 명확한 독립 GPU 식별자
  if (rendererLower.includes('rtx') || 
      rendererLower.includes('geforce') || 
      rendererLower.includes('quadro') ||
      rendererLower.includes('radeon') ||
      rendererLower.includes('firepro') ||
      rendererLower.includes('rx') && rendererLower.match(/\brx\s+\d{3,4}\b/i)) {
    return GpuArchitecture.DISCRETE;
  }
  
  // 통합 GPU 식별자
  if (rendererLower.includes('uhd') || 
      rendererLower.includes('iris') ||
      rendererLower.includes('hd graphics') ||
      vendor === GpuVendor.INTEL ||
      rendererLower.includes('apple m') ||
      vendor === GpuVendor.ARM ||
      vendor === GpuVendor.QUALCOMM) {
    return GpuArchitecture.INTEGRATED;
  }
  
  // 불확실한 경우
  return GpuArchitecture.UNKNOWN;
}

/**
 * GPU 티어 결정 (1-저사양, 2-중간, 3-고사양)
 */
function determineGpuTier(
  vendor: GpuVendor, 
  renderer: string, 
  architecture: GpuArchitecture, 
  hardwareAccelerated: boolean
): number {
  if (!hardwareAccelerated) {
    return 0; // 하드웨어 가속 불가능
  }
  
  const rendererLower = renderer.toLowerCase();
  
  // 소프트웨어 렌더러는 항상 티어 0
  if (vendor === GpuVendor.SOFTPIPE || vendor === GpuVendor.SWIFTSHADER) {
    return 0;
  }
  
  // 독립 GPU는 일반적으로 고성능
  if (architecture === GpuArchitecture.DISCRETE) {
    // 고사양 GPU
    if (rendererLower.includes('rtx') || 
        rendererLower.includes('geforce 30') || 
        rendererLower.includes('geforce 40') ||
        rendererLower.includes('radeon rx 6') || 
        rendererLower.includes('radeon rx 7')) {
      return 3;
    }
    
    // 중간 사양 GPU
    if (rendererLower.includes('geforce 20') || 
        rendererLower.includes('geforce 16') ||
        rendererLower.includes('radeon rx 5') || 
        rendererLower.includes('radeon vega')) {
      return 2;
    }
    
    // 기본적으로 독립 GPU는 최소 티어 2
    return 2;
  }
  
  // 통합 GPU
  if (architecture === GpuArchitecture.INTEGRATED) {
    // 고성능 통합 GPU
    if (rendererLower.includes('apple m2') || 
        rendererLower.includes('apple m3') ||
        rendererLower.includes('iris xe') || 
        rendererLower.includes('intel arc')) {
      return 2;
    }
    
    // 일반 통합 GPU
    return 1;
  }
  
  // 기본값: 알 수 없는 경우 안전하게 티어 1 반환
  return 1;
}

/**
 * GPU 메모리 크기 추정
 */
function estimateGpuMemory(gl: WebGLRenderingContext, vendor: GpuVendor, tier: number): number {
  // WebGL 확장에서 메모리 크기 추정 시도
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  if (extension) {
    // 일부 브라우저는 GPU 메모리 정보를 제공하지만, 표준화되지 않음
    // 간접적으로 추정
    
    // GPU 티어에 따른 추정
    switch (tier) {
      case 3: return 8 * 1024; // 8GB
      case 2: return 4 * 1024; // 4GB
      case 1: return 2 * 1024; // 2GB
      default: return 1 * 1024; // 1GB
    }
  }
  
  // 기본값: 벤더와 티어에 따른 보수적 추정
  switch (vendor) {
    case GpuVendor.NVIDIA:
      return tier === 3 ? 8 * 1024 : tier === 2 ? 4 * 1024 : 2 * 1024;
    case GpuVendor.AMD:
      return tier === 3 ? 8 * 1024 : tier === 2 ? 4 * 1024 : 2 * 1024;
    case GpuVendor.INTEL:
      return tier === 2 ? 2 * 1024 : 1 * 1024;
    case GpuVendor.APPLE:
      return tier === 2 ? 4 * 1024 : 2 * 1024;
    default:
      return 1 * 1024; // 알 수 없는 경우 1GB 가정
  }
}

/**
 * WebGL 컨텍스트 생성 도우미
 */
export function createWebGLContext(
  canvas: HTMLCanvasElement, 
  preferWebGL2: boolean = true, 
  contextAttributes: WebGLContextAttributes = {}
): WebGLRenderingContext | WebGL2RenderingContext | null {
  // 기본 컨텍스트 속성
  const defaultAttributes: WebGLContextAttributes = {
    alpha: false,              // 알파 채널 불필요하면 비활성화
    antialias: false,          // 필요시 활성화
    depth: true,               // 3D 필요하면 활성화
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
    desynchronized: true       // 지연 감소
  };
  
  const attributes = { ...defaultAttributes, ...contextAttributes };
  
  // WebGL 2.0 우선 시도
  if (preferWebGL2) {
    try {
      const gl2 = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext;
      if (gl2) return gl2;
    } catch (e) {
      console.warn('WebGL 2 초기화 실패, WebGL 1로 폴백', e);
    }
  }
  
  // WebGL 1.0 폴백
  try {
    return canvas.getContext('webgl', attributes) || 
           canvas.getContext('experimental-webgl', attributes) as WebGLRenderingContext;
  } catch (e) {
    console.error('WebGL 초기화 실패', e);
    return null;
  }
}

/**
 * 웹 환경에서 GPU 가속화가 지원되는지 확인
 */
export async function isGpuSupported(): Promise<boolean> {
  try {
    // 네이티브 모듈 우선 확인
    const nativeSupported = await isGpuAccelerationEnabled();
    if (nativeSupported) {
      return true;
    }
    
    // 클라이언트 측 감지
    const capabilities = await detectGpuCapabilities();
    return capabilities.hardwareAccelerated && 
           (capabilities.webGLSupported || capabilities.webGPUSupported);
  } catch (error) {
    console.error('GPU 지원 확인 중 오류:', error);
    return false;
  }
}

// 전역 GPU 정보 캐싱 & 공유
if (typeof window !== 'undefined') {
  // 자동 감지
  detectGpuCapabilities().then(info => {
    window.__gpuInfo = {
      isAccelerated: () => info.hardwareAccelerated,
      renderer: info.renderer,
      vendor: info.vendor,
      getGPUTier: () => ({ tier: info.gpuTier, type: getTierDescription(info.gpuTier) }),
      isHardwareAccelerated: () => info.hardwareAccelerated
    };
  });
}

/**
 * GPU 티어 설명 반환
 */
function getTierDescription(tier: number): string {
  switch (tier) {
    case 0: return 'software';
    case 1: return 'entry-level';
    case 2: return 'mid-range';
    case 3: return 'high-end';
    default: return 'unknown';
  }
}
