'use client';

import { useEffect } from 'react';
import RestartPrompt from '../components/RestartPrompt';
import '../globals.css';

/**
 * 재시작 안내 페이지
 */
export default function RestartPage() {
  // 페이지 로드 시 API 사용 가능 여부 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // API 사용 가능 여부 로깅
      console.log('RestartPage: API 사용 가능 여부 확인');
      console.log('window.restartAPI 존재:', !!window.restartAPI);
      
      if (window.restartAPI) {
        // 사용 가능한 API 함수 로깅
        console.log('사용 가능한 restartAPI 함수:', 
          Object.keys(window.restartAPI).map(key => `${key}`).join(', ')
        );
      }
      
      // 대체 API 확인
      console.log('window.electronAPI 존재:', !!window.electronAPI);
      if (window.electronAPI) {
        console.log('window.electronAPI에 restartApp 존재:', 
          !!window.electronAPI.restartApp
        );
      }
    }
  }, []);
  
  return <RestartPrompt />;
}
