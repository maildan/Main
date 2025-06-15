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

// 분석 진행률 관련 타입
export interface AnalysisProgress {
  static_progress: number;      // 정적 분석 진행률 (0-100)
  dynamic_progress: number;     // 동적 분석 진행률 (0-100)
  total_progress: number;       // 전체 진행률 (0-100)
  current_task: string;         // 현재 작업 설명
  is_running: boolean;          // 실행 중 여부
  keys_candidates_found: number; // 발견된 키 후보 수
}

// 키 후보 타입
export interface KeyCandidate {
  key: number[];
  source: string;
  confidence: number;
  description: string;
}

// 분석 결과 타입
export interface AnalysisResult {
  progress: AnalysisProgress;
  key_candidates: KeyCandidate[];
  success: boolean;
  error_message?: string;
}