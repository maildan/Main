/**
 * GPU 설정 관리 유틸리티
 * 
 * 다양한、GPU 유형(내장, 모바일, 디스크리트 GPU)에 대한 설정을 관리합니다.
 */

import { isGPUAccelerationEnabled, getGPUInfo } from './memory/gpu-accelerator';

// GPU 설정 유형 정의
export interface GPUSettings {
  useHardwareAcceleration: boolean;  // 하드웨어 가속 사용 여부
  processingMode: string;            // 처리 모드
  optimizeForBattery: boolean;       // 배터리 최적화 모드
  memoryOptimization: 'low' | 'medium' | 'high'; // 메모리 최적화 레벨
  threadCount: number;               // 사용할 스레드 수
}

// 디바이스 유형 기반 최적화 설정
const GPU_PROFILES = {
  // 디스크리트 GPU (고성능)
  'DiscreteGpu': {
    useHardwareAcceleration: true,
    processingMode: 'gpu-intensive',
    optimizeForBattery: false,
    memoryOptimization: 'low' as const,
    threadCount: 16
  },
  
  // 내장 GPU (중간 성능)
  'IntegratedGpu': {
    useHardwareAcceleration: true,
    processingMode: 'normal',
    optimizeForBattery: true,
    memoryOptimization: 'medium' as const,
    threadCount: 8
  },
  
  // 저전력 GPU (모바일/시스템)
  'LowPower': {
    useHardwareAcceleration: false,
    processingMode: 'cpu-intensive',
    optimizeForBattery: true,
    memoryOptimization: 'high' as const,
    threadCount: 4
  }
};

/**
 * 현재 GPU 타입 감지
 * @returns GPU 타입 문자열
 */
export async function detectGPUType(): Promise<string> {
  try {
    // GPU 가속 사용 가능 여부 확인
    const isAccelerated = await isGPUAccelerationEnabled();
    if (!isAccelerated) {
      return 'LowPower';
    }
    
    // GPU 정보 가져오기
    const gpuInfo = getGPUInfo();
    const { renderer } = gpuInfo;
    
    // 고성능 GPU 확인
    if (renderer.includes('NVIDIA') || 
        renderer.includes('AMD') || 
        renderer.includes('Radeon') ||
        renderer.includes('GeForce')) {
      return 'DiscreteGpu';
    }
    
    // 내장 GPU 확인
    if (renderer.includes('Intel') ||
        renderer.includes('UHD') ||
        renderer.includes('Iris')) {
      return 'IntegratedGpu';
    }
    
    // 모바일 또는 저전력 GPU 확인
    if (renderer.includes('Apple') || 
        renderer.includes('Mali') || 
        renderer.includes('PowerVR') ||
        renderer.includes('Adreno')) {
      // 대부분의 최신 모바일 GPU는 내장 GPU와 비슷한 성능 제공
      return 'IntegratedGpu';
    }
    
    // 기타 또는 미확인 GPU - 기본적으로 내장 GPU로 취급
    return 'IntegratedGpu';
  } catch (error) {
    console.error('GPU 타입 감지 실패:', error);
    return 'LowPower'; // 오류 시 저전력 모드로 폴백
  }
}

/**
 * 배터리 상태 확인 (저전력 조건 판단용)
 */
async function checkBatteryStatus(): Promise<boolean> {
  try {
    // 배터리 API 지원 확인
    if ('getBattery' in navigator) {
      const battery = await (navigator as Navigator & {getBattery(): Promise<any>}).getBattery();
      return !battery.charging && battery.level < 0.3; // 충전 중이 아니고 30% 미만일 때 저전력 모드
    }
    return false;
  } catch (error) {
    console.warn('배터리 상태 확인 실패:', error);
    return false;
  }
}

/**
 * 시스템 메모리 확인
 */
function checkSystemMemory(): number {
  try {
    // 메모리 API 지원 확인
    if ('deviceMemory' in navigator) {
      return (navigator as Navigator & {deviceMemory: number}).deviceMemory;
    }
    return 0; // 알 수 없음
  } catch (error) {
    console.warn('시스템 메모리 확인 실패:', error);
    return 0;
  }
}

/**
 * GPU 타입에 최적화된 설정 가져오기
 * @returns GPU 설정 객체
 */
export async function getOptimalGPUSettings(): Promise<GPUSettings> {
  try {
    const gpuType = await detectGPUType();
    
    // 배터리 상태 확인 (가능한 경우)
    const isOnBattery = await checkBatteryStatus();
    
    // 기본 설정 가져오기
    const settings = { ...GPU_PROFILES[gpuType as keyof typeof GPU_PROFILES] };
    
    // 배터리 상태에 따른 설정 조정 
    if (isOnBattery && gpuType === 'DiscreteGpu') {
      settings.processingMode = 'normal';
      settings.threadCount = 8;
    }
    
    // 디바이스 메모리에 따른 설정 조정
    const deviceMemory = checkSystemMemory();
    
    if (deviceMemory <= 2) {
      // 낮은 메모리 기기
      settings.memoryOptimization = 'high';
      settings.threadCount = Math.min(settings.threadCount, 4);
    } else if (deviceMemory <= 4) {
      // 중간 메모리 기기
      settings.memoryOptimization = 'medium';
    }
    
    return settings;
  } catch (error) {
    console.error('최적 GPU 설정 계산 실패:', error);
    
    // 오류 발생 시 안전한 기본값 반환
    return {
      useHardwareAcceleration: false,
      processingMode: 'normal',
      optimizeForBattery: true,
      memoryOptimization: 'medium',
      threadCount: 4
    };
  }
}

/**
 * 현재 설정에 따라 GPU 사용 최적화
 * @param settings GPU 설정 객체
 */
export async function applyGPUSettings(settings: GPUSettings): Promise<boolean> {
  try {
    // 하드웨어 가속 설정
    // 실제 구현에서는 여기에 설정 적용 로직 추가
    console.log('GPU 설정 적용:', settings);
    
    // Electron IPC를 통해 메인 프로세스에 설정 전달 (지원되는 경우)
    if (window.electronAPI && window.electronAPI.saveSettings) {
      await window.electronAPI.saveSettings({
        // 다른 설정과 함께 GPU 설정 전달
        useHardwareAcceleration: settings.useHardwareAcceleration,
        processingMode: settings.processingMode
      });
    }
    
    return true;
  } catch (error) {
    console.error('GPU 설정 적용 중 오류:', error);
    return false;
  }
}

/**
 * GPU 기능 확인 및 권장 설정 가져오기
 * @returns 권장 설정 및 GPU 정보
 */
export async function getGPURecommendations() {
  try {
    const gpuType = await detectGPUType();
    const recommendedSettings = await getOptimalGPUSettings();
    const gpuInfo = getGPUInfo();
    
    return {
      gpuType,
      gpuInfo,
      recommendedSettings,
      isAccelerationAvailable: await isGPUAccelerationEnabled(),
      recommendation: getGPURecommendationMessage(gpuType, recommendedSettings)
    };
  } catch (error) {
    console.error('GPU 권장 설정 가져오기 실패:', error);
    
    return {
      gpuType: 'Unknown',
      gpuInfo: { renderer: 'Unknown', vendor: 'Unknown', isAccelerated: false },
      recommendedSettings: GPU_PROFILES.LowPower,
      isAccelerationAvailable: false,
      recommendation: 'GPU 정보를 가져올 수 없어 기본 CPU 처리 모드를 권장합니다.'
    };
  }
}

/**
 * GPU 타입과 설정에 따른 권장 메시지 생성
 */
function getGPURecommendationMessage(gpuType: string, settings: GPUSettings): string {
  switch (gpuType) {
    case 'DiscreteGpu':
      return '고성능 디스크리트 GPU가 감지되었습니다. GPU 가속화를 활성화하면 최상의 성능을 얻을 수 있습니다.';
    case 'IntegratedGpu':
      return '내장 GPU가 감지되었습니다. 균형 잡힌 성능과 전력 효율성을 위해 표준 설정을 권장합니다.';
    case 'LowPower':
      return '저전력 GPU가 감지되었습니다. 메모리와 배터리 사용을 최적화하기 위해 CPU 중심 처리를 권장합니다.';
    default:
      return '시스템에 맞는 기본 설정이 적용되었습니다.';
  }
}
