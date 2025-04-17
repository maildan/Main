import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import "./App.css";

type Section = "Monitoring" | "History" | "Statistics" | "Settings";
type Theme = 'light' | 'dark';

function App() {
  // 상태 관리
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>("Monitoring");
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);
  const [theme, setTheme] = useState<Theme>('dark');
  
  // 참조
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 에러 메시지 이벤트 리스너
    const unlistenError = listen<string>("show_error", ((event) => {
      setErrorMessage(event.payload);
      setTimeout(() => setErrorMessage(null), 5000); // 5초 후 자동으로 제거
    }) as EventCallback<string>);

    // 시스템 테마 설정 동기화
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    } catch (err) {
      console.error("테마 설정 중 오류 발생:", err);
    }
    
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

  const sections: Section[] = ["Monitoring", "History", "Statistics", "Settings"];

  const toggleNavbar = () => {
    setIsNavOpen(!isNavOpen);
  };

  const handleSectionChange = (newSection: Section) => {
    setActiveSection(newSection);
    // 화면 크기에 상관없이 항상 사이드바 닫기
    setIsNavOpen(false);
  };

  const toggleTheme = () => {
    try {
      const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
      
      // 테마 전환 효과를 위한 클래스 추가
      document.documentElement.classList.add('theme-transition');
      
      // DOM 업데이트 최적화를 위해 즉시 요소 스타일 업데이트
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // 상태 업데이트는 DOM 변경 후 적용
      setTheme(newTheme);
      
      // 로컬 스토리지 저장
      localStorage.setItem('theme', newTheme);
      
      // 트랜지션 이후 클래스 제거 (애니메이션 완료 후)
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 800); // 트랜지션이 완료되는 시간보다 약간 길게 설정
    } catch (err) {
      console.error("테마 변경 중 오류 발생:", err);
    }
  };

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
      {errorMessage && (
        <div className="error-message" role="alert">
          <p>{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)}>닫기</button>
        </div>
      )}
      
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
