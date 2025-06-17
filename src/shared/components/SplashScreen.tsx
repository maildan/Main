import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("앱 초기화 중...");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initializeApp = async () => {
      try {
        // 1. 초기화 시작
        setStatus("앱 초기화 중...");
        setProgress(20);
        await sleep(500);
        
        if (!isMounted) return;        // 2. 사용자 ID 자동 감지 시도
        setStatus("사용자 ID 자동 감지 중...");
        setProgress(50);
        
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke<string>("get_user_id"); // 결과는 사용하지 않고 감지만 수행
          
          if (!isMounted) return;
          
          setStatus("사용자 ID 감지 완료");
          setProgress(80);
          await sleep(800);
        } catch (error) {
          console.log("사용자 ID 자동 감지 실패:", error);
          
          if (!isMounted) return;
          
          setStatus("사용자 ID 수동 입력 필요");
          setProgress(80);
          await sleep(800);
        }
        
        if (!isMounted) return;
        
        // 3. 로딩 완료
        setStatus("초기화 완료!");
        setProgress(100);
        await sleep(500);
        
        if (!isMounted) return;
        
        // 4. 페이드아웃 효과
        setIsVisible(false);
        await sleep(300);
        
        if (!isMounted) return;
          // 5. 메인 화면으로 전환
        onComplete();
        
      } catch (error) {
        console.error("앱 초기화 중 오류:", error);
        
        if (!isMounted) return;
        
        setStatus("초기화 완료");
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
