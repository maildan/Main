// 앱에서 사용하는 공통 타입 정의

// 섹션 타입
export type Section = "모니터링" | "히스토리" | "통계" | "설정";

// 에러 메시지 관련 prop 타입
export interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
  isError?: boolean;
}

// 네비게이션 관련 prop 타입
export interface NavigationProps {
  sections: Section[];
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}