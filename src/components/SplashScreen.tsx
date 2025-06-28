import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/google/AuthContext';
import { useDocs } from '../contexts/google/DocsContext';
import { invoke } from '@tauri-apps/api/core';

// 스플래시 화면 관련 상수들
const MAIN_BRANDING = "Loop Pro";
const COMPLETION_MESSAGE = "준비 완료!";

const FUNNY_MESSAGES = [
  "왜 이런 앱을 찾게 되었을까요?",
  "뭔가 숨겨진 게 있나봐요.",
  "호기심이 많으시네요!",
  "정말 이걸 분석해야 하나요?",
  "뭔가 수상한 일이...",
  "이런 걸 왜 찾고 계신 거죠?"
];

const getRandomFunnyMessage = (): string => {
  return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
};

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { fetchDocuments } = useDocs();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(MAIN_BRANDING);
  const [isVisible, setIsVisible] = useState(true);
  const switchTriedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      const splashStart = Date.now(); // 최소 표시 시간 측정 시작
      try {
        setStatus(MAIN_BRANDING);
        setProgress(20);
        await sleep(500);
        if (!isMounted) return;
        setStatus("인증 상태 확인 중...");
        setProgress(30);
        while (isLoading && isMounted) {
          await sleep(100);
        }
        if (!isMounted) return;
        setStatus("저장된 계정 확인 중...");
        setProgress(50);
        await sleep(300);
        if (!isMounted) return;
        // 1. current_user가 이미 있으면 아무것도 하지 않음
        if (isAuthenticated && user) {
          // 바로 동기화 및 이후 로직 진행
        } else if (!switchTriedRef.current) {
          // 2. current_user가 없을 때만 단 한 번 switch_account 시도
          switchTriedRef.current = true;
          try {
            const savedAccounts = await invoke<any[]>('get_saved_accounts');
            if (savedAccounts && savedAccounts.length > 0) {
              const firstAccount = savedAccounts[0];
              await invoke('switch_account', { userId: firstAccount.id });
              // reload 제거, 대신 인증 상태를 강제로 갱신
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new Event('auth-switched'));
              }
              // await sleep(1000); // 필요시 약간의 대기
              // window.location.reload(); // 제거
              return;
            } else {
              // 저장된 계정이 없으면 안내 메시지만 보여주고 아무것도 하지 않음
              setStatus("저장된 계정이 없습니다. 먼저 계정을 추가해 주세요.");
              setProgress(70);
              await sleep(1000);
            }
          } catch (e) {
            console.error('SplashScreen: 자동 계정 전환 실패:', e);
          }
        }

        if (!isMounted) return;
        if (!isAuthenticated || !user) {
          setStatus(getRandomFunnyMessage());
          setProgress(70);
          await sleep(1000);
        }

        // 4. 완료 문구
        setStatus(COMPLETION_MESSAGE);
        setProgress(100);
        // 최소 1초는 SplashScreen이 보이도록 보장
        const elapsed = Date.now() - splashStart;
        if (elapsed < 1000) {
          await sleep(1000 - elapsed);
        }
        await sleep(800);
        if (!isMounted) return;
        // 5. 페이드아웃 효과
        setIsVisible(false);
        await sleep(300);
        if (!isMounted) return;
        // 6. 메인 화면으로 전환
        onComplete();
      } catch (error) {
        console.error("앱 초기화 중 오류:", error);
        if (!isMounted) return;
        setStatus(COMPLETION_MESSAGE);
        setProgress(100);
        await sleep(300);
        setIsVisible(false);
        await sleep(300);
        onComplete();
      }
    };
    initializeApp();
    return () => {
      isMounted = false;
    };
  }, [onComplete, isAuthenticated, user, isLoading, fetchDocuments]);

  return (
    <div className={`splash-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="splash-content">
        {/* 앱 로고 */}
        <div className="app-logo">
          <img src="/Loopico.svg" alt="Loop Pro 로고" />
        </div>
        
        {/* 진행률 바 */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
          {/* 상태 텍스트 */}
        <div className="status-text">{status}</div>
      </div>
    </div>
  );
};

// 유틸리티 함수
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default SplashScreen;
