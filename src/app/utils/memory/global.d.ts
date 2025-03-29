/**
 * 메모리 최적화 관련 전역 타입 정의
 */
import { MemoryOptimizerUtility } from './types-extended';

// 전역 타입 확장
declare global {
  interface Window {
    // GC 함수 (--expose-gc 플래그 활성화 시 사용 가능)
    gc?: () => void;
    
    // 메모리 최적화 유틸리티
    __memoryOptimizer?: MemoryOptimizerUtility;
    
    // 임시 캐시 및 정리 대상 컬렉션
    _imageCache?: Map<string, any> | { clear: () => void };
    _memoryTables?: Array<{ clear: () => void }>;
    _eventListeners?: Record<string, Array<{ cleanup?: () => void }>>;
    _dynamicModules?: Record<string, {
      lastUsed: number;
      loaded: boolean;
      unload: () => void;
    }>;
    _largeDataObjects?: Array<{ release: () => void }>;
    
    // 앱 캐시 객체 (추가)
    _appCache?: { clear: () => void } | Map<string, any>;
    
    // GPU 정보 객체 (추가)
    __gpuInfo?: {
      renderer?: string;
      vendor?: string;
      isAccelerated?: boolean;
      [key: string]: any;
    };
    
    // Electron API 타입은 별도 정의 활용
    electronAPI?: any;

    // 스타일 캐시 - 두 가지 타입 모두 가능하게 설정
    __styleCache?: Record<string, any> | Map<string, any>;
    
    // 이미지 리사이즈 캐시 - Map으로 설정
    __imageResizeCache?: Map<string, HTMLImageElement>;
    
    // 기타 메모리 관련 전역 속성
    __objectUrls?: Map<string, string>;
    __memoryCache?: Map<string, any>;
    __widgetCache?: Map<string, any>;
  }

  // 타입 스크립트가 WebGL 호환성 오류를 발생시키지 않도록 확장
  interface WebGLRenderingContext {
    // 기존 속성 유지
  }

  interface WebGL2RenderingContext {
    // 기존 속성 유지
  }

  // HTML 요소 확장
  interface HTMLElement {
    _eventHandlers?: Record<string, any[]>;
    dataset: DOMStringMap;
  }
}

// 이 파일은 모듈로 처리되어야 함
export {};
