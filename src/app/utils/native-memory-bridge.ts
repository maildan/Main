/**
 * 네이티브 메모리 모듈 브리지
 * 
 * 이 모듈은 네이티브 모듈과 연결하여 메모리 관련 기능을 제공합니다.
 */

import { MemoryInfo, GCResult, OptimizationLevel } from '@/types';
import { toNativeOptimizationLevel } from './enum-converters';

/**
 * 네이티브 모듈 로드
 * 빌드 타임에 사용 가능한 모든 메서드를 찾을 수 없어 any 타입 사용
 */
async function loadNativeModule(): Promise<any> {
  try {
    // Typescript 타입 오류 피하기 위해 dynamic import 사용
    const moduleImport = await import('../../server/native').catch(() => null);

    // import의 결과가 default 속성을 가지거나 직접 객체인 경우 처리
    if (moduleImport) {
      return 'default' in moduleImport ? moduleImport.default : moduleImport;
    }

    return null;
  } catch (error) {
    console.error('네이티브 모듈 로드 오류:', error);
    return null;
  }
}

/**
 * 네이티브 메모리 정보 요청
 * @returns Promise<MemoryInfo | null>
 */
export async function requestNativeMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.getMemoryInfo !== 'function') {
      return null;
    }

    const result = await nativeModule.getMemoryInfo();

    // 결과가 문자열인 경우 JSON 파싱
    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as MemoryInfo;
      } catch (e) {
        console.error('메모리 정보 파싱 오류:', e);
        return null;
      }
    }

    return result as MemoryInfo;
  } catch (error) {
    console.error('네이티브 메모리 정보 요청 오류:', error);
    return null;
  }
}

/**
 * 네이티브 가비지 컬렉션 요청
 * @returns Promise<GCResult | null>
 */
export async function requestNativeGarbageCollection(): Promise<GCResult | null> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.performGarbageCollection !== 'function') {
      return null;
    }

    const result = await nativeModule.performGarbageCollection();

    // 결과가 문자열인 경우 JSON 파싱
    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as GCResult;
      } catch (e) {
        console.error('GC 결과 파싱 오류:', e);
        return null;
      }
    }

    return result as GCResult;
  } catch (error) {
    console.error('네이티브 가비지 컬렉션 요청 오류:', error);
    return null;
  }
}

/**
 * 네이티브 메모리 최적화 요청
 * @param level 최적화 레벨
 * @param emergency 긴급 여부
 * @returns Promise<any | null>
 */
export async function requestNativeMemoryOptimization(
  level: OptimizationLevel | number,
  emergency: boolean = false
): Promise<any | null> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.optimizeMemory !== 'function') {
      return null;
    }

    // 네이티브 최적화 레벨로 변환
    const nativeLevel = typeof level === 'number'
      ? toNativeOptimizationLevel(level as OptimizationLevel)
      : toNativeOptimizationLevel(level);

    const result = await nativeModule.optimizeMemory(nativeLevel, emergency);

    // 결과가 문자열인 경우 JSON 파싱
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch (e) {
        console.error('최적화 결과 파싱 오류:', e);
        return null;
      }
    }

    return result;
  } catch (error) {
    console.error('네이티브 메모리 최적화 요청 오류:', error);
    return null;
  }
}

/**
 * 네이티브 모듈 상태 확인
 * @returns Promise<{ available: boolean, version: string }>
 */
export async function getNativeModuleStatus(): Promise<{
  available: boolean;
  version: string;
  fallbackMode: boolean;
}> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule) {
      return { available: false, version: 'unavailable', fallbackMode: true };
    }

    let version = 'unknown';
    if (typeof nativeModule.getNativeModuleVersion === 'function') {
      try {
        version = await nativeModule.getNativeModuleVersion();
      } catch (e) {
        console.warn('네이티브 모듈 버전 확인 오류:', e);
      }
    }

    let fallbackMode = false;
    if (typeof nativeModule.isFallbackMode === 'function') {
      try {
        fallbackMode = await nativeModule.isFallbackMode();
      } catch (e) {
        console.warn('네이티브 모듈 폴백 모드 확인 오류:', e);
        fallbackMode = true;
      }
    }

    return {
      available: true,
      version,
      fallbackMode
    };
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 오류:', error);
    return {
      available: false,
      version: 'error',
      fallbackMode: true
    };
  }
}

/**
 * GPU 정보 가져오기
 */
export async function getGpuInfo(): Promise<any> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.getGpuInfo !== 'function') {
      return { success: false, error: 'GPU 정보 함수 사용 불가' };
    }

    return await nativeModule.getGpuInfo();
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * GPU 가속화 설정
 * @param enable 활성화 여부
 */
export async function setGpuAcceleration(enable: boolean): Promise<any> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.setGpuAcceleration !== 'function') {
      return { success: false, error: 'GPU 가속화 함수 사용 불가' };
    }

    return await nativeModule.setGpuAcceleration(enable);
  } catch (error) {
    console.error('GPU 가속화 설정 오류:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * GPU 계산 수행
 * @param data 계산 데이터
 * @param taskType 작업 유형
 */
export async function performGpuComputation<T = unknown>(
  data: unknown,
  taskType: string
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const nativeModule = await loadNativeModule();

    if (!nativeModule || typeof nativeModule.performGpuComputation !== 'function') {
      return { success: false, error: 'GPU 계산 함수 사용 불가' };
    }

    const result = await nativeModule.performGpuComputation(data, taskType);
    return result;
  } catch (error) {
    console.error('GPU 계산 오류:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 네이티브 메모리 설정 정보 가져오기
 * @returns Promise<any | null>
 */
export async function getNativeMemorySettings(): Promise<any | null> {
  try {
    const nativeModule = await loadNativeModule();
    if (!nativeModule || typeof nativeModule.get_memory_settings_json !== 'function') {
      return null;
    }

    const settingsJson = nativeModule.get_memory_settings_json();
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('네이티브 메모리 설정 가져오기 오류:', error);
    return null;
  }
}

/**
 * 네이티브 메모리 설정 업데이트
 * @param settings 업데이트할 설정 객체
 * @returns Promise<boolean>
 */
export async function updateNativeMemorySettings(settings: any): Promise<boolean> {
  try {
    const nativeModule = await loadNativeModule();
    if (!nativeModule || typeof nativeModule.update_memory_settings_json !== 'function') {
      return false;
    }

    const settingsJson = JSON.stringify(settings);
    const result = nativeModule.update_memory_settings_json(settingsJson);

    // 결과가 JSON 문자열인 경우 파싱
    if (typeof result === 'string') {
      const parsed = JSON.parse(result);
      return parsed.success === true;
    }

    return !!result;
  } catch (error) {
    console.error('네이티브 메모리 설정 업데이트 오류:', error);
    return false;
  }
}
