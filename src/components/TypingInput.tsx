import React from "react";
import { TypingInputProps } from "../types";

/**
 * 키보드 입력을 처리하는 숨겨진 입력 컴포넌트
 */
const TypingInput: React.FC<TypingInputProps> = ({
  currentLine,
  isEnabled,
  inputRef,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd
}) => {
  return (
    <input
      ref={inputRef}
      type="text"
      value={currentLine}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      autoFocus={isEnabled}
      className="hidden-input"
      aria-label="타이핑 입력"
      disabled={!isEnabled}
    />
  );
};

export default TypingInput;