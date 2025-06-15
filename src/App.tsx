import { useState } from "react";

// 컴포넌트 임포트
import ErrorMessage from "./components/ErrorMessage";
import KakaoSection from "./components/KakaoSection";
import SplashScreen from "./components/SplashScreen";

// CSS 임포트
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/sections.css";
import "./styles/components.css";
import "./styles/utils.css";

/**
 * 메인 앱 컴포넌트
 */
function App() {
  // 앱 초기화 상태
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 에러 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 스플래시 화면 완료 핸들러
  const handleSplashComplete = () => {
    setIsInitialized(true);
  };

  // 스플래시 화면이 아직 표시되는 경우
  if (!isInitialized) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="app-layout scrollable-container">
      {/* 에러 메시지 표시 */}
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)}
        isError={false}
      />
      
      <div className="app-content full-width">        {/* 카카오톡 복호화 섹션 */}
        <div className="section-content" role="main">
          <KakaoSection />
        </div>
      </div>
    </div>
  );
}

export default App;
