import { useState } from "react";

// 타입 임포트
import { Section } from "./types";

// 컴포넌트 임포트
import ErrorMessage from "./components/ErrorMessage";
import Navigation from "./components/Navigation";
import SectionPanel from "./components/SectionPanel";

// CSS 임포트
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/navigation.css";
import "./styles/sections.css";
import "./styles/components.css";
import "./styles/utils.css";

/**
 * 메인 앱 컴포넌트
 */
function App() {
  // 에러 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 섹션 관련 상태
  const [activeSection, setActiveSection] = useState<Section>("모니터링");
  const sections: Section[] = ["모니터링", "히스토리", "통계", "설정"];

  // 섹션 변경 핸들러
  const handleSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
  };

  return (
    <div className="app-layout scrollable-container">
      {/* 에러 메시지 표시 */}
      <ErrorMessage 
        message={errorMessage} 
        onClose={() => setErrorMessage(null)}
        isError={false}
      />
      
      {/* 네비게이션 메뉴 */}
      <Navigation 
        sections={sections} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
      />
      
      <div className="app-content">
        {/* 섹션 내용 표시 영역 */}
        <div className="section-content" role="main">
          <SectionPanel 
            section={activeSection}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
