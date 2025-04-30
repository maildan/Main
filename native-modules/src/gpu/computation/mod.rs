// GPU 계산 서브모듈
pub mod matrix;
pub mod text;
pub mod pattern;
pub mod image;
pub mod data;
pub mod typing;

// 모듈에서 공통 함수 재노출
pub use text::perform_text_analysis;
pub use pattern::perform_pattern_detection;
pub use image::perform_image_processing;
pub use data::perform_data_aggregation;
pub use typing::perform_typing_statistics;
