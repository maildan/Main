import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../components/ToastContext';
import { MemoryOptimizerOptions } from './types';
import { getMemoryInfo, getMemoryUsagePercentage } from './memory-info';
import { internalOptimizeMemory } from './optimizer';
import { optimizeImageResources } from './image-optimizer';
import { requestGC } from './gc-utils';

/**
 * 메모리 최적화 훅 (통합 버전)
 * 이 훅은 memory-optimizer.ts의 버전을 대체합니다.
 * 
 * @param {MemoryOptimizerOptions} options 메모리 최적화 옵션
 * @returns {Object} 메모리 정보 및 컨트롤 함수
 */
export function useMemoryOptimizer(options: MemoryOptimizerOptions = {}) {
  // 기본 옵션 설정
  const {
    threshold = 75, // 기본 임계치 80MB에서 75MB로 낮춤
    checkInterval = 30000, // 기본 체크 간격 30초
    showWarnings = true,
    autoOptimize = true,
    debug = false,
  } = options;
  
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  
  // 메모리 정보 갱신 함수
  const updateMemoryInfo = useCallback(() => {
    const info = getMemoryInfo();
    setMemoryInfo(info);
    
    // 임계치 초과 체크
    if (info && showWarnings && info.heapUsedMB > threshold) {
      if (debug) {
        console.warn(`메모리 사용량 경고: ${info.heapUsedMB}MB (임계치: ${threshold}MB)`);
      }
      
      // 토스트 메시지로 경고 표시
      showToast(`메모리 사용량이 높습니다: ${info.heapUsedMB}MB`, 'warning');
      
      // 자동 최적화가 활성화된 경우 메모리 정리 수행
      if (autoOptimize) {
        runMemoryOptimization();
      }
    }
    
    return info;
  }, [threshold, showWarnings, autoOptimize, debug, showToast]);
  
  // 메모리 최적화 실행 함수
  const runMemoryOptimization = useCallback(async () => {
    if (isOptimizing) return; // 이미 최적화 중이면 중복 실행 방지
    
    try {
      setIsOptimizing(true);
      
      // 메모리 최적화 실행
      internalOptimizeMemory(false);
      
      // GC 요청이 처리될 시간 제공
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 최적화 후 메모리 정보 갱신
      updateMemoryInfo();
      
      // 완료 알림 (디버그 모드일 때만)
      if (debug) {
        console.log('메모리 최적화 완료');
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug]);
  
  // 긴급 메모리 최적화 실행 함수
  const runEmergencyOptimization = useCallback(async () => {
    if (isOptimizing) return;
    
    try {
      setIsOptimizing(true);
      showToast('긴급 메모리 최적화를 실행합니다...', 'info');
      
      // 적극적인 메모리 최적화 실행
      internalOptimizeMemory(true);
      
      // 이미지 리소스도 최적화
      await optimizeImageResources();
      
      // GC 요청 후 충분한 처리 시간 제공
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 최적화 후 메모리 정보 갱신
      const newInfo = updateMemoryInfo();
      
      // 최적화 결과 알림
      if (debug && newInfo) {
        showToast(`메모리 최적화 완료: ${newInfo.heapUsedMB}MB`, 'success');
      }
    } catch (error) {
      console.error('긴급 메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug, showToast]);
  
  // 주기적 메모리 모니터링 설정
  useEffect(() => {
    // 초기 메모리 정보 확인
    updateMemoryInfo();
    
    // 주기적인 메모리 체크 시작
    intervalRef.current = setInterval(() => {
      updateMemoryInfo();
    }, checkInterval);
    
    // 페이지 가시성 변경 이벤트에 따른 처리
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 페이지가 다시 보일 때 메모리 정보 갱신
        updateMemoryInfo();
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 클린업 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateMemoryInfo, checkInterval]);
  
  // 메인 프로세스로부터의 메모리 최적화 요청 처리
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Electron IPC 이벤트 리스너 설정 (메인 프로세스로부터의 GC 요청 처리)
    if (window.electronAPI && window.electronAPI.onRequestGC) {
      cleanup = window.electronAPI.onRequestGC((data: { emergency: boolean }) => {
        if (data.emergency) {
          runEmergencyOptimization();
        } else {
          runMemoryOptimization();
        }
        
        // 결과 알림
        if (window.electronAPI && window.electronAPI.rendererGCCompleted) {
          const info = getMemoryInfo();
          window.electronAPI.rendererGCCompleted({
            timestamp: Date.now(),
            success: true,
            memoryInfo: info,
          });
        }
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [runMemoryOptimization, runEmergencyOptimization]);
  
  return {
    memoryInfo,
    isOptimizing,
    updateMemoryInfo,
    optimizeMemory: runMemoryOptimization,
    emergencyOptimize: runEmergencyOptimization
  };
}
