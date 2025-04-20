/**
 * 시스템 모니터링 유틸리티
 * 
 * 메모리, CPU, GPU 등 시스템 리소스 상태를 모니터링합니다.
 */

import { SystemStatus, MemoryUsageLevel, ProcessingMode, MemoryInfo, GpuInfo as GpuInfoType } from '@/types';
import { getMemoryUsageLevel } from './enum-converters';
import { nativeModuleClient } from './nativeModuleClient';
import { getGpuInfo } from './gpu-acceleration';

// 모니터링 상태
let isMonitoring = false;
let monitorInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL = 5000; // 5초

// 시스템 상태 캐시
let cachedStatus: SystemStatus | null = null;
let statusUpdateTime = 0;
const STATUS_TTL = 5000; // 5초

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
async function checkSystemStatus(): Promise<void> {
  try {
    // Call the client methods
    const memoryInfo = await nativeModuleClient.getMemoryInfo();
    const gpuInfo = await getGpuInfo(); // Use the correct function
    const cpuUsage = await getCpuUsage(); // Use helper

    if (!memoryInfo) { // Handle null memoryInfo
      console.error('Failed to get memory info for status check.');
      // Potentially keep old cache or set default error state?
      return;
    }

    const percentUsed = memoryInfo.percent_used ?? 0;
    const memoryLevel = calculateMemoryLevel(percentUsed); // Use helper

    let processingMode: ProcessingMode = ProcessingMode.NORMAL; // Default
    // Determine processingMode based on available info
    if (memoryLevel === MemoryUsageLevel.CRITICAL) {
      processingMode = ProcessingMode.MEMORY_SAVING;
    } else if (memoryLevel === MemoryUsageLevel.HIGH) {
      processingMode = ProcessingMode.CPU_INTENSIVE;
    } else if (gpuInfo?.isHardwareAccelerated) { // Check the correct property
      processingMode = ProcessingMode.GPU_INTENSIVE;
    }

    // Update cache
    cachedStatus = {
      cpuUsage,
      memoryUsage: percentUsed, // Use percent_used directly
      memoryUsageMB: memoryInfo.heap_used_mb ?? 0,
      totalMemoryMB: memoryInfo.heap_total ? (memoryInfo.heap_total / (1024 * 1024)) : 0, // Calculate if possible
      memoryLevel,
      processingMode, // Assign determined mode
      isOptimizing: false, // Placeholder - needs actual state tracking
      lastOptimizationTime: 0, // Placeholder
      uptime: Math.round(performance.now() / 1000), // Example
      // Optional details (match the structure in getSystemStatus)
      memory: {
        percentUsed: percentUsed,
        level: memoryLevel,
        heapUsedMB: memoryInfo.heap_used_mb ?? 0,
        rssMB: memoryInfo.rss_mb ?? 0
      },
      processing: {
        mode: processingMode, // Use determined mode
        gpuEnabled: Boolean(gpuInfo?.isHardwareAccelerated) // Use correct property
      },
      optimizations: { // Placeholder
        count: 0,
        lastTime: 0
      }
    };
    statusUpdateTime = Date.now();

  } catch (error) {
    console.error('Error checking system status:', error);
    // Optionally clear cache or set an error state
    cachedStatus = null;
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
 * @param includeDetails 상세 정보 포함 여부 (기본값: false)
 * @param forceRefresh 강제 갱신 여부 (기본값: false)
 * @returns Promise<SystemStatus> 시스템 상태 정보
 */
export async function getSystemStatus(includeDetails = false, forceRefresh = false): Promise<SystemStatus> {
  const startTime = performance.now();
  const now = Date.now();

  // Return cached status if valid and not forcing refresh
  if (!forceRefresh && cachedStatus && now - statusUpdateTime < STATUS_TTL) {
    console.log(`Returning cached system status (${((now - statusUpdateTime) / 1000).toFixed(1)}s old)`);
    // Filter details if not requested
    if (!includeDetails && cachedStatus) {
      const { memory, processing, optimizations, ...basicStatus } = cachedStatus;
      return basicStatus as SystemStatus; // Need to ensure basicStatus matches SystemStatus without optional fields
    }
    return cachedStatus;
  }

  console.log(`Fetching fresh system status (forceRefresh: ${forceRefresh})`);
  // Fetch new status and update cache
  await checkSystemStatus();

  const duration = performance.now() - startTime;
  console.log(`시스템 상태 확인 완료 (${duration.toFixed(2)}ms)`);

  // Return the newly cached status (or a default error state if cache is still null)
  const finalStatus = cachedStatus ?? { // Provide default structure on error
    cpuUsage: 0,
    memoryUsage: 0,
    memoryUsageMB: 0,
    totalMemoryMB: 0,
    memoryLevel: MemoryUsageLevel.NORMAL,
    processingMode: ProcessingMode.NORMAL,
    isOptimizing: false,
    uptime: 0,
  };

  // Filter details if not requested
  if (!includeDetails) {
    const { memory, processing, optimizations, ...basicStatus } = finalStatus;
    return basicStatus as SystemStatus;
  }

  return finalStatus;
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

// --- Helper function definitions (assuming they exist or define them) ---
// Placeholder: Function to get CPU Usage (needs implementation)
async function getCpuUsage(): Promise<number> {
  console.warn('getCpuUsage not implemented, returning 0');
  return 0;
}

// Placeholder: Function to calculate Memory Level (needs implementation or use enum-converters)
function calculateMemoryLevel(percentUsed: number): MemoryUsageLevel {
  console.warn('calculateMemoryLevel not implemented, returning NORMAL');
  if (percentUsed > 85) return MemoryUsageLevel.CRITICAL;
  if (percentUsed > 70) return MemoryUsageLevel.HIGH;
  if (percentUsed > 50) return MemoryUsageLevel.MEDIUM;
  if (percentUsed > 30) return MemoryUsageLevel.LOW;
  return MemoryUsageLevel.NORMAL;
}
// --- End Helper Functions ---
