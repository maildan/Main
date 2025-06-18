// 설정 파일 임포트 (경로 이슈가 있을 수 있어 try-catch로 처리됨)
import settingsConfig from '../../config/settings.json';

// JSON 설정을 TypeScript 타입으로 변환
export interface SettingsConfig {
  app: {
    name: string;
    version: string;
    build: string;
    developer: string;
    description: string;
    subtitle: string;
  };
  themes: Array<{
    value: string;
    label: string;
    icon: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  }>;
  languages: Array<{
    value: string;
    label: string;
    icon: string;
    rtl: boolean;
  }>;
  defaultSettings: {
    theme: string;
    language: string;
    general: {
      autoSave: boolean;
      showNotifications: boolean;
      enableSounds: boolean;
      defaultSearchEngine: string;
      animationSpeed: string;
      fontSize: string;
    };
    advanced: {
      enableDebugMode: boolean;
      cacheSize: number;
      maxLogEntries: number;
      enableAnalytics: boolean;
      autoUpdate: boolean;
      experimentalFeatures: boolean;
    };
  };
  settingsMenu: Array<{
    id: string;
    type: 'toggle' | 'modal' | 'divider';
    label?: string;
    icon?: string;
    category: string;
    order: number;
  }>;
  help: {
    sections: Array<{
      id: string;
      title: string;
      icon: string;
      content: string[];
    }>;
  };
  contact: {
    email: string;
    website: string;
    github: string;
    docs: string;
    discord: string;
  };
  experimental: {
    features: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
      stable: boolean;
    }>;
  };
}

// 기본 설정 (JSON 파일 불러오기 실패 시 fallback)
const DEFAULT_CONFIG: SettingsConfig = {
  app: {
    name: "Loop Pro",
    version: "1.0.0",
    build: "2025.06.18",
    developer: "Loop Team",
    description: "Loop Pro는 카카오톡 메시지 복호화를 위한 전문 도구입니다.",
    subtitle: "안전하고 효율적인 데이터 분석을 제공합니다."
  },
  themes: [
    {
      value: "dark",
      label: "다크 모드",
      icon: "🌙",
      primary: "#1a1a1a",
      secondary: "#2a2a2a",
      accent: "#4fc3f7",
      text: "#ffffff"
    },
    {
      value: "light",
      label: "라이트 모드",
      icon: "☀️",
      primary: "#ffffff",
      secondary: "#f5f5f5",
      accent: "#2196f3",
      text: "#333333"
    },
    {
      value: "auto",
      label: "시스템 설정",
      icon: "⚙️",
      primary: "auto",
      secondary: "auto",
      accent: "#4fc3f7",
      text: "auto"
    }
  ],
  languages: [
    {
      value: "ko",
      label: "한국어",
      icon: "🇰🇷",
      rtl: false
    },
    {
      value: "en",
      label: "English",
      icon: "🇺🇸",
      rtl: false
    },
    {
      value: "ja",
      label: "日本語",
      icon: "🇯🇵",
      rtl: false
    },
    {
      value: "zh",
      label: "中文",
      icon: "🇨🇳",
      rtl: false
    }
  ],
  defaultSettings: {
    theme: "dark",
    language: "ko",
    general: {
      autoSave: true,
      showNotifications: true,
      enableSounds: false,
      defaultSearchEngine: "google",
      animationSpeed: "normal",
      fontSize: "medium"
    },
    advanced: {
      enableDebugMode: false,
      cacheSize: 100,
      maxLogEntries: 1000,
      enableAnalytics: false,
      autoUpdate: true,
      experimentalFeatures: false
    }
  },  settingsMenu: [
    {
      id: "general",
      type: "modal",
      label: "일반 설정",
      icon: "⚙️",
      category: "settings",
      order: 1
    },
    {
      id: "language",
      type: "toggle",
      category: "appearance",
      order: 2
    },
    {
      id: "divider1",
      type: "divider",
      category: "appearance",
      order: 3
    },
    {
      id: "about",
      type: "modal",
      label: "정보",
      icon: "ℹ️",
      category: "info",
      order: 5
    },
    {
      id: "help",
      type: "modal",
      label: "도움말",
      icon: "❓",
      category: "info",
      order: 6
    }
  ],
  help: {
    sections: [
      {
        id: "getting-started",
        title: "🚀 시작하기",
        icon: "🚀",
        content: [
          "검색창에 \"카카오톡\"을 입력하여 복호화 도구에 접근하세요",
          "필요한 파일을 선택하고 사용자 ID를 입력하세요",
          "복호화 과정을 기다린 후 결과를 확인하세요"
        ]
      },
      {
        id: "precautions",
        title: "⚠️ 주의사항",
        icon: "⚠️",
        content: [
          "본인 소유의 데이터만 분석하세요",
          "법적 문제를 유의하여 사용하세요",
          "중요한 데이터는 백업 후 사용하세요",
          "타인의 개인정보 침해는 금지됩니다"
        ]
      },
      {
        id: "support",
        title: "📞 지원",
        icon: "📞",
        content: [
          "문제가 발생하면 개발팀에 문의하세요:",
          "이메일: support@looppro.com",
          "GitHub: github.com/looppro",
          "문서: docs.looppro.com"
        ]
      }
    ]
  },
  contact: {
    email: "support@looppro.com",
    website: "https://looppro.com",
    github: "https://github.com/looppro",
    docs: "https://docs.looppro.com",
    discord: "https://discord.gg/looppro"
  },
  experimental: {
    features: [
      {
        id: "newUI",
        name: "새로운 UI",
        description: "차세대 사용자 인터페이스 미리보기",
        enabled: false,
        stable: false
      },
      {
        id: "aiAssistant",
        name: "AI 어시스턴트",
        description: "AI 기반 복호화 도우미",
        enabled: false,
        stable: false
      },
      {
        id: "cloudSync",
        name: "클라우드 동기화",
        description: "설정과 데이터를 클라우드에 저장",
        enabled: false,
        stable: false
      }
    ]
  }
};

// 설정 유틸리티 클래스
export class SettingsManager {
  // JSON 설정 데이터 로드 (오류시 fallback 사용)
  private static config: SettingsConfig = (() => {
    try {
      // JSON 파일에서 설정을 가져오려고 시도
      if (settingsConfig) {
        console.log('설정 파일 로드 성공');
        return settingsConfig as SettingsConfig;
      }
      // JSON 파일 로드 실패시 기본 설정 사용
      console.warn('설정 파일 로드 실패, 기본값 사용');
      return DEFAULT_CONFIG;
    } catch (error) {
      // 오류 발생시 기본 설정 사용
      console.error('설정 파일 처리 중 오류 발생:', error);
      return DEFAULT_CONFIG;
    }
  })();

  // 앱 정보 가져오기
  static getAppInfo() {
    return this.config.app;
  }

  // 테마 옵션 가져오기
  static getThemes() {
    return this.config.themes;
  }

  // 언어 옵션 가져오기
  static getLanguages() {
    return this.config.languages;
  }

  // 기본 설정 가져오기
  static getDefaultSettings() {
    return this.config.defaultSettings;
  }

  // 설정 메뉴 구조 가져오기
  static getSettingsMenu() {
    return this.config.settingsMenu.sort((a, b) => a.order - b.order);
  }

  // 도움말 섹션 가져오기
  static getHelpSections() {
    return this.config.help.sections;
  }

  // 연락처 정보 가져오기
  static getContactInfo() {
    return this.config.contact;
  }

  // 실험적 기능 가져오기
  static getExperimentalFeatures() {
    return this.config.experimental.features;
  }

  // 특정 테마 정보 가져오기
  static getThemeById(themeId: string) {
    return this.config.themes.find(theme => theme.value === themeId);
  }

  // 특정 언어 정보 가져오기
  static getLanguageById(languageId: string) {
    return this.config.languages.find(lang => lang.value === languageId);
  }

  // 설정 업데이트 (런타임에서 JSON 설정 수정)
  static updateConfig(newConfig: Partial<SettingsConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 전체 설정 가져오기
  static getFullConfig(): SettingsConfig {
    return this.config;
  }
}

// 편의를 위한 직접 export
export const {
  getAppInfo,
  getThemes,
  getLanguages,
  getDefaultSettings,
  getSettingsMenu,
  getHelpSections,
  getContactInfo,
  getExperimentalFeatures,
  getThemeById,
  getLanguageById
} = SettingsManager;
