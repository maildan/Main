/// <reference path="./src/app/global.d.ts" />

type WindowModeType = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';

// ElectronAPI 인터페이스는 global.d.ts에서 확장

// 통합된 MemoryInfo 인터페이스 - 각 속성에 설명 추가
interface MemoryInfo {
  // 공통 필드
  timestamp: number;        // 메모리 정보 수집 시간
  
  // 프로세스 메모리 정보 필드
  heapUsed: number;         // 사용 중인 힙 메모리 (바이트)
  heapTotal: number;        // 총 할당된 힙 메모리 (바이트)
  heapLimit?: number;       // 힙 메모리 한도 (바이트)
  heapUsedMB: number;       // 사용 중인 힙 메모리 (MB)
  percentUsed: number;      // 메모리 사용률 (%)
  
  // 추가 필드
  unavailable?: boolean;    // 메모리 정보 사용 불가 여부
  error?: string;           // 오류 메시지 (있을 경우)
  
  // Chrome Performance API 확장 필드
  totalJSHeapSize?: number; // 총 JS 힙 크기 (바이트)
  usedJSHeapSize?: number;  // 사용 중인 JS 힙 크기 (바이트)
  jsHeapSizeLimit?: number; // JS 힙 크기 제한 (바이트)
}

// Window 인터페이스 확장 - 타입 충돌 해결
interface Window {
  electronAPI?: ElectronAPI;
  electron?: ElectronAPI;
  restartAPI?: RestartAPI;
  gc?: () => void;
}

// RestartAPI 인터페이스 명시적 정의
interface RestartAPI {
  getDarkMode: () => Promise<boolean>;
  restartApp: () => void;
  closeWindow: () => void;
}

// Performance 인터페이스 확장
interface Performance {
  memory?: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}