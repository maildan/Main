// 앱에서 사용하는 공통 타입 정의

// 에러 메시지 관련 prop 타입
export interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
  isError?: boolean;
}

// 카카오톡 관련 타입
export interface KakaoMessage {
  id: number;
  chat_id: number;
  user_id: string;
  type: number;
  message: string;
  attachment?: string;
  created_at: string;
}

export interface KakaoFile {
  path: string;
  name: string;
  size: number;
}

export interface KakaoDecryptionResult {
  messages: KakaoMessage[];
  total_count: number;
}