import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [currentLine, setCurrentLine] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [activeSection, setActiveSection] = useState("Monitoring");
  const [isNavOpen, setIsNavOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 자동 포커스
    if (inputRef.current) inputRef.current.focus();
    
    // 클릭 시 숨겨진 입력 필드로 포커스 이동
    const handleClick = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !isComposing) {
      if (currentLine.trim()) {
        await invoke("log_sentence", { sentence: currentLine });
      }
      setCurrentLine("");
      event.preventDefault();
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = async (e: React.CompositionEvent) => {
    setIsComposing(false);
    if (e.data) await invoke("save_typing_data", { key: e.data });
  };
  
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isComposing && newValue.length > currentLine.length) {
      const lastChar = newValue.slice(-1);
      if (lastChar) await invoke("save_typing_data", { key: lastChar });
    }
    setCurrentLine(newValue);
  };

  const sections = ["Monitoring", "History", "Statistics", "Settings"];

  // 토글 내비게이션 바
  const toggleNavbar = () => {
    setIsNavOpen(!isNavOpen);
  };

  // 간소화된 섹션 렌더링 함수
  const renderSectionContent = (section: string) => (
    <div className="section-panel">
      <div className="section-header">{section}</div>
      <div className="empty-content">
        {section} 섹션 - 준비 중입니다
      </div>
    </div>
  );

  return (
    <div className={`app-layout ${isNavOpen ? 'nav-open' : 'nav-closed'}`}>
      <div className="app-header">
        <button className="hamburger-menu" onClick={toggleNavbar}>
          <div className="hamburger-icon"></div>
        </button>
        <h1 className="app-title">Loop</h1>
      </div>
      
      <div className="app-sidebar">
        <nav className="navigation">
          {sections.map(section => (
            <button 
              key={section}
              className={`nav-button ${activeSection === section ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(section);
                setIsNavOpen(false); // 네비게이션 바 아이템 클릭 시 메뉴 자동 닫기
              }}
            >
              {section}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="app-content">
        {/* 숨겨진 입력 필드 - UI에는 보이지 않지만 키보드 이벤트를 캡처 */}
        <input
          ref={inputRef}
          type="text"
          value={currentLine}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          autoFocus
          className="hidden-input"
        />
        
        {/* 각 섹션별 내용 */}
        <div className="section-content">
          {renderSectionContent(activeSection)}
        </div>
      </div>
    </div>
  );
}

export default App;
