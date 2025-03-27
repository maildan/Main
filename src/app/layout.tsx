import React from 'react';
import './globals.css';
import ThemeProviderWrapper from './components/ThemeProviderWrapper';
import SelfLearningSystem from './components/SelfLearningSystem';

export const metadata = {
  title: '타이핑 통계',
  description: '타이핑 패턴 분석 및 통계 앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <ThemeProviderWrapper>
          {/* 자동 학습 시스템 추가 */}
          <SelfLearningSystem
            options={{
              enableAutoLearning: true,
              learningIntervalHours: 24,
              runOnLowActivity: true
            }}
          />
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}