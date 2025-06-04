'use client';

import { useState, useEffect } from 'react';

interface ElectronAPI {
  ipcRenderer: {
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    once: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  };
  // 다른 Electron API 필요에 따라 추가
}

/**
 * Electron API를 안전하게 액세스하기 위한 훅
 * 
 * 브라우저와 Electron 환경을 모두 지원하며, Electron이 없는 경우 null을 반환합니다.
 */
export function useElectron(): ElectronAPI | null {
  const [electron, setElectron] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    // Electron 환경 감지
    const isElectron = window && window.process && window.process.versions && Boolean(window.process.versions.electron);
    
    if (isElectron) {
      // window.electron이 전역 객체로 정의되어 있는지 확인
      const electronAPI = (window as any).electron;
      
      if (electronAPI && electronAPI.ipcRenderer) {
        setElectron(electronAPI as ElectronAPI);
      } else {
        console.warn('Electron API를 찾을 수 없습니다.');
      }
    }
  }, []);

  return electron;
} 