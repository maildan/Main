'use client';

import React, { useEffect } from 'react';
import MiniView from '../components/MiniView';
import { ToastProvider } from '../components/ToastContext';

export default function MiniViewPage() {
  // 페이지 로드 시 웹킷 제외 영역 설정
  useEffect(() => {
    // 모든 클릭 이벤트 중단
    const handler = (e: MouseEvent) => {
      if (!e.target || !(e.target as Element).closest('.content')) {
        e.stopPropagation();
      }
    };
    
    document.addEventListener('click', handler, true);
    
    return () => {
      document.removeEventListener('click', handler, true);
    };
  }, []);

  return (
    <ToastProvider>
      <div 
        className="w-screen h-screen overflow-hidden p-0 m-0 outline-none border-none select-none"
        style={{
        WebkitAppRegion: 'drag'
        }}
      >
        <MiniView />
      </div>
    </ToastProvider>
  );
}

export const dynamic = 'force-dynamic';
