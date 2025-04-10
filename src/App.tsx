import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [currentLine, setCurrentLine] = useState("");
  
  // useEffect를 사용하여 컴포넌트가 마운트될 때 이벤트 리스너 추가
  useEffect(() => {
    // 전역 이벤트 리스너 추가
    const handleGlobalKeyPress = async (event: KeyboardEvent) => {
      const pressedKey = event.key;

      if (pressedKey === "Enter") {
        // 현재 줄을 로그에 추가하고 문장을 Rust 백엔드로 보내어 터미널에 로그 출력
        if (currentLine.trim()) {
          await invoke("log_sentence", { sentence: currentLine });
        }
        setCurrentLine("");
      } else if (pressedKey === " ") {
        // 공백 추가
        setCurrentLine((prev) => prev + " ");
        await invoke("save_typing_data", { key: pressedKey });
      } else if (pressedKey.length === 1 && /^[a-zA-Z0-9,;:.(){}[\]<>|\\\/+=\-_*&^%$#@!~?'"`]$/.test(pressedKey)) {
        // 일반 키인 경우만 처리 (제어키, 기능키 제외)
        // 큰따옴표("), 작은따옴표('), 슬래시(/), 물음표(?), 물결(~) 등의 문장 기호 포함
        setCurrentLine((prev) => prev + pressedKey);
        await invoke("save_typing_data", { key: pressedKey });
      }
    };

    // 전역 document에 이벤트 리스너 추가
    document.addEventListener("keydown", handleGlobalKeyPress);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyPress);
    };
  }, [currentLine]); // currentLine이 변경될 때마다 이벤트 리스너 업데이트

  return (
    <div className="App">
      <h1>Typing App</h1>
      <p>텍스트를 입력하세요. 엔터를 누르면 문장이 로그에 저장됩니다.</p>
      
      <div className="typing-area">
        <strong>현재 입력:</strong> {currentLine}
      </div>
    </div>
  );
}

export default App;
