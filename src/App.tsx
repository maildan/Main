import { useState } from "react";

// 컴포넌트 임포트 - 간단한 구조
import ErrorMessage from "./components/ErrorMessage";
import MainScreen from "./components/MainScreen";
import SplashScreen from "./components/SplashScreen";
import { SettingsProvider } from "./contexts/SettingsContext";

// CSS 임포트
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/sections.css";
import "./styles/components.css";
import "./styles/google-docs.css";
import "./styles/utils.css";
import "./styles/main.css";

/**
 * 메인 앱 컴포넌트
 * 스플래시 화면 -> 메인 화면으로 네비게이션을 관리합니다.
 */
function App() {
  // 앱 초기화 상태
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 에러 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 스플래시 화면 완료 핸들러
  const handleSplashComplete = () => {    setIsInitialized(true);
  };

  // 스플래시 화면이 아직 표시되는 경우
  if (!isInitialized) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <SettingsProvider>
      <div className="app-layout">
        {/* 에러 메시지 표시 */}
        <ErrorMessage 
          message={errorMessage} 
          onClose={() => setErrorMessage(null)}
          isError={false}
        />
          <div className="app-content">
          {/* 메인 화면 */}
          <MainScreen />
        </div>
      </div>
    </SettingsProvider>
  );
}

export default App;
