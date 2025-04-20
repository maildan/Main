import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";

type Section = "모니터링" | "히스토리" | "통계" | "설정";

function App() {
  // 상태 관리
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>("모니터링");
  
  // 참조
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 에러 메시지 이벤트 리스너
    const unlistenError = listen<string>("show_error", ((event) => {
      setErrorMessage(event.payload);
      setTimeout(() => setErrorMessage(null), 5000); // 5초 후 자동으로 제거
    }) as EventCallback<string>);
    
    // 자동 포커스
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // 클릭 시 숨겨진 입력 필드로 포커스 이동
    const handleClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    document.addEventListener("click", handleClick);

    // 클린업 함수
    return () => {
      unlistenError.then((unlisten: UnlistenFn) => unlisten());
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      if (event.key === "Enter" && !isComposing) {
        if (currentLine.trim()) {
          await invoke("log_sentence", { sentence: currentLine });
        }
        setCurrentLine("");
        event.preventDefault();
      }
    } catch (err) {
      console.error("문장 저장 중 오류 발생:", err);
    }
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = async (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    try {
      if (e.data) await invoke("save_typing_data", { key: e.data });
    } catch (err) {
      console.error("타이핑 데이터 저장 중 오류 발생:", err);
    }
  };
  
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    try {
      if (!isComposing && newValue.length > currentLine.length) {
        const lastChar = newValue.slice(-1);
        if (lastChar) await invoke("save_typing_data", { key: lastChar });
      }
      setCurrentLine(newValue);
    } catch (err) {
      console.error("키 입력 저장 중 오류 발생:", err);
    }
  };

  const sections: Section[] = ["모니터링", "히스토리", "통계", "설정"];

  const handleSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
  };

  const renderSectionContent = (section: Section) => {
    return (
      <div className="section-panel">
        <div className="empty-content">
          {section} 섹션 - 준비 중입니다
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      {errorMessage && (
        <div className="error-message" role="alert">
          <p>{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)}>닫기</button>
        </div>
      )}
      
      <div className="app-sidebar" role="navigation">
        <nav className="navigation">
          {sections.map(section => (
            <button 
              key={section}
              className={`nav-button ${activeSection === section ? 'active' : ''}`}
              onClick={() => handleSectionChange(section)}
              aria-current={activeSection === section ? "page" : undefined}
            >
              {section}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="app-content">
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
          aria-label="타이핑 입력"
        />
        
        <div className="section-content" role="main">
          {renderSectionContent(activeSection)}
        </div>
      </div>
    </div>
  );
}

export default App;
