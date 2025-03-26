/**
 * 메모리 관련 유틸리티 통합 모듈
 */

// 하위 모듈 내보내기
export * from './format-utils';
export * from './memory-info';

// 필요한 훅들 내보내기
export { 
  useMemory, 
  useMemorySettings,
  useAutoMemoryOptimization, 
  useFormattedMemoryInfo,
  useMemoryStatus 
} from './hooks';

// GC 유틸리티 함수 내보내기
export { 
  suggestGarbageCollection,
  clearBrowserCaches, 
  clearStorageCaches,
  setupPeriodicGC
} from './gc-utils';

// 메모리 최적화 기능 내보내기
export {
  formatMemoryInfo,
  assessMemoryState,
  convertNativeMemoryInfo
} from './memory-info';

// 네이티브 브릿지 대신 네이티브 모듈 클라이언트에서 직접 필요한 함수만 가져오기
export { 
  getMemoryInfo, 
  optimizeMemory, 
  forceGarbageCollection 
} from '../nativeModuleClient';

// 요청 함수 내보내기
export {
  requestNativeMemoryInfo,
  requestNativeMemoryOptimization
} from '../native-memory-bridge';