'use client';

import { useEffect, useState } from 'react';
import styles from '../page.module.css';

interface DebugInfo {
  isTracking: boolean;
  currentStats: {
    keyCount: number;
    typingTime: number;
    startTime: number | null;
    lastActiveTime: number | null;
    currentWindow: string | null;
    currentBrowser: string | null;
  };
  platform: string;
  electronVersion: string;
  nodeVersion: string;
}

interface BrowserInfo {
  name: string | null;
  isGoogleDocs: boolean;
  title: string | null;
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [apiMethods, setApiMethods] = useState<string[]>([]);

  useEffect(() => {
    const checkElectronAPI = () => {
      const hasApi = typeof window !== 'undefined' && !!window.electronAPI;
      setIsElectron(hasApi);
      
      if (hasApi && window.electronAPI) {
        setApiMethods(Object.keys(window.electronAPI));
        
        // 디버그 정보 로드
        window.electronAPI.getDebugInfo()
          .then((info: DebugInfo) => setDebugInfo(info))
          .catch(console.error);
          
        // 브라우저 정보 로드
        window.electronAPI.getCurrentBrowserInfo()
          .then((info: BrowserInfo) => setBrowserInfo(info))
          .catch(console.error);
      }
    };
    
    checkElectronAPI();
  }, []);

  return (
    <div className={styles.container}>
      <h1>디버그 페이지</h1>
      
      <section>
        <h2>환경 정보</h2>
        <div className={styles.debugPanel}>
          <p>Electron 환경: {isElectron ? '예' : '아니오'}</p>
          {debugInfo && (
            <>
              <p>플랫폼: {debugInfo.platform}</p>
              <p>Electron 버전: {debugInfo.electronVersion}</p>
              <p>Node 버전: {debugInfo.nodeVersion}</p>
            </>
          )}
        </div>
      </section>
      
      <section>
        <h2>ElectronAPI 메서드</h2>
        <div className={styles.debugPanel}>
          {apiMethods.length > 0 ? (
            <ul>
              {apiMethods.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          ) : (
            <p>사용 가능한 API 메서드가 없습니다.</p>
          )}
        </div>
      </section>
      
      <section>
        <h2>현재 브라우저 정보</h2>
        <div className={styles.debugPanel}>
          {browserInfo ? (
            <>
              <p>브라우저 이름: {browserInfo.name || '감지되지 않음'}</p>
              <p>구글 문서: {browserInfo.isGoogleDocs ? '예' : '아니오'}</p>
              <p>창 제목: {browserInfo.title || 'N/A'}</p>
            </>
          ) : (
            <p>브라우저 정보가 없습니다.</p>
          )}
        </div>
      </section>
      
      <section>
        <h2>추적 상태</h2>
        <div className={styles.debugPanel}>
          {debugInfo ? (
            <>
              <p>추적 중: {debugInfo.isTracking ? '예' : '아니오'}</p>
              <p>키 카운트: {debugInfo.currentStats.keyCount}</p>
              <p>타이핑 시간: {debugInfo.currentStats.typingTime}초</p>
              <p>시작 시간: {debugInfo.currentStats.startTime ? new Date(debugInfo.currentStats.startTime).toLocaleString() : 'N/A'}</p>
              <p>마지막 활성 시간: {debugInfo.currentStats.lastActiveTime ? new Date(debugInfo.currentStats.lastActiveTime).toLocaleString() : 'N/A'}</p>
              <p>현재 창: {debugInfo.currentStats.currentWindow || 'N/A'}</p>
              <p>현재 브라우저: {debugInfo.currentStats.currentBrowser || 'N/A'}</p>
            </>
          ) : (
            <p>추적 정보가 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  );
}
