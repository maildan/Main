/**
 * 시스템 모니터링 유틸리티
 * 
 * 메모리, CPU, GPU 등 시스템 리소스 상태를 모니터링합니다.
 */

import {
  MemoryInfo,
  MemoryUsageLevel,
  ProcessingMode
} from '@/types';
import { getMemoryInfo } from './memory/memory-info';
import { optimizeMemory } from './memory-optimizer';
import { evaluateMemoryStatus } from './memory-management';
// import { getGpuInformation } from './gpu-acceleration';
// 또는
// import { getGpuInformation as _getGpuInformation } from './gpu-acceleration';

// SystemStatus 인터페이스를 가져오지 못하므로 직접 정의
interface SystemStatus {
  memory: {
    info: MemoryInfo | null;
    percentUsed: number;
    level: MemoryUsageLevel;
    needsOptimization: boolean;
    lastOptimization?: number;
  };
  processing: {
    mode: ProcessingMode;
    cpuUsage?: number;
    gpuEnabled: boolean;
    gpuInfo?: any;
  };
  timestamp: number;
}

// 모니터링 상태
let isMonitoring = false;
let monitorInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL = 5000; // 5초

// 시스템 상태 캐시
let cachedStatus: SystemStatus | null = null;
let _statusUpdateTime = 0;
const _STATUS_TTL = 3000; // 3초

// 모니터링 이벤트 리스너
const listeners: Array<(status: SystemStatus) => void> = [];

/**
 * 시스템 모니터링 시작
 * @param interval 체크 간격 (ms)
 */
export function startSystemMonitoring(interval: number = CHECK_INTERVAL) {
  if (isMonitoring) return;

  isMonitoring = true;

  // 즉시 첫 번째 체크 수행
  checkSystemStatus();

  // 주기적 체크 설정
  monitorInterval = setInterval(checkSystemStatus, interval);

  console.log(`시스템 모니터링 시작 (간격: ${interval}ms)`);
}

/**
 * 시스템 모니터링 중지
 */
export function stopSystemMonitoring() {
  if (!isMonitoring) return;

  isMonitoring = false;

  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }

  console.log('시스템 모니터링 중지');
}

/**
 * 시스템 상태 확인 및 업데이트
 */
async function checkSystemStatus() {
  try {
    const memoryInfo = await getMemoryInfo();
    // const gpuInfo = await getGpuInformation();

    if (!memoryInfo) {
      console.error('메모리 정보를 가져오는 데 실패했습니다');
      return;
    }

    const memoryStatus = evaluateMemoryStatus(memoryInfo);
    const percentUsed = memoryStatus.percentUsed;

    // 메모리 레벨 결정 로직 수정
    let memoryLevel: MemoryUsageLevel;
    if (memoryStatus.needsOptimization) {
      memoryLevel = MemoryUsageLevel.CRITICAL;
    } else if (percentUsed > 70) {
      memoryLevel = MemoryUsageLevel.HIGH;
    } else if (percentUsed > 50) {
      memoryLevel = MemoryUsageLevel.MEDIUM;
    } else {
      memoryLevel = MemoryUsageLevel.LOW;
    }

    // 처리 모드 결정
    let processingMode: ProcessingMode;
    const gpuEnabled = typeof window !== 'undefined' && !!(window as any).__gpuAccelerationEnabled;

    if (memoryLevel === MemoryUsageLevel.CRITICAL) {
      processingMode = ProcessingMode.MEMORY_SAVING;
    } else if (memoryLevel === MemoryUsageLevel.HIGH) {
      processingMode = ProcessingMode.NORMAL;
    } else if (gpuEnabled) {
      processingMode = ProcessingMode.GPU_INTENSIVE;
    } else {
      processingMode = ProcessingMode.CPU_INTENSIVE;
    }

    // 시스템 상태 업데이트
    const status: SystemStatus = {
      memory: {
        info: memoryInfo,
        percentUsed: percentUsed,
        level: memoryLevel,
        needsOptimization: memoryStatus.needsOptimization
      },
      processing: {
        mode: processingMode,
        gpuEnabled
      },
      timestamp: Date.now()
    };

    // 캐시 업데이트
    cachedStatus = status;
    _statusUpdateTime = Date.now();

    // 리스너에게 알림
    notifyListeners(status);

    // 전역 객체에 상태 저장 (브라우저 환경인 경우)
    if (typeof window !== 'undefined') {
      // 타입 안전하게 접근
      if (!window.__memoryManager) {
        window.__memoryManager = { settings: {} };
      }
      if (window.__memoryManager) {
        window.__memoryManager.memoryInfo = memoryInfo;
      }
    }
  } catch (error) {
    console.error('시스템 상태 확인 오류:', error);
  }
}

/**
 * 모든 리스너에게 상태 업데이트 알림
 */
function notifyListeners(status: SystemStatus) {
  listeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('시스템 상태 리스너 오류:', error);
    }
  });
}

/**
 * 시스템 상태 업데이트 리스너 등록
 * @param listener 상태 업데이트 리스너 함수
 * @returns 구독 해제 함수
 */
export function subscribeToSystemStatus(listener: (status: SystemStatus) => void): () => void {
  listeners.push(listener);

  // 이미 캐시된 상태가 있다면 즉시 전달
  if (cachedStatus) {
    listener(cachedStatus);
  }

  // 리스너 제거 함수 반환
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * 시스템 상태 가져오기
 * @param withOptimizationCheck 최적화 필요 여부 확인 포함
 */
export async function getSystemStatus(withOptimizationCheck = false): Promise<SystemStatus> {
  // 메모리 정보 가져오기
  const memoryInfo = await getMemoryInfo();

  // 메모리 평가 결과
  const memoryStatus = memoryInfo ? evaluateMemoryStatus(memoryInfo) : {
    status: 'unknown',
    message: '메모리 정보를 가져올 수 없음',
    percentUsed: 0,
    needsOptimization: false
  };

  // 메모리 사용량 레벨 결정
  let memoryLevel: MemoryUsageLevel;
  const percentUsed = memoryStatus.percentUsed;

  if (percentUsed > 90) {
    memoryLevel = MemoryUsageLevel.CRITICAL;
  } else if (percentUsed > 70) {
    memoryLevel = MemoryUsageLevel.HIGH;
  } else if (percentUsed > 50) {
    memoryLevel = MemoryUsageLevel.MEDIUM;
  } else {
    memoryLevel = MemoryUsageLevel.LOW;
  }

  // 처리 모드 결정 (CPU/GPU 등)
  let processingMode: ProcessingMode;
  const gpuEnabled = typeof window !== 'undefined' && !!(window as any).__gpuAccelerationEnabled;

  // 처리 모드 설정 - enum 값으로 수정
  if (memoryLevel === MemoryUsageLevel.CRITICAL) {
    processingMode = ProcessingMode.MEMORY_SAVING;
  } else if (memoryLevel === MemoryUsageLevel.HIGH) {
    processingMode = ProcessingMode.NORMAL;
  } else if (gpuEnabled) {
    processingMode = ProcessingMode.GPU_INTENSIVE;
  } else {
    processingMode = ProcessingMode.CPU_INTENSIVE;
  }

  // 시스템 상태 객체 구성
  const status: SystemStatus = {
    memory: {
      info: memoryInfo,
      percentUsed: percentUsed,
      level: memoryLevel,
      needsOptimization: memoryStatus.needsOptimization
    },
    processing: {
      mode: processingMode,
      gpuEnabled
    },
    timestamp: Date.now()
  };

  // 메모리 최적화 체크
  if (withOptimizationCheck && memoryStatus.needsOptimization) {
    try {
      // 중/높음 레벨 이상이면 최적화 실행
      if (memoryLevel >= MemoryUsageLevel.MEDIUM) {
        const optimizationLevel = memoryLevel === MemoryUsageLevel.CRITICAL ? 4 :
          memoryLevel === MemoryUsageLevel.HIGH ? 3 : 2;

        const result = await optimizeMemory(optimizationLevel, memoryLevel === MemoryUsageLevel.CRITICAL);
        if (result) {
          status.memory.lastOptimization = Date.now();
        }
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
    }
  }

  return status;
}

/**
 * 배터리 상태 확인 (브라우저 환경에서만 작동)
 * @returns 배터리 정보 또는 null
 */
export async function getBatteryStatus(): Promise<any> {
  if (typeof navigator === 'undefined' || !navigator.getBattery) {
    return null;
  }

  try {
    // 타입 안전하게 접근
    const getBattery = navigator.getBattery;
    if (getBattery) {
      const battery = await getBattery();

      return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    }
    return null;
  } catch (error) {
    console.error('배터리 상태 확인 오류:', error);
    return null;
  }
}

/**
 * 네트워크 상태 확인 (브라우저 환경에서만 작동)
 */
export function getNetworkStatus(): any {
  if (typeof navigator === 'undefined') {
    return null;
  }

  // 타입 안전하게 접근
  const connection = (navigator as any).connection;
  if (!connection) {
    return { online: navigator.onLine };
  }

  return {
    online: navigator.onLine,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
}
