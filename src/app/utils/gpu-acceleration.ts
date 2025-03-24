/**
 * GPU 가속화 관리
 * 
 * 메모리 최적화와 연계하여 GPU 가속화를 관리하는 유틸리티 함수들을 제공합니다.
 * 메모리 부하가 높을 때 자동으로 GPU에서 CPU로 전환합니다.
 */

import { setGpuAcceleration, getGpuInfo, performGpuComputation } from './nativeModuleClient';

// GPU 가속화 상태
let gpuAccelerationEnabled = false;
let lastGpuStatusCheck = 0;
const GPU_STATUS_CHECK_INTERVAL = 60000; // 1분마다 상태 확인

// GPU 연산 폴백 설정
interface ComputationStrategy {
  gpu: <T>(data: any) => Promise<T>;
  cpu: <T>(data: any) => Promise<T>;
}

// 연산 유형별 전략 맵
const computationStrategies: Record<string, ComputationStrategy> = {};

/**
 * GPU 가속화 활성화/비활성화
 * @param enable 활성화 여부
 * @returns Promise<boolean> 성공 여부
 */
export async function toggleGpuAcceleration(enable: boolean): Promise<boolean> {
  try {
    // 이미 동일한 상태면 무시
    if (gpuAccelerationEnabled === enable) {
      return true;
    }
    
    console.log(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 시도`);
    
    // 네이티브 모듈을 통해 GPU 가속화 설정
    const result = await setGpuAcceleration(enable);
    
    if (result.success) {
      gpuAccelerationEnabled = enable;
      console.log(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 성공`);
      
      // DOM 통지 (다른 컴포넌트가 반응할 수 있도록)
      const event = new CustomEvent('gpu-acceleration-changed', { detail: { enabled: enable } });
      window.dispatchEvent(event);
      
      return true;
    } else {
      console.error(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 실패:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 오류:`, error);
    return false;
  }
}

/**
 * GPU 연산 수행 (자동 폴백)
 * 메모리 상황과 GPU 가용성에 따라 자동으로 CPU 폴백을 사용합니다.
 * 
 * @param data 연산 데이터
 * @param computationType 연산 유형
 * @returns Promise<T> 연산 결과
 */
export async function executeGpuComputation<T = any>(
  data: any,
  computationType: string = 'default'
): Promise<T> {
  try {
    // 강제 CPU 모드가 설정되어 있는지 확인
    const forceCpu = !gpuAccelerationEnabled || shouldForceCpuComputation();
    
    if (forceCpu) {
      console.log(`CPU 모드로 ${computationType} 연산 실행 (강제 CPU 모드)`);
      return await executeCpuComputation<T>(data, computationType);
    }
    
    // GPU 상태 확인 (캐싱된 결과 사용)
    const gpuAvailable = await checkGpuAvailability();
    
    if (!gpuAvailable) {
      console.log(`CPU 모드로 ${computationType} 연산 실행 (GPU 사용 불가)`);
      return await executeCpuComputation<T>(data, computationType);
    }
    
    // GPU 연산 시도
    console.log(`GPU 모드로 ${computationType} 연산 시도`);
    try {
      const response = await performGpuComputation(data, computationType);
      
      if (response.success && response.result) {
        return response.result as T;
      } else {
        throw new Error(response.error || 'GPU 연산 실패');
      }
    } catch (gpuError) {
      console.warn(`GPU 연산 실패, CPU로 폴백:`, gpuError);
      return await executeCpuComputation<T>(data, computationType);
    }
  } catch (error) {
    console.error('GPU 연산 오류:', error);
    throw error;
  }
}

/**
 * CPU 연산 실행
 * @param data 연산 데이터
 * @param computationType 연산 유형
 * @returns Promise<T> 연산 결과
 */
async function executeCpuComputation<T>(data: any, computationType: string): Promise<T> {
  // 해당 연산 유형에 대한 CPU 전략 사용
  if (computationStrategies[computationType] && computationStrategies[computationType].cpu) {
    return await computationStrategies[computationType].cpu<T>(data);
  }
  
  // 기본 CPU 연산 구현
  console.log(`기본 CPU 구현으로 ${computationType} 연산 실행`);
  
  // 연산 유형별 기본 구현
  switch (computationType) {
    case 'matrix-multiply':
      return performCpuMatrixMultiplication(data) as T;
    case 'image-processing':
      return performCpuImageProcessing(data) as T;
    case 'data-transform':
      return performCpuDataTransformation(data) as T;
    default:
      throw new Error(`지원되지 않는 연산 유형: ${computationType}`);
  }
}

/**
 * CPU 기반 행렬 곱셈
 */
function performCpuMatrixMultiplication(data: any): any {
  const { matrixA, matrixB } = data;
  
  if (!matrixA || !matrixB || !Array.isArray(matrixA) || !Array.isArray(matrixB)) {
    throw new Error('유효하지 않은 행렬 데이터');
  }
  
  const rowsA = matrixA.length;
  const colsA = matrixA[0].length;
  const rowsB = matrixB.length;
  const colsB = matrixB[0].length;
  
  if (colsA !== rowsB) {
    throw new Error('호환되지 않는 행렬 크기');
  }
  
  const result = new Array(rowsA).fill(0).map(() => new Array(colsB).fill(0));
  
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += matrixA[i][k] * matrixB[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return {
    result,
    dimensions: [rowsA, colsB],
    executionTime: 0, // 실제 구현에서는 성능 측정
    processingUnit: 'CPU'
  };
}

/**
 * CPU 기반 이미지 처리
 */
function performCpuImageProcessing(data: any): any {
  // 기본 구현 (실제 애플리케이션에서는 더 복잡한 처리 필요)
  const { imageData, operation } = data;
  
  if (!imageData || !operation) {
    throw new Error('유효하지 않은 이미지 처리 데이터');
  }
  
  // 간단한 이미지 처리 예제 (실제로는 더 복잡한 구현 필요)
  const result = {
    processedData: imageData, // 실제로는 변환 적용
    operation,
    dimensions: [imageData.width || 0, imageData.height || 0],
    executionTime: 0,
    processingUnit: 'CPU'
  };
  
  return result;
}

/**
 * CPU 기반 데이터 변환
 */
function performCpuDataTransformation(data: any): any {
  const { inputData, transformType } = data;
  
  if (!inputData || !transformType) {
    throw new Error('유효하지 않은 데이터 변환 요청');
  }
  
  // 데이터 변환 구현 (실제로는 변환 유형에 따라 다른 처리)
  const result = {
    transformedData: inputData, // 실제로는 변환 적용
    transformType,
    recordCount: Array.isArray(inputData) ? inputData.length : 1,
    executionTime: 0,
    processingUnit: 'CPU'
  };
  
  return result;
}

/**
 * GPU 가용성 확인 (캐싱 포함)
 * 너무 빈번한 체크를 방지하기 위해 결과를 캐싱합니다.
 */
export async function checkGpuAvailability(): Promise<boolean> {
  const now = Date.now();
  
  // 최근에 체크한 경우 캐시된 결과 반환
  if (now - lastGpuStatusCheck < GPU_STATUS_CHECK_INTERVAL) {
    return gpuAccelerationEnabled;
  }
  
  try {
    lastGpuStatusCheck = now;
    
    const response = await getGpuInfo();
    
    if (response.success && response.available) {
      console.log('GPU 가속화 사용 가능:', response.gpuInfo?.name);
      return true;
    } else {
      console.log('GPU 가속화 사용 불가:', response.error || '알 수 없는 이유');
      return false;
    }
  } catch (error) {
    console.error('GPU 가용성 확인 오류:', error);
    return false;
  }
}

/**
 * 현재 GPU 가속화 활성화 상태 확인
 */
export async function isGpuComputationActive(): Promise<boolean> {
  // 최근 상태 확인이 오래되었다면 다시 확인
  if (Date.now() - lastGpuStatusCheck > GPU_STATUS_CHECK_INTERVAL) {
    await checkGpuAvailability();
  }
  
  return gpuAccelerationEnabled;
}

/**
 * CPU 연산을 강제해야 하는지 결정
 * 시스템 상태에 따라 GPU 대신 CPU를 사용해야 하는 상황 감지
 */
function shouldForceCpuComputation(): boolean {
  // 메모리 부하가 높은 경우
  if (window.__memoryOptimizer && typeof window.__memoryOptimizer.getMemoryUsagePercentage === 'function') {
    const memUsage = window.__memoryOptimizer.getMemoryUsagePercentage();
    if (memUsage > 90) {
      return true;
    }
  }
  
  // 배터리 부족 상태 (노트북/모바일 기기) - 브라우저 호환성 문제 해결
  // Navigator.getBattery는 표준이 아니므로 타입스크립트 오류 발생
  if ('getBattery' in navigator && typeof (navigator as any).getBattery === 'function') {
    (navigator as any).getBattery().then((battery: any) => {
      if (battery.level < 0.15 && !battery.charging) {
        return true;
      }
    }).catch(() => false);
  }
  
  // 117번 라인 수정: 함수가 항상 정의되므로 조건문 대신 직접 호출
  const gpuResult = window.__gpuInfo?.isAccelerated();

  return false;
}

/**
 * 연산 전략 등록
 * 특정 연산 유형에 대한 CPU/GPU 구현을 등록합니다.
 */
export function registerComputationStrategy(
  computationType: string,
  gpuImplementation: <T>(data: any) => Promise<T>,
  cpuImplementation: <T>(data: any) => Promise<T>
): void {
  computationStrategies[computationType] = {
    gpu: gpuImplementation,
    cpu: cpuImplementation
  };
  
  console.log(`연산 전략 등록됨: ${computationType}`);
}

/**
 * 메모리 최적화 필요시 자동으로 GPU 비활성화하는 감시 시작
 */
export function startGpuMemoryMonitoring(): () => void {
  const CHECK_INTERVAL = 10000; // 10초마다 확인
  
  const intervalId = setInterval(async () => {
    try {
      if (window.__memoryOptimizer && typeof window.__memoryOptimizer.getMemoryUsagePercentage === 'function') {
        const memUsage = window.__memoryOptimizer.getMemoryUsagePercentage();
        
        if (memUsage > 90 && await isGpuComputationActive()) {
          console.warn(`높은 메모리 사용량(${memUsage.toFixed(1)}%) 감지, GPU 비활성화`);
          await toggleGpuAcceleration(false);
        } else if (memUsage < 75 && !await isGpuComputationActive() && gpuAccelerationEnabled === false) {
          console.log(`메모리 사용량(${memUsage.toFixed(1)}%) 정상화, GPU 재활성화`);
          await toggleGpuAcceleration(true);
        }
      }
    } catch (error) {
      console.error('GPU 메모리 모니터링 오류:', error);
    }
  }, CHECK_INTERVAL);
  
  return () => clearInterval(intervalId);
}

// 초기화 함수 - 애플리케이션 시작 시 호출
export async function initializeGpuAcceleration(): Promise<void> {
  try {
    const available = await checkGpuAvailability();
    
    if (available) {
      await toggleGpuAcceleration(true);
      console.log('GPU 가속화 초기화 완료');
    } else {
      console.log('GPU 가속화를 사용할 수 없어 CPU 모드로 실행');
    }
    
    // 자동 모니터링 시작
    startGpuMemoryMonitoring();
  } catch (error) {
    console.error('GPU 가속화 초기화 오류:', error);
    console.log('CPU 모드로 대체');
  }
}

/**
 * GPU 가속화가 활성화되어 있는지 확인
 * @returns 활성화 상태
 */
export function isGpuAccelerationEnabled(): boolean {
  try {
    return window.__gpuInfo?.isAccelerated() || false;
  } catch (error) {
    console.error('GPU 가속화 상태 확인 중 오류:', error);
    return false;
  }
}

/**
 * GPU가 지원되는지 확인
 * @returns 지원 여부
 */
export function isGpuSupported(): boolean {
  try {
    // 브라우저 환경 확인
    if (typeof window === 'undefined') return false;
    
    // 1. WebGL 지원 확인
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    // 2. GPU 관련 확장 기능 확인
    return !!gl && !!window.__gpuInfo;
  } catch (error) {
    console.error('GPU 지원 확인 중 오류:', error);
    return false;
  }
}
