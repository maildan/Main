use std::env;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("환경변수 {key}가 설정되지 않았습니다")]
    MissingEnvVar { key: String },
    #[error("환경변수 {key}의 값이 비어있습니다")]
    EmptyEnvVar { key: String },
    #[error("환경변수 파일 로드 실패: {0}")]
    #[allow(dead_code)]
    DotenvError(String),
}

/// 환경변수 파일(.env) 로드
pub fn load_env() -> Result<(), ConfigError> {
    match dotenvy::dotenv() {
        Ok(_) => {
            println!("✓ App initialized");
            Ok(())
        }
        Err(e) => {
            // .env 파일이 없는 경우는 에러가 아님 (시스템 환경변수 사용)
            println!("No .env file found, using system environment variables: {}", e);
            Ok(())
        }
    }
}

/// 환경변수를 안전하게 가져오는 함수
pub fn get_env_var(key: &str) -> Result<String, ConfigError> {
    env::var(key)
        .map_err(|_| ConfigError::MissingEnvVar { 
            key: key.to_string() 
        })
        .and_then(|value| {
            if value.trim().is_empty() {
                Err(ConfigError::EmptyEnvVar { 
                    key: key.to_string() 
                })
            } else {
                Ok(value)
            }
        })
}

/// 환경변수를 기본값과 함께 가져오는 함수
pub fn get_env_var_or_default(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

/// Google OAuth 설정 구조체
#[derive(Debug, Clone)]
pub struct GoogleConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

impl GoogleConfig {
    /// 환경변수에서 Google OAuth 설정 로드
    pub fn from_env() -> Result<Self, ConfigError> {
        // # debug: Google OAuth 설정 로드 시작
        println!("Loading Google OAuth configuration from environment variables");
        
        let config = Self {
            client_id: get_env_var("GOOGLE_CLIENT_ID")?,
            client_secret: get_env_var("GOOGLE_CLIENT_SECRET")?,
            redirect_url: get_env_var_or_default(
                "GOOGLE_REDIRECT_URL", 
                "http://localhost:8080/auth/callback"
            ),
        };

        // # debug: 설정 로드 완료 (민감정보 제외)
        println!("Google OAuth configuration loaded successfully");
        
        Ok(config)
    }    /// 개발 환경용 기본 설정 (테스트용)
    #[allow(dead_code)]
    pub fn default_dev() -> Self {
        Self {
            client_id: "YOUR_GOOGLE_CLIENT_ID".to_string(),
            client_secret: "YOUR_GOOGLE_CLIENT_SECRET".to_string(),
            redirect_url: "http://localhost:8080/auth/callback".to_string(),
        }
    }
}

/// 데이터베이스 설정
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub url: String,
}

impl DatabaseConfig {
    pub fn from_env() -> Self {
        Self {
            url: get_env_var_or_default(
                "DATABASE_URL", 
                "sqlite:app.db"
            ),
        }
    }
}