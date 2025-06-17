import { useState } from "react";

// 컴포넌트 임포트 - 새로운 모듈 구조
import ErrorMessage from "./shared/components/ErrorMessage";
import KakaoSection from "./features/kakao/components/KakaoSection";
import MainScreen from "./features/main/components/MainScreen";
import SplashScreen from "./shared/components/SplashScreen";

// CSS 임포트
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/sections.css";
import "./styles/components.css";
import "./styles/utils.css";
import "./styles/main.css";

/**
 * 메인 앱 컴포넌트
 * 스플래시 화면 -> 메인 화면 -> 카카오 섹션 순서로 네비게이션을 관리합니다.
 */
function App() {
  // 앱 초기화 상태
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 현재 활성화된 섹션 상태 ('main' | 'kakao')
  const [currentSection, setCurrentSection] = useState<'main' | 'kakao'>('main');
  
  // 에러 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 스플래시 화면 완료 핸들러
  const handleSplashComplete = () => {
    setIsInitialized(true);
  };

  // 카카오 섹션으로 네비게이션
  const handleNavigateToKakao = () => {
    setCurrentSection('kakao');
  };

  // 메인 화면으로 돌아가기
  const handleNavigateToMain = () => {
    setCurrentSection('main');
  };

  // 스플래시 화면이 아직 표시되는 경우
  if (!isInitialized) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }
  return (
    <div className="app-layout">
      {/* 에러 메시지 표시 */}
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)}
        isError={false}
      />
      
      <div className="app-content">
        {/* 조건부 렌더링 - 현재 섹션에 따라 다른 컴포넌트 표시 */}
        {currentSection === 'main' ? (
          <MainScreen onNavigateToKakao={handleNavigateToKakao} />
        ) : (
          <div className="section-content" role="main">
            {/* 뒤로 가기 버튼 */}
            <div className="back-navigation">
              <button 
                className="back-button"
                onClick={handleNavigateToMain}
                type="button"
                aria-label="메인 화면으로 돌아가기"
              >
                ← 메인으로 돌아가기
              </button>
            </div>
            
            {/* 카카오톡 복호화 섹션 */}
            <KakaoSection />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
