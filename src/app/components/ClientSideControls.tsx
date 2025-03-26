'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const NativeModuleTestPanel = dynamic(() => import('./NativeModuleTestPanel'), { ssr: false });
// TypingAnalyzer가 named export이므로 아래와 같이 수정
const DynamicTypingAnalyzer = dynamic(
  () => import('./TypingAnalyzer').then(mod => mod.TypingAnalyzer),
  { ssr: false }
);

// 타이핑 샘플 데이터
const sampleTypingData = {
  keyCount: 650,
  typingTime: 90000, // 1분 30초
  accuracy: 97.2
};

export default function ClientSideControls() {
  const [showTest, setShowTest] = useState<boolean>(false);
  const [showDemo, setShowDemo] = useState<boolean>(false);

  return (
    <>
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
          <DynamicTypingAnalyzer 
            data={sampleTypingData} 
            onResult={(result) => console.log('분석 결과:', result)}
          />
        </div>
      )}
      
      {showTest && <NativeModuleTestPanel />}
    </>
  );
}
