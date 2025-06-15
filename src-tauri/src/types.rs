use serde::{Deserialize, Serialize};

/// AES 키 후보 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AESKeyCandidate {
    pub key: [u8; 16],
    pub confidence: u8,
    pub source: String,
}

/// 테마 모드 열거형
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Theme {
    Light,
    Dark,
}

/// 애플리케이션 섹션 열거형
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Section {
    Monitoring,
    History,
    Statistics,
    Settings,
}

/// 오류 상태 구조체
#[allow(dead_code)]
#[derive(Debug, Default)]
pub struct ErrorState {
    pub message: Option<String>,
}

impl ErrorState {
    /// 오류 메시지를 설정합니다.
    #[allow(dead_code)]
    pub fn set_error(&mut self, message: String) {
        self.message = Some(message);
    }

    /// 오류 메시지를 초기화합니다.
    #[allow(dead_code)]
    pub fn clear_error(&mut self) {
        self.message = None;
    }
}

/// 테마 상태 구조체
#[allow(dead_code)]
#[derive(Debug)]
pub struct ThemeState {
    pub theme: Theme,
}

impl ThemeState {
    /// 테마를 전환합니다.
    #[allow(dead_code)]
    pub fn toggle_theme(&mut self) {
        self.theme = match self.theme {
            Theme::Light => Theme::Dark,
            Theme::Dark => Theme::Light,
        };
    }
}

// ThemeState에 Default trait 구현
impl Default for ThemeState {
    fn default() -> Self {
        Self {
            theme: Theme::Dark, // 기본 테마를 다크 모드로 설정
        }
    }
}

/// 분석 진행률 구조체
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AnalysisProgress {
    pub static_progress: f32,     // 정적 분석 진행률 (0-100)
    pub dynamic_progress: f32,    // 동적 분석 진행률 (0-100)
    pub total_progress: f32,      // 전체 진행률 (0-100)
    pub current_task: String,     // 현재 작업 설명
    pub is_running: bool,         // 실행 중 여부
    pub keys_candidates_found: u32, // 발견된 키 후보 수
}

impl Default for AnalysisProgress {
    fn default() -> Self {
        Self {
            static_progress: 0.0,
            dynamic_progress: 0.0,
            total_progress: 0.0,
            current_task: "대기 중...".to_string(),
            is_running: false,
            keys_candidates_found: 0,
        }
    }
}

/// 분석 단계 열거형
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum AnalysisPhase {
    Static,   // 정적 분석
    Dynamic,  // 동적 분석
    Complete, // 완료
}

/// 키 후보 결과 구조체
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KeyCandidate {
    pub key: Vec<u8>,
    pub source: String,
    pub confidence: u8,
    pub description: String,
}

/// 분석 결과 구조체
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AnalysisResult {
    pub progress: AnalysisProgress,
    pub key_candidates: Vec<KeyCandidate>,
    pub success: bool,
    pub error_message: Option<String>,
}