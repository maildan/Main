import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * 키보드 트래킹 기능에 관련된 상태와 로직을 관리하는 커스텀 훅
 * @returns {TrackingHookReturn} 트래킹 관련 상태와 핸들러 함수들
 */
export interface TrackingHookReturn {
  errorMessage: string | null;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  currentLine: string;
  isComposing: boolean;
  isTrackingEnabled: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  toggleTracking: () => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => Promise<void>;
  handleCompositionStart: () => void;
  handleCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => Promise<void>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useTracking(): TrackingHookReturn {
  // 상태 관리
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(false);
  
  // 참조
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 초기 트래킹 상태 확인
    const checkTrackingStatus = async (): Promise<void> => {
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
    const handleClick = (): void => {
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

  const toggleTracking = async (): Promise<void> => {
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

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
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

  const handleCompositionStart = (): void => setIsComposing(true);

  const handleCompositionEnd = async (e: React.CompositionEvent<HTMLInputElement>): Promise<void> => {
    setIsComposing(false);
    
    if (!isTrackingEnabled) return;
    
    try {
      if (e.data) await invoke("save_typing_data", { key: e.data });
    } catch (err) {
      console.error("타이핑 데이터 저장 중 오류 발생:", err);
    }
  };
  
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
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

  return {
    errorMessage,
    setErrorMessage,
    currentLine,
    isComposing,
    isTrackingEnabled,
    inputRef,
    toggleTracking,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
    handleInputChange
  };
}