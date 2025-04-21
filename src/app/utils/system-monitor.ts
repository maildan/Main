/**
 * 시스템 모니터링 유틸리티
 *
 * 메모리, CPU, GPU 등 시스템 리소스 상태를 모니터링합니다.
 */

import { getMemoryInfo } from './nativeModuleClient';
import { getGpuInformation } from './gpu-acceleration';
import { SystemStatus, ProcessingMode, MemoryUsageLevel as AppMemoryUsageLevel } from '@/types';
import { getMemoryUsageLevel } from './enum-converters';

// 모니터링 상태
let isMonitoring = false;
let monitorInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL = 5000; // 5초

// 시스템 상태 캐시
let cachedStatus: SystemStatus | null = null;
let statusUpdateTime = 0;
const STATUS_TTL = 3000; // 3초

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
    const memoryResponse = await getMemoryInfo();
    const gpuInfo = await getGpuInformation();

    if (!memoryResponse.success) {
      console.error('메모리 정보를 가져오는 데 실패했습니다:', memoryResponse.error);
      return;
    }

    const memoryInfo = memoryResponse.memoryInfo;
    const percentUsed = memoryInfo.percentUsed;

    // getMemoryUsageLevel 함수는 enum-converters.ts의 값을 반환하므로
    // 애플리케이션 레벨의 MemoryUsageLevel로 변환합니다.
    const memoryLevel = convertToAppMemoryLevel(getMemoryUsageLevel(percentUsed));

    // 처리 모드 결정 (ProcessingMode 열거형 값 사용)
    let processingMode: ProcessingMode = ProcessingMode.NORMAL;

    // 변환된 MemoryUsageLevel 값을 사용
    if (memoryLevel === AppMemoryUsageLevel.CRITICAL) {
      processingMode = ProcessingMode.MEMORY_SAVING;
    } else if (memoryLevel === AppMemoryUsageLevel.HIGH) {
      processingMode = ProcessingMode.CPU_INTENSIVE;
    } else if (gpuInfo?.available && gpuInfo?.accelerationEnabled) {
      processingMode = ProcessingMode.GPU_INTENSIVE;
    }

    // 시스템 상태 업데이트
    const status: SystemStatus = {
      memoryUsageLevel: memoryLevel,
      cpuUsage: 0, // 현재 API에서 CPU 사용량 정보가 없음
      memoryInfo: memoryInfo,
      processingMode: processingMode,
      timestamp: Date.now(),
      optimizationCount: 0,
      lastOptimization: 0,
    };

    // 캐시 업데이트
    cachedStatus = status;
    statusUpdateTime = Date.now();

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
 * enum-converters의 MemoryUsageLevel을 애플리케이션의 MemoryUsageLevel로 변환
 */
function convertToAppMemoryLevel(level: number): AppMemoryUsageLevel {
  switch (level) {
    case 0:
      return AppMemoryUsageLevel.NORMAL;
    case 1:
      return AppMemoryUsageLevel.LOW;
    case 2:
      return AppMemoryUsageLevel.MEDIUM;
    case 3:
      return AppMemoryUsageLevel.HIGH;
    case 4:
      return AppMemoryUsageLevel.CRITICAL;
    default:
      return AppMemoryUsageLevel.NORMAL;
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
 * 현재 시스템 상태 가져오기
 * @param forceRefresh 강제 갱신 여부
 */
export async function getSystemStatus(forceRefresh = false): Promise<SystemStatus> {
  const now = Date.now();

  // 캐시가 유효하고 강제 갱신이 아닌 경우 캐시된 상태 반환
  if (cachedStatus && now - statusUpdateTime < STATUS_TTL && !forceRefresh) {
    return cachedStatus;
  }

  // 새로운 상태 확인
  await checkSystemStatus();

  // 캐시된 상태가 있으면 반환, 없으면 기본값 반환
  return (
    cachedStatus || {
      memoryUsageLevel: AppMemoryUsageLevel.NORMAL,
      cpuUsage: 0,
      memoryInfo: {
        timestamp: Date.now(),
        heap_used: 0,
        heap_total: 0,
        heap_limit: 0,
        rss: 0,
        heap_used_mb: 0,
        rss_mb: 0,
        percent_used: 0,
      },
      processingMode: ProcessingMode.NORMAL,
      timestamp: now,
      optimizationCount: 0,
      lastOptimization: 0,
    }
  );
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
        dischargingTime: battery.dischargingTime,
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
    saveData: connection.saveData,
  };
}
