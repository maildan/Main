import { useState } from "react";

// 훅 및 타입 임포트
import { useTracking } from "./hooks/useTracking";
import { Section } from "./types";

// 컴포넌트 임포트
import ErrorMessage from "./components/ErrorMessage";
import TrackingControl from "./components/TrackingControl";
import Navigation from "./components/Navigation";
import SectionPanel from "./components/SectionPanel";
import TypingInput from "./components/TypingInput";

// CSS 임포트
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/navigation.css";
import "./styles/tracking.css";
import "./styles/sections.css";
import "./styles/components.css";
import "./styles/utils.css";
import "./styles/monitoring.css";

/**
 * 메인 앱 컴포넌트
 */
function App() {
  // 트래킹 관련 기능을 훅으로 분리
  const {
    errorMessage,
    setErrorMessage,
    currentLine,
    isComposing,
    isTrackingEnabled,
    inputRef,
    toggleTracking,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
    handleInputChange
  } = useTracking();
  
  // 섹션 관련 상태
  const [activeSection, setActiveSection] = useState<Section>("모니터링");
  const sections: Section[] = ["모니터링", "히스토리", "통계", "설정"];

  // 섹션 변경 핸들러
  const handleSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
  };

  // 트래킹 비활성화 메시지인지 확인하는 함수
  const isTrackingDisabledMessage = (message: string | null): boolean => {
    return message === "키보드 트래킹이 비활성화되었습니다.";
  };

  return (
    <div className="app-layout">
      {/* 에러 메시지 표시 */}
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)}
        isError={isTrackingDisabledMessage(errorMessage)} // 트래킹 비활성화 시 isError를 true로 설정
      />
      
      {/* 트래킹 컨트롤 */}
      <TrackingControl 
        isEnabled={isTrackingEnabled} 
        onToggle={toggleTracking}
      />
      
      {/* 네비게이션 메뉴 */}
      <Navigation 
        sections={sections} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
      />
      
      <div className="app-content">
        {/* 숨겨진 타이핑 입력 필드 */}
        <TypingInput
          currentLine={currentLine}
          isEnabled={isTrackingEnabled}
          isComposing={isComposing}
          inputRef={inputRef}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
        
        {/* 섹션 내용 표시 영역 */}
        <div className="section-content" role="main">
          <SectionPanel section={activeSection} />
        </div>
      </div>
    </div>
  );
}

export default App;
