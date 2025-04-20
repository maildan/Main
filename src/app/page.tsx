'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HomeContent from './components/HomeContent';
import styles from './page.module.css';
import MainLayout from '@/app/components/MainLayout';
import TypingBox from '@/app/components/TypingBox';
import TypingStats from '@/app/components/TypingStats';
import { useTypingStats } from '@/app/hooks/useTypingStats';
import { useElectronApi } from '@/app/hooks/useElectronApi';
import { useSettings } from '@/app/hooks/useSettings';

// 네이티브 모듈 테스트 컴포넌트 동적 임포트
const NativeModuleTest = dynamic(
  () => import('./components/NativeModuleTest'),
  { ssr: false }
);

// 'use client' 컴포넌트에서는 metadata를 export할 수 없으므로 제거
// metadata는 layout.tsx로 이동

const HomePage: React.FC = (): React.ReactNode => {
  const [mounted, setMounted] = useState(false);
  const { electronAPI } = useElectronApi();
  const { settings } = useSettings(electronAPI);
  const {
    isTracking,
    displayStats,
    processKeyInput,
    saveCurrentSession
  } = useTypingStats(electronAPI);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatsUpdate = (newStats: { keyCount: number; typingTime: number }) => {
    console.log('Stats updated in TypingBox:', newStats);
  };

  if (!mounted) {
    return null;
  }

  const formattedStats = displayStats ? {
    totalKeyCount: displayStats.keyCount,
    totalTypingTime: displayStats.typingTime,
    averageAccuracy: displayStats.accuracy,
  } : null;

  const darkMode = settings?.darkMode ?? false;
  const toggleDarkMode = () => {
    console.log('Toggle dark mode - implementation needed in useSettings');
  };

  return (
    <MainLayout
      _darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
    >
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Loop</h1>
          <HomeContent />
          <TypingBox onStatsUpdate={handleStatsUpdate} isTracking={isTracking} />
          <TypingStats data={formattedStats} />
        </div>
      </main>
    </MainLayout>
  );
};

export default HomePage;