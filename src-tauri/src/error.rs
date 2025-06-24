use std::fmt;

/// 앱에서 발생하는 에러 타입들
#[derive(Debug)]
pub enum AppError {
    /// 데이터베이스 에러
    DatabaseError(sqlx::Error),
    /// Google API 에러
    GoogleApiError(String),
    /// 인증 에러
    AuthError(String),
    /// 구성 에러
    ConfigError(crate::config::ConfigError),
    /// 일반적인 에러
    General(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::DatabaseError(e) => write!(f, "데이터베이스 에러: {}", e),
            AppError::GoogleApiError(e) => write!(f, "Google API 에러: {}", e),
            AppError::AuthError(e) => write!(f, "인증 에러: {}", e),
            AppError::ConfigError(e) => write!(f, "구성 에러: {}", e),
            AppError::General(e) => write!(f, "에러: {}", e),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        AppError::DatabaseError(error)
    }
}

impl From<crate::config::ConfigError> for AppError {
    fn from(error: crate::config::ConfigError) -> Self {
        AppError::ConfigError(error)
    }
}

impl From<Box<dyn std::error::Error>> for AppError {
    fn from(error: Box<dyn std::error::Error>) -> Self {
        AppError::General(error.to_string())
    }
}

/// 결과 타입 별칭
pub type AppResult<T> = Result<T, AppError>;
