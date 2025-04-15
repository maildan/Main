import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [currentLine, setCurrentLine] = useState("");
  const [isKoreanMode, setIsKoreanMode] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 이전 값 저장을 위한 ref
  const prevLineRef = useRef<string>("");
  const composedCharRef = useRef<string>("");
  
  // 컴포넌트가 마운트되면 자동으로 input에 포커스
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 한/영 키 감지 및 모드 토글
  const handleKeyDown = async (event: React.KeyboardEvent) => {
    const pressedKey = event.key;
    const code = event.code;

    // 한/영 키 감지 개선 (Process 키만으로는 판단하지 않음)
    // 실제 한/영 전환 키인 경우만 모드 전환
    if (code === "Lang1" || code === "Lang2" || 
        // 한/영 키는 브라우저마다 다르게 감지될 수 있음
        code === "HangulMode" || 
        // Windows에서 Alt+한글 조합으로도 전환 가능
        (event.altKey && (code === "KeyK" || code === "KeyH"))) {
      
      setIsKoreanMode((prev) => !prev);
      await invoke("save_typing_data", { key: "Language Toggle" });
      console.log("Language mode toggled to:", !isKoreanMode ? "Korean" : "English");
      event.preventDefault();
      return;
    }
    
    // Process 키 이벤트는 무시 (한글 입력 중에 자주 발생)
    if (pressedKey === "Process") {
      return;
    }
    
    // Enter 키 처리
    if (pressedKey === "Enter" && !isComposing) {
      if (currentLine.trim()) {
        await invoke("log_sentence", { sentence: currentLine });
      }
      setCurrentLine("");
      prevLineRef.current = "";
      // 폼 제출 방지
      event.preventDefault();
    }
  };

  // 한글 조합 시작
  const handleCompositionStart = () => {
    setIsComposing(true);
    // 조합 시작 시 현재 라인 저장
    prevLineRef.current = currentLine;
  };

  // 한글 조합 업데이트
  const handleCompositionUpdate = (e: React.CompositionEvent) => {
    composedCharRef.current = e.data;
  };

  // 한글 조합 끝
  const handleCompositionEnd = async (e: React.CompositionEvent) => {
    setIsComposing(false);
    
    // 조합이 완료된 한글 문자 추출 (이전 라인과 현재 라인 비교)
    const composedChar = e.data;
    if (composedChar) {
      console.log("Composition ended with:", composedChar);
      // 조합된 한글 문자를 로그에 추가
      await invoke("save_typing_data", { key: composedChar });
    }
  };

  // 입력 변경 처리
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // 이전 값과 현재 값 비교
    if (!isComposing && newValue.length > currentLine.length) {
      // 조합 중이 아닐 때 (영문자 등의 입력)
      const lastChar = newValue.slice(-1);
      if (lastChar) {
        await invoke("save_typing_data", { key: lastChar });
      }
    }
    
    setCurrentLine(newValue);
  };

  // 지속적으로 포커스 유지
  const maintainFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="App" onClick={maintainFocus}>
      <h1>Typing App</h1>
      <p>Type your text below. Press Enter to log the sentence.</p>
      
      <div className={`language-mode ${isKoreanMode ? "korean-mode" : "english-mode"}`}>
        Current mode: {isKoreanMode ? "한글 (Korean)" : "English"}
      </div>
      
      <div className="typing-area">
        <input
          ref={inputRef}
          type="text"
          value={currentLine}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          autoFocus
          placeholder="Type here..."
          className="typing-input"
        />
      </div>
      
      <div className="language-tip">
        <p>💡 Press the 한/영 key on your keyboard to switch between English and Korean</p>
      </div>
    </div>
  );
}

export default App;
