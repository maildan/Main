import { useEffect } from "react";

interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
  isError?: boolean;
}

/**
 * 에러 메시지 표시 컴포넌트
 * 일정 시간 후 자동으로 사라지며, 사용자가 수동으로 닫을 수도 있습니다.
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onClose, 
  isError = true 
}) => {
  // 5초 후 자동으로 메시지 닫기
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  // 메시지가 없으면 렌더링하지 않음
  if (!message) {
    return null;
  }

  return (
    <div className={`error-message ${isError ? 'error' : 'info'}`}>
      <div className="error-content">
        <span className="error-text">{message}</span>
        <button 
          className="error-close-btn"
          onClick={onClose}
          aria-label="메시지 닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ErrorMessage;
