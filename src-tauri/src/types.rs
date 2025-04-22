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