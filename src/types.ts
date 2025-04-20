// 앱에서 사용하는 공통 타입 정의

// 섹션 타입
export type Section = "모니터링" | "히스토리" | "통계" | "설정";

// 에러 메시지 관련 prop 타입
export interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
}

// 트래킹 컨트롤 관련 prop 타입
export interface TrackingControlProps {
  isEnabled: boolean;
  onToggle: () => void;
}

// 네비게이션 관련 prop 타입
export interface NavigationProps {
  sections: Section[];
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

// 섹션 패널 관련 prop 타입
export interface SectionPanelProps {
  section: Section;
}

// 타이핑 입력 관련 prop 타입
export interface TypingInputProps {
  currentLine: string;
  isEnabled: boolean;
  isComposing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => void;
}