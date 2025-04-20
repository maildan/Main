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
  const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(false);
  
  // 참조
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 초기 트래킹 상태 확인
    const checkTrackingStatus = async () => {
      try {
        const status = await invoke<boolean>("get_tracking_status");
        setIsTrackingEnabled(status);
      } catch (err) {
        console.error("트래킹 상태 확인 중 오류 발생:", err);
      }
    };
    
    checkTrackingStatus();

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
      if (isTrackingEnabled && inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    document.addEventListener("click", handleClick);

    // 클린업 함수
    return () => {
      unlistenError.then((unlisten: UnlistenFn) => unlisten());
      document.removeEventListener("click", handleClick);
    };
  }, [isTrackingEnabled]);

  const toggleTracking = async () => {
    try {
      // 반전된 상태 전송
      const newStatus = await invoke<boolean>("set_tracking_enabled", { enabled: !isTrackingEnabled });
      setIsTrackingEnabled(newStatus);
      
      // 상태 변경 알림
      const message = newStatus 
        ? "키보드 트래킹이 활성화되었습니다." 
        : "키보드 트래킹이 비활성화되었습니다.";
      
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
      
      // 트래킹이 활성화되었다면 입력 필드에 포커스
      if (newStatus && inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error("트래킹 상태 변경 중 오류 발생:", err);
      setErrorMessage("트래킹 상태 변경에 실패했습니다.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTrackingEnabled) return;
    
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
    
    if (!isTrackingEnabled) return;
    
    try {
      if (e.data) await invoke("save_typing_data", { key: e.data });
    } catch (err) {
      console.error("타이핑 데이터 저장 중 오류 발생:", err);
    }
  };
  
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCurrentLine(newValue);
    
    if (!isTrackingEnabled) return;
    
    try {
      if (!isComposing && newValue.length > currentLine.length) {
        const lastChar = newValue.slice(-1);
        if (lastChar) await invoke("save_typing_data", { key: lastChar });
      }
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
      
      <div className="tracking-control">
        <button 
          className={`tracking-button ${isTrackingEnabled ? 'active' : ''}`}
          onClick={toggleTracking}
          aria-pressed={isTrackingEnabled}
        >
          {isTrackingEnabled ? '트래킹 중지' : '트래킹 시작'}
        </button>
      </div>
      
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
          autoFocus={isTrackingEnabled}
          className="hidden-input"
          aria-label="타이핑 입력"
          disabled={!isTrackingEnabled}
        />
        
        <div className="section-content" role="main">
          {renderSectionContent(activeSection)}
        </div>
      </div>
    </div>
  );
}

export default App;
