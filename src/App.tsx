import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [currentLine, setCurrentLine] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
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

  return (
    <div className="compact-root" onClick={() => inputRef.current?.focus()}>
      <h1 className="compact-title">Loop</h1>
      <input
        ref={inputRef}
        type="text"
        value={currentLine}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        autoFocus
        placeholder="Type here..."
        className="compact-input"
      />
    </div>
  );
}

export default App;
