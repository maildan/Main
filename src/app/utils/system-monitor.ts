/**
 * 시스템 자원 모니터링 유틸리티
 * 
 * 메모리, CPU, 디스크 등 시스템 자원 사용량을 모니터링하는 함수들을 제공합니다.
 */

import { getMemoryInfo } from './memory/memory-info';
import { requestNativeMemoryOptimization } from './native-memory-bridge';
import { OptimizationLevel } from '@/types';

// 모니터링 상태 인터페이스
export interface SystemStatus {
  memory: MemoryStatus;
  cpu?: CPUStatus;
  timestamp: number;
}

// 메모리 상태 인터페이스
export interface MemoryStatus {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB?: number;
  percentUsed: number;
  status: 'normal' | 'warning' | 'critical';
}

// CPU 상태 인터페이스
export interface CPUStatus {
  usage: number;
  cores?: number;
  status: 'normal' | 'warning' | 'critical';
}

// 임계값 설정
const THRESHOLDS = {
  MEMORY: {
    WARNING: 70, // 70% 이상일 때 경고
    CRITICAL: 85 // 85% 이상일 때 위험
  },
  CPU: {
    WARNING: 80, // 80% 이상일 때 경고
    CRITICAL: 95 // 95% 이상일 때 위험
  }
};

// 모니터링 스케줄 관리
let monitoringInterval: NodeJS.Timeout | null = null;

// 자동 최적화 스케줄 관리
let autoOptimizeInterval: NodeJS.Timeout | null = null;

// 콜백 저장소
const callbacks: Array<(status: SystemStatus) => void> = [];

/**
 * 현재 시스템 상태 가져오기
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    // 메모리 정보 가져오기
    const memoryInfo = await getMemoryInfo();
    
    let memoryStatus: MemoryStatus = {
      heapUsedMB: 0,
      heapTotalMB: 0,
      percentUsed: 0,
      status: 'normal'
    };
    
    if (memoryInfo) {
      // 필드 이름 호환성 처리
      const heapUsedMB = memoryInfo.heap_used_mb || memoryInfo.heapUsedMB || 0;
      const heapTotalMB = (memoryInfo.heap_total || 0) / (1024 * 1024);
      const percentUsed = memoryInfo.percent_used || memoryInfo.percentUsed || 0;
      const rssMB = memoryInfo.rss_mb || memoryInfo.rssMB;
      
      // 메모리 상태 평가
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentUsed >= THRESHOLDS.MEMORY.CRITICAL) {
        status = 'critical';
      } else if (percentUsed >= THRESHOLDS.MEMORY.WARNING) {
        status = 'warning';
      }
      
      memoryStatus = {
        heapUsedMB,
        heapTotalMB,
        percentUsed,
        rssMB,
        status
      };
    }
    
    // CPU 정보는 브라우저에서 직접 가져올 수 없음
    // 실제로는 Electron 앱이나 서버에서만 가능
    
    return {
      memory: memoryStatus,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('시스템 상태 확인 중 오류:', error);
    
    // 오류 발생 시 기본값 반환
    return {
      memory: {
        heapUsedMB: 0,
        heapTotalMB: 0,
        percentUsed: 0,
        status: 'normal'
      },
      timestamp: Date.now()
    };
  }
}

/**
 * 자동 최적화 시작
 * @param interval 체크 간격 (밀리초)
 */
export function startAutoOptimization(interval: number = 60000): void {
  stopAutoOptimization(); // 기존 인터벌 중지
  
  // 자동 최적화 인터벌 시작
  autoOptimizeInterval = setInterval(async () => {
    try {
      const status = await getSystemStatus();
      
      // 메모리 상태에 따라 최적화 레벨 결정
      let optimizationLevel: OptimizationLevel;
      let shouldOptimize = false;
      
      switch (status.memory.status) {
        case 'critical':
          optimizationLevel = OptimizationLevel.HIGH;
          shouldOptimize = true;
          break;
        case 'warning':
          optimizationLevel = OptimizationLevel.MEDIUM;
          shouldOptimize = true;
          break;
        default:
          // 정상 상태에서는 최적화 수행하지 않음
          optimizationLevel = OptimizationLevel.NONE;
          shouldOptimize = false;
      }
      
      // 필요한 경우 최적화 수행
      if (shouldOptimize) {
        console.log(`자동 메모리 최적화 시작 (레벨: ${optimizationLevel})`);
        
        // 위험 상태인 경우 긴급 모드로 최적화
        const emergency = status.memory.status === 'critical';
        
        // 네이티브 모듈을 통한 최적화 수행
        await requestNativeMemoryOptimization(optimizationLevel, emergency);
        
        console.log('자동 메모리 최적화 완료');
      }
    } catch (error) {
      console.error('자동 최적화 중 오류:', error);
    }
  }, interval);
  
  console.log(`자동 최적화가 ${interval / 1000}초 간격으로 시작되었습니다`);
}

/**
 * 자동 최적화 중지
 */
export function stopAutoOptimization(): void {
  if (autoOptimizeInterval) {
    clearInterval(autoOptimizeInterval);
    autoOptimizeInterval = null;
    console.log('자동 최적화가 중지되었습니다');
  }
}

/**
 * 시스템 모니터링 시작
 * @param interval 체크 간격 (밀리초)
 */
export function startMonitoring(interval: number = 5000): void {
  stopMonitoring(); // 기존 인터벌 중지
  
  // 모니터링 인터벌 시작
  monitoringInterval = setInterval(async () => {
    try {
      const status = await getSystemStatus();
      
      // 모든 콜백 호출
      callbacks.forEach(callback => callback(status));
      
      // 위험 상태 로깅
      if (status.memory.status === 'critical') {
        console.warn('메모리 사용량이 위험 수준에 도달했습니다:', status.memory.percentUsed.toFixed(1) + '%');
      }
    } catch (error) {
      console.error('모니터링 중 오류:', error);
    }
  }, interval);
  
  console.log(`시스템 모니터링이 ${interval / 1000}초 간격으로 시작되었습니다`);
}

/**
 * 시스템 모니터링 중지
 */
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('시스템 모니터링이 중지되었습니다');
  }
}

/**
 * 모니터링 이벤트 구독
 * @param callback 이벤트 핸들러 함수
 * @returns 구독 해제 함수
 */
export function subscribeToMonitoring(callback: (status: SystemStatus) => void): () => void {
  callbacks.push(callback);
  
  // 현재 상태 즉시 전달
  getSystemStatus().then(status => callback(status));
  
  // 구독 해제 함수 반환
  return () => {
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  };
}

// 자동으로 모니터링과 최적화 시작 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  // 페이지 로딩이 완료된 후 시작
  if (document.readyState === 'complete') {
    startMonitoring();
    startAutoOptimization();
  } else {
    window.addEventListener('load', () => {
      startMonitoring();
      startAutoOptimization();
    });
  }
  
  // 페이지 언로드 시 모니터링 중지
  window.addEventListener('beforeunload', () => {
    stopMonitoring();
    stopAutoOptimization();
  });
}
