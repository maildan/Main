'use client';

import React, { useState } from 'react';

// TypingTracker 컴포넌트가 없어 임시로 타입 정의
interface TypingTrackerProps {
  stats?: TypingData | undefined;
  _isTracking?: boolean | undefined;
  onResult: (result: TypingData) => void;
}

// TypingData 타입이 없어 임시로 정의
interface TypingData {
  keyCount: number;
  typingTime: number;
  accuracy: number;
}

// ClientSideControlsProps 정의
interface ClientSideControlsProps {
  // 필요한 props가 있으면 여기에 추가
}

export default function ClientSideControls(_props: ClientSideControlsProps) {
  const [typingStats, setTypingStats] = useState<TypingData | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTypingResult = (result: TypingData) => {
    setTypingStats(result);
    setIsTracking(false);
  };

  const startTracking = () => {
    setTypingStats(null);
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  // 임시 TypingTracker 컴포넌트 정의
  const TypingTracker = (props: TypingTrackerProps) => (
    <div>Typing Tracker Placeholder</div>
  );

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-lg font-medium">타이핑 통계</h2>

      <div className="mb-4 flex justify-between">
        <button
          onClick={startTracking}
          disabled={isTracking}
          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:bg-blue-300"
        >
          트래킹 시작
        </button>

        <button
          onClick={stopTracking}
          disabled={!isTracking}
          className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600 disabled:bg-red-300"
        >
          트래킹 중지
        </button>
      </div>

      {isTracking && (
        <TypingTracker
          stats={typingStats || undefined}
          _isTracking={isTracking}
          onResult={handleTypingResult}
        />
      )}

      {typingStats && !isTracking && (
        <div className="rounded-md border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
          <h3 className="mb-2 font-medium">결과</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500">키 입력 수</p>
              <p className="font-medium">{typingStats.keyCount}</p>
            </div>
            <div>
              <p className="text-gray-500">총 시간</p>
              <p className="font-medium">{typingStats.typingTime}초</p>
            </div>
            <div>
              <p className="text-gray-500">정확도</p>
              <p className="font-medium">{typingStats.accuracy}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
