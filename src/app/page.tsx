'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeContent from './components/HomeContent';
import styles from './page.module.css';
import TypingAnalyzerWrapper from './components/TypingAnalyzerWrapper';
import type { HomeStats } from '@/types';

// 'use client' 컴포넌트에서는 metadata를 export할 수 없으므로 제거
// metadata는 layout.tsx로 이동

// 초기 통계 더미 데이터
const initialStats: HomeStats = {
  keyCount: 2500,
  typingTime: 1800,
  wpm: 42,
  accuracy: 97.2
};

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 컴포넌트 마운트 상태 추적
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className={styles.main}>
      <HomeContent />
      <TypingAnalyzerWrapper />
    </main>
  );
}