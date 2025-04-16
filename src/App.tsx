import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import ErrorMessage from "./components/ErrorMessage";
import Sidebar from "./components/Sidebar";
import { useTheme } from "./hooks/useTheme";
import { useError } from "./hooks/useError";
import { Section } from "./types";
import "./App.css";

/**
 * Loop 애플리케이션의 메인 컴포넌트
 * 타이핑 로그를 기록하고 사용자 인터페이스를 제공합니다.
 */
function App() {
  // 커스텀 훅을 사용한 상태 관리
  const { theme, toggleTheme } = useTheme();
  const { message: errorMessage, setError, clearError } = useError();

  // 일반 상태 관리
  const [currentLine, setCurrentLine] = useState<string>("");
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>("Monitoring");
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);
  
  // 참조
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      // 자동 포커스
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error("초기화 중 오류 발생:", err);
      setError("애플리케이션 초기화 중 문제가 발생했습니다.");
    }
    
    // 클릭 시 숨겨진 입력 필드로 포커스 이동
    const handleClick = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  /**
   * 키 입력 처리 핸들러
   * Enter 키를 누르면 현재 라인을 저장하고 초기화합니다.
   */
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
      setError("문장을 저장하는 중 문제가 발생했습니다.");
    }
  };

  /**
   * 입력 조합(IME) 시작 핸들러
   */
  const handleCompositionStart = () => setIsComposing(true);

  /**
   * 입력 조합(IME) 종료 핸들러
   * 조합이 완료된 문자를 백엔드에 저장합니다.
   */
  const handleCompositionEnd = async (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    try {
      if (e.data) await invoke("save_typing_data", { key: e.data });
    } catch (err) {
      console.error("타이핑 데이터 저장 중 오류 발생:", err);
      setError("타이핑 데이터를 저장하는 중 문제가 발생했습니다.");
    }
  };
  
  /**
   * 입력 필드 변경 핸들러
   * 입력된 글자를 추적하고 백엔드에 저장합니다.
   */
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
      setError("키 입력을 저장하는 중 문제가 발생했습니다.");
    }
  };

  // 사용 가능한 섹션 목록
  const sections: Section[] = ["Monitoring", "History", "Statistics", "Settings"];

  /**
   * 네비게이션 바 토글 함수
   */
  const toggleNavbar = () => {
    setIsNavOpen(!isNavOpen);
  };

  /**
   * 섹션 변경 핸들러
   * 섹션을 변경하고 모바일 환경에서는 사이드바를 자동으로 닫습니다.
   */
  const handleSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
    if (window.innerWidth < 768) {
      setIsNavOpen(false);
    }
  };

  /**
   * 섹션 내용 렌더링 함수
   * 각 섹션에 맞는 UI를 렌더링합니다.
   */
  const renderSectionContent = (section: Section) => {
    if (section === "Settings") {
      return (
        <div className="section-panel">
          <div className="section-header">설정</div>
          <div className="settings-container">
            <div className="theme-switcher-card">
              <div className="theme-header">
                <h3>테마 설정</h3>
                <div className="theme-description">화면 디스플레이 모드를 변경합니다</div>
              </div>
              
              <div className="theme-control">
                <div className="theme-icons">
                  <div className="theme-icon light">
                    <span className="icon" aria-hidden="true">☀️</span>
                    <span className="label">라이트</span>
                  </div>
                  
                  <label className="theme-toggle">
                    <input 
                      type="checkbox" 
                      checked={theme === 'dark'}
                      onChange={toggleTheme}
                      aria-label="테마 변경"
                    />
                    <span className="toggle-track">
                      <span className="toggle-indicator"></span>
                    </span>
                  </label>
                  
                  <div className="theme-icon dark">
                    <span className="icon" aria-hidden="true">🌙</span>
                    <span className="label">다크</span>
                  </div>
                </div>
                
                <div className="theme-status">
                  현재: <span className="theme-current">{theme === 'dark' ? '다크 모드' : '라이트 모드'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="section-panel">
        <div className="section-header">{section}</div>
        <div className="empty-content">
          {section} 섹션 - 준비 중입니다
        </div>
      </div>
    );
  };

  return (
    <div className={`app-layout ${isNavOpen ? 'nav-open' : 'nav-closed'} theme-${theme}`}>
      {errorMessage && <ErrorMessage message={errorMessage} onClose={clearError} />}
      
      <div className="app-header">
        <button 
          className="hamburger-menu" 
          onClick={toggleNavbar}
          aria-label={isNavOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isNavOpen}
        >
          <div className="hamburger-icon"></div>
        </button>
        <h1 className="app-title">Loop</h1>
      </div>
      
      <Sidebar 
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        isNavOpen={isNavOpen}
        sections={sections}
      />
      
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
          aria-label="타이핑 입력"
        />
        
        {/* 각 섹션별 내용 */}
        <div className="section-content" role="main">
          {renderSectionContent(activeSection)}
        </div>
      </div>
    </div>
  );
}

export default App;
