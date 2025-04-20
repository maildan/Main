'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { ThemeProvider } from './ThemeProvider';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }): React.ReactNode => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트된 후에만 실행 (하이드레이션 불일치 방지)
    setMounted(true);
  }, []);

  // 서버 사이드 렌더링과 클라이언트 사이드 렌더링에서의 일관성을 위해
  // mounted가 true일 때만 테마를 적용합니다
  return (
    <ThemeProvider>
      {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </ThemeProvider>
  );
};

export default ClientLayout;