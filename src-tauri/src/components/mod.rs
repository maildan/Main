pub mod error_message;
pub mod sidebar;

// components 모듈에서 외부로 노출할 함수들 재내보내기
pub use error_message::render_error_message;
pub use sidebar::render_sidebar;