import React, { useState, useEffect, useRef } from "react";
import { ErrorMessageProps } from "../types";

/**
 * 앱 내 에러/알림 메시지를 표시하는 컴포넌트
 * 표시 후 자동으로 페이드아웃 애니메이션과 함께 사라짐
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClose, isError = false }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [animationClass, setAnimationClass] = useState<string>("show");
  const timeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setAnimationClass("show");
      
      // 이전 타이머가 있다면 제거
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // 3초 후 페이드아웃 애니메이션 시작
      timeoutRef.current = window.setTimeout(() => {
        setAnimationClass("hide");
        
        // 애니메이션이 완료되면 컴포넌트를 DOM에서 제거
        timeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 500); // 애니메이션 지속 시간과 일치시킴
      }, 3000);
    } else {
      setIsVisible(false);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, onClose]);

  if (!message || !isVisible) return null;
  
  const messageClass = isError ? "error-message error" : "error-message notification";
  
  return (
    <div className={`${messageClass} ${animationClass}`} role="alert">
      <p>{message}</p>
      <button onClick={() => {
        setAnimationClass("hide");
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 500);
      }}>닫기</button>
    </div>
  );
};

export default ErrorMessage;