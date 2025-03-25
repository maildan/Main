/**
 * GPU 가속화 유틸리티
 * 
 * 이 모듈은 Rust 네이티브 모듈을 사용하여 GPU 가속화를 관리합니다.
 * 모든 GPU 관련 작업은 네이티브 모듈에서 처리됩니다.
 */

import { getGpuInfo, setGpuAcceleration } from './nativeModuleClient';

/**
 * GPU 가속화 상태 확인
 * @returns 가속화 활성화 여부
 */
export async function isGpuAccelerationEnabled(): Promise<boolean> {
  try {
    // 모듈을 다시 가져오는 대신 이미 import된 함수 사용
    const response = await getGpuInfo();
    
    if (response.success && response.gpuInfo) {
      return response.gpuInfo.accelerationEnabled || false;
    }
    return false;
  } catch (error) {
    console.error('GPU 가속 상태 확인 오류:', error);
    return false;
  }
}

/**
 * GPU 정보 가져오기
 * @returns GPU 정보 객체
 */
export async function getGpuInformation() {
  try {
    const response = await getGpuInfo();
    
    if (!response.success || !response.gpuInfo) {
      return null;
    }
    
    return response.gpuInfo;
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * GPU 가속화 활성화/비활성화
 * @param enable 활성화 여부
 * @returns 성공 여부
 */
export async function toggleGpuAcceleration(enable: boolean): Promise<boolean> {
  try {
    const response = await setGpuAcceleration(enable);
    
    // 앱 재시작이 필요한 경우 처리
    if (response.success && response.result && typeof window !== 'undefined') {
      // 설정 변경이 재시작을 필요로 할 수 있음을 알림
      if (window.localStorage) {
        window.localStorage.setItem('gpu-acceleration-change', 'true');
      }
      
      // 선택적: electron API를 통해 재시작 프롬프트 표시
      if (window.electronAPI?.showRestartPrompt) {
        window.electronAPI.showRestartPrompt('GPU 가속 설정이 변경되었습니다.');
      }
    }
    
    return response.success && response.result === true;
  } catch (error) {
    console.error('GPU 가속화 설정 오류:', error);
    return false;
  }
}

/**
 * GPU 가속화 활성화
 * @returns 성공 여부
 */
export async function enableGpuAcceleration(): Promise<boolean> {
  return toggleGpuAcceleration(true);
}

/**
 * GPU 가속화 비활성화
 * @returns 성공 여부
 */
export async function disableGpuAcceleration(): Promise<boolean> {
  return toggleGpuAcceleration(false);
}

// 간단한 전역 API 설정
if (typeof window !== 'undefined') {
  window.__gpuAccelerator = {
    isGpuAccelerationEnabled,
    getGpuInformation,
    toggleGpuAcceleration,
    enableGpuAcceleration,
    disableGpuAcceleration
  };
}
