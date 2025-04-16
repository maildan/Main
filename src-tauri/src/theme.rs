use crate::types::{Theme, ThemeState};
use std::sync::{Arc, Mutex};

/// 테마 상태를 관리하는 구조체
#[derive(Debug, Default)]
pub struct ThemeManager {
    state: Arc<Mutex<ThemeState>>,
}

impl ThemeManager {
    /// 새로운 ThemeManager를 생성합니다.
    pub fn new(initial_theme: Theme) -> Self {
        Self {
            state: Arc::new(Mutex::new(ThemeState { theme: initial_theme })),
        }
    }

    /// 현재 테마를 가져옵니다.
    pub fn get_theme(&self) -> Theme {
        let state = self.state.lock().unwrap();
        state.theme
    }

    /// 테마를 전환합니다.
    pub fn toggle_theme(&self) {
        let mut state = self.state.lock().unwrap();
        state.toggle_theme();
    }
}