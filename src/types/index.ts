// 앱에서 사용하는 공통 타입 정의

// 에러 메시지 관련 prop 타입
export interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
  isError?: boolean;
}

// 문서 분석 관련 타입
export interface DocumentFile {
  path: string;
  name: string;
  size: number;
  type: string;
  extension: string;
}

export interface AnalysisResult {
  summary: string;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  language: string;
  confidence: number;
}

export interface DocumentAnalysis {
  file: DocumentFile;
  result: AnalysisResult;
  timestamp: string;
}