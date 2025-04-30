'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HomeContent from './components/HomeContent';
import styles from './page.module.css';
import TypingAnalyzerWrapper from './components/TypingAnalyzerWrapper';

// 네이티브 모듈 테스트 컴포넌트 동적 임포트
const NativeModuleTest = dynamic(
  () => import('./components/NativeModuleTest'),
  { ssr: false }
);

// 'use client' 컴포넌트에서는 metadata를 export할 수 없으므로 제거
// metadata는 layout.tsx로 이동

export default function Home() {
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
      <div className={styles.container}>
        <h1 className={styles.title}>Loop</h1>
        <p className={styles.description}>
          Next.js와 Rust 네이티브 모듈 통합 테스트
        </p>

        {/* 네이티브 모듈 테스트 컴포넌트 */}
        <NativeModuleTest />

        {/* 기존 내용 유지 */}
        <HomeContent />
        <TypingAnalyzerWrapper />
      </div>
    </main>
  );
}