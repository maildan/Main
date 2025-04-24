// 앱에서 사용하는 공통 타입 정의

// 섹션 타입
export type Section = "모니터링" | "히스토리" | "통계" | "설정";

// 애플리케이션 유형 (웹앱 + 바로가기 앱)
export enum AppType {
  // 웹 애플리케이션
  GoogleDocs = "GoogleDocs",
  GoogleSheets = "GoogleSheets",
  GoogleSlides = "GoogleSlides",
  Notion = "Notion",
  Trello = "Trello",
  GitHub = "GitHub",
  Gmail = "Gmail",
  YouTube = "YouTube",
  Instagram = "Instagram",
  
  // 오피스 애플리케이션
  MicrosoftWord = "MicrosoftWord",
  MicrosoftExcel = "MicrosoftExcel",
  MicrosoftPowerPoint = "MicrosoftPowerPoint",
  MicrosoftOneNote = "MicrosoftOneNote",
  
  // 코딩 애플리케이션
  VSCode = "VSCode",
  IntelliJ = "IntelliJ",
  Eclipse = "Eclipse",
  AndroidStudio = "AndroidStudio",
  
  // SNS 애플리케이션
  KakaoTalk = "KakaoTalk",
  Discord = "Discord",
  
  // 문서 애플리케이션
  Notepad = "Notepad",
  
  // 기타
  Other = "Other",
  None = "None"
}

// 이전 버전 호환성을 위한 WebAppType 타입 정의
export type WebAppType = AppType;

// 브라우저 정보 타입
export interface BrowserInfo {
  name: string;
  process_id: number;
  window_title: string;
  web_app: AppType; // 애플리케이션 유형 필드 추가
}

// 브라우저 통계 타입
export interface BrowserStats {
  browserName: string;
  visitCount: number;
  totalTimeSpent: number; // 초 단위
}

// 에러 메시지 관련 prop 타입
export interface ErrorMessageProps {
  message: string | null;
  onClose: () => void;
  isError?: boolean;
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
  // 모니터링 관련 속성 추가
  isMonitoringActive?: boolean;
  toggleMonitoring?: () => void;
  browserDetector?: any;
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