'use client';

import { useEffect, useState } from 'react';
import RestartPrompt from '../components/RestartPrompt';
import '../globals.css';

/**
 * 재시작 안내 페이지
 */
const RestartPage: React.FC = (): React.ReactNode => {
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const electronApi = window.electronAPI || window.restartAPI;
      setApi(electronApi);

      if (!electronApi) {
        console.error('RestartPage: 재시작 API를 찾을 수 없습니다.');
      }
    }
  }, []);

  const handleConfirm = () => {
    api?.restartApp?.();
  };

  const handleCancel = () => {
    api?.closeWindow?.();
  };

  return <RestartPrompt
    isOpen={true}
    onConfirm={handleConfirm}
    onCancel={handleCancel}
  />;
};

export default RestartPage;
