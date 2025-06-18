import { useEffect, useState } from 'react';
import { MAIN_BRANDING, COMPLETION_MESSAGE, getRandomFunnyMessage } from '../constants/messages';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(MAIN_BRANDING);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        // 1. 브랜딩 문구 시작
        setStatus(MAIN_BRANDING);
        setProgress(20);
        await sleep(1000);
        
        if (!isMounted) return;

        // 2. 개그성 문구 랜덤 표시
        const randomMessage = getRandomFunnyMessage();
        setStatus(randomMessage);
        setProgress(60);
        await sleep(1500);
        
        if (!isMounted) return;

        // 3. 완료 문구
        setStatus(COMPLETION_MESSAGE);
        setProgress(100);
        await sleep(800);
        
        if (!isMounted) return;
        
        // 4. 페이드아웃 효과
        setIsVisible(false);
        await sleep(300);
        
        if (!isMounted) return;
          // 5. 메인 화면으로 전환
        onComplete();      } catch (error) {
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
  }, [onComplete]);

  return (
    <div className={`splash-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="splash-content">        {/* 앱 아이콘 */}
        <div className="app-icon">
          <img src="/tauri.svg" alt="앱 아이콘" />
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
