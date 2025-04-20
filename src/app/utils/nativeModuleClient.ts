/**
 * 네이티브 모듈 클라이언트 API
 * 
 * 프론트엔드에서 네이티브 모듈 기능을 사용하기 위한 래퍼 함수들을 제공합니다.
 */

import {
  MemoryInfo,
  OptimizationResult,
  GCResult,
  GpuInfo,
  GpuTaskType,
  GpuComputationResult,
  TaskResult
} from '@/types';
import { OptimizationLevel } from '@/types/optimization-level';

// 브라우저 환경인지 확인 - 상수로 변경
const isBrowser = typeof window !== 'undefined';

/**
 * fetch 요청을 래핑하는 함수
 */
async function enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  } catch (error) {
    console.error(`Fetch 요청 실패 (${url}):`, error);
    throw error;
  }
}

/**
 * 네이티브 모듈 API 클라이언트
 */
class NativeModuleClient {
  private _nativeModule: any = null;
  private _isAvailable: boolean = false;
  private _isFallback: boolean = false;
  private moduleStatusCache: any = null;
  private lastStatusCheck: number = 0;
  private STATUS_CACHE_TTL = 60000;

  constructor() {
    this.loadNativeModule();
  }

  private async loadNativeModule() {
    console.log('Attempting to load native module...');
    this._isAvailable = true;
    this._isFallback = false;
    console.log('Native module loaded (simulated)');
  }

  public isNativeModuleAvailable(): boolean {
    return this._isAvailable;
  }

  public async getMemoryInfo(): Promise<MemoryInfo> {
    if (!isBrowser) {
      const fallbackInfo: MemoryInfo = {
        timestamp: Date.now(),
        heap_used: 0,
        heap_total: 0,
        heap_limit: 0,
        rss: 0,
        external: 0,
        array_buffers: 0,
        heap_used_mb: 0,
        rss_mb: 0,
        percent_used: 0,
      };
      return Promise.reject(fallbackInfo as any);
    }
    try {
      const response = await fetch('/api/native/memory');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: MemoryInfo = await response.json();
      return data;
    } catch (error: any) {
      console.error('메모리 정보 가져오기 실패:', error);
      const errorInfo: MemoryInfo = {
        timestamp: Date.now(),
        heap_used: 0,
        heap_total: 0,
        heap_limit: 0,
        rss: 0,
        external: 0,
        array_buffers: 0,
        heap_used_mb: 0,
        rss_mb: 0,
        percent_used: 0,
      };
      return Promise.reject(errorInfo as any);
    }
  }

  public async optimizeMemory(level: OptimizationLevel): Promise<OptimizationResult> {
    try {
      const response = await fetch('/api/native/memory', {
        method: 'PUT',
        body: JSON.stringify({ type: 'optimize', level: level.toString() }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('메모리 최적화 실패:', error);
      return Promise.reject({ success: false, optimizationLevel: level, timestamp: Date.now(), freedMemory: 0, error: error.message || 'Unknown error' } as OptimizationResult);
    }
  }

  public async requestGarbageCollection(): Promise<GCResult> {
    try {
      const response = await fetch('/api/native/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('가비지 컬렉션 실패:', error);
      return Promise.reject({ success: false, timestamp: Date.now(), freedMemory: 0, freedMB: 0, error: error.message || 'Unknown error' } as GCResult);
    }
  }

  public async getGpuInfo(): Promise<GpuInfo> {
    try {
      if (!isBrowser) {
        return this.createFallbackGpuInfo('서버 환경에서 실행 중');
      }
      if (!window.navigator) {
        return this.createFallbackGpuInfo('navigator 객체를 사용할 수 없음');
      }
      try {
        const response = await fetch('/api/native/gpu');
        if (!response.ok) {
          console.warn(`GPU 정보 요청 실패: ${response.status}. 폴백 GPU 정보 반환`);
          return this.createFallbackGpuInfo(`API 응답 오류: ${response.status}`);
        }
        const result = await response.json();
        if (result && result.success) {
          return result;
        } else {
          console.warn('GPU 정보 요청은 성공했지만 유효한 데이터가 없습니다. 폴백 정보 반환', result);
          return this.createFallbackGpuInfo('유효하지 않은 응답 데이터');
        }
      } catch (fetchError: any) {
        console.error('GPU 정보 요청 중 오류:', fetchError);
        return this.createFallbackGpuInfo(fetchError.message || '네트워크 오류');
      }
    } catch (error: any) {
      console.error('GPU 정보 가져오기 처리 중 예상치 못한 오류:', error);
      return this.createFallbackGpuInfo('예상치 못한 오류');
    }
  }

  private createFallbackGpuInfo(reason: string): GpuInfo {
    console.warn(`GPU 정보 폴백 사용: ${reason}`);
    const fallbackGpuInfo = {
      vendor: 'Software',
      driver_info: 'N/A',
      device_type: 'Software',
      backend: 'CPU',
      available: false,
      timestamp: Date.now(),
      acceleration_enabled: false,
    };
    return fallbackGpuInfo as any as GpuInfo;
  }

  public async setGpuAcceleration(enable: boolean): Promise<any> {
    try {
      const response = await fetch('/api/native/gpu/acceleration', {
        method: 'PUT',
        body: JSON.stringify({ enable }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`GPU 가속 설정 요청 실패: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error('GPU 가속 설정 오류:', error);
      return Promise.reject({ success: false, enabled: false, error: error.message || '알 수 없는 오류' });
    }
  }

  public async performGpuComputation(
    _data: any,
    taskType: GpuTaskType
  ): Promise<GpuComputationResult> {
    try {
      const response = await fetch('/api/native/gpu', {
        method: 'POST',
        body: JSON.stringify({ data: _data, computationType: taskType }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`GPU 계산 요청 실패: ${response.status}`);
      }
      const result: GpuComputationResult = await response.json();
      return result;
    } catch (error: any) {
      console.error('GPU 계산 오류:', error);
      const errorResult = {
        success: false,
        error: error.message || 'Unknown error',
        timestamp: Date.now(),
        result: null,
        performance: null
      };
      return Promise.reject(errorResult as any as GpuComputationResult);
    }
  }

  public async sendTaskToWorker(
    _taskType: string,
    _data: any
  ): Promise<TaskResult> {
    console.warn('sendTaskToWorker is not implemented yet');
    const errorResult = {
      success: false,
      error: 'Not implemented',
      result: null
    };
    return Promise.reject(errorResult as any as TaskResult);
  }

  public async getNativeModuleStatus(): Promise<any> {
    if (!isBrowser) {
      return Promise.reject({ success: false, error: 'Server environment', timestamp: Date.now() });
    }
    const now = Date.now();
    if (this.moduleStatusCache && now - this.lastStatusCheck < this.STATUS_CACHE_TTL) {
      return Promise.resolve(this.moduleStatusCache);
    }
    try {
      const response = await fetch('/api/native/status');
      if (!response.ok) {
        throw new Error(`네이티브 모듈 상태 요청 실패: ${response.status}`);
      }
      const result = await response.json();
      this.moduleStatusCache = result;
      this.lastStatusCheck = now;
      return result;
    } catch (error: any) {
      console.error('네이티브 모듈 상태 확인 실패:', error);
      return Promise.reject({ success: false, error: error.message || '알 수 없는 오류' });
    }
  }
}

export const nativeModuleClient = new NativeModuleClient();
