'use client';

import React, { useState } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/ToastContext';
import { HomeContent } from './components/HomeContent';
import NativeModuleStatus from './components/NativeModuleStatus';
import NativeModuleTestPanel from './components/NativeModuleTestPanel';
import { useToast } from './components/ToastContext';
import { TypingAnalyzer } from './components/TypingAnalyzer';

// 타이핑 샘플 데이터
const sampleTypingData = {
  keyCount: 650,
  typingTime: 90000, // 1분 30초
  accuracy: 97.2
};

// 메인 페이지 컴포넌트
export default function Home() {
  const [showTest, setShowTest] = useState<boolean>(false);
  const [showDemo, setShowDemo] = useState<boolean>(false);

  return (
    <ThemeProvider>
      <ToastProvider>
        <React.Suspense fallback={<div>Loading...</div>}>
          <HomeContent />
          
          {/* 네이티브 모듈 상태 및 테스트 패널 */}
          <div className="mt-8 px-4 max-w-6xl mx-auto">
            <NativeModuleStatus />
            
            <div className="text-center my-4 space-x-4">
              <button 
                onClick={() => setShowTest(!showTest)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {showTest ? '테스트 패널 숨기기' : '네이티브 모듈 테스트 패널 표시'}
              </button>
              
              <button 
                onClick={() => setShowDemo(!showDemo)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                {showDemo ? '데모 숨기기' : '타이핑 분석 데모 표시'}
              </button>
            </div>
            
            {showDemo && (
              <div className="mb-8 max-w-2xl mx-auto">
                <TypingAnalyzer 
                  data={sampleTypingData} 
                  onResult={(result) => console.log('분석 결과:', result)}
                />
              </div>
            )}
            
            {showTest && <NativeModuleTestPanel />}
          </div>
        </React.Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}