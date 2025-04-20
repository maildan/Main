import React from "react";
import { ErrorMessageProps } from "../types";

/**
 * 앱 내 에러 메시지를 표시하는 컴포넌트
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClose }) => {
  if (!message) return null;
  
  return (
    <div className="error-message" role="alert">
      <p>{message}</p>
      <button onClick={onClose}>닫기</button>
    </div>
  );
};

export default ErrorMessage;