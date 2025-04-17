use crate::types::ErrorState;
use std::sync::{Arc, Mutex};

/// 오류 상태를 관리하는 구조체
#[allow(dead_code)]
#[derive(Debug, Default)]
pub struct ErrorManager {
    pub state: Arc<Mutex<ErrorState>>,  // state 필드를 public으로 변경
}

impl ErrorManager {
    /// 새로운 ErrorManager를 생성합니다.
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(ErrorState::default())),
        }
    }

    /// 현재 오류 메시지를 가져옵니다.
    #[allow(dead_code)]
    pub fn get_error(&self) -> Option<String> {
        let state = self.state.lock().unwrap();
        state.message.clone()
    }

    /// 오류 메시지를 설정합니다.
    #[allow(dead_code)]
    pub fn set_error(&self, message: String) {
        let mut state = self.state.lock().unwrap();
        state.set_error(message);
    }

    /// 오류 메시지를 초기화합니다.
    #[allow(dead_code)]
    pub fn clear_error(&self) {
        let mut state = self.state.lock().unwrap();
        state.clear_error();
    }

    /// 오류 상태에 대한 Arc<Mutex<ErrorState>> 참조를 반환합니다.
    #[allow(dead_code)]
    pub fn get_state_ref(&self) -> Arc<Mutex<Option<String>>> {
        let error_state = self.state.clone();
        let message_ref = Arc::new(Mutex::new(None));
        
        // 오류 메시지를 복사
        if let Ok(state) = error_state.lock() {
            if let Some(ref msg) = state.message {
                if let Ok(mut message) = message_ref.lock() {
                    *message = Some(msg.clone());
                }
            }
        }
        
        message_ref
    }
}