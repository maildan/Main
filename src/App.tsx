import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [currentLine, setCurrentLine] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [activeSection, setActiveSection] = useState("Monitoring");
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

  return (
    <div className="app-container">
      <h1 className="app-title">Loop</h1>
      
      <div className="navigation">
        {sections.map(section => (
          <button 
            key={section}
            className={`nav-button ${activeSection === section ? 'active' : ''}`}
            onClick={() => setActiveSection(section)}
          >
            {section}
          </button>
        ))}
      </div>
      
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
        {activeSection === "Monitoring" && <div>모니터링 내용</div>}
        {activeSection === "History" && <div>히스토리 내용</div>}
        {activeSection === "Statistics" && <div>통계 내용</div>}
        {activeSection === "Settings" && <div>설정 내용</div>}
      </div>
    </div>
  );
}

export default App;
