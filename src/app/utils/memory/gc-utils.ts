import { GCResult } from './types';
import { getMemoryUsage } from './memory-info';

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
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      window.electronAPI.requestGC();
    }
  } catch (error) {
    console.warn('GC 제안 중 오류:', error);
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
