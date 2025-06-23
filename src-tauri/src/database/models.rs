use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sqlx::FromRow;

/// 사용자 정보 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: String,
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub profile_picture: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
    pub token_expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Google Docs 문서 정보 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub google_created_time: DateTime<Utc>,
    pub google_modified_time: DateTime<Utc>,
    pub last_synced: DateTime<Utc>,
    pub word_count: Option<i32>,
    pub content_summary: Option<String>,
}

/// 문서 요약 정보 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Summary {
    pub id: String,
    pub document_id: String,
    pub summary_text: String,
    pub summary_type: String, // "ai_generated", "manual", etc.
    pub created_at: DateTime<Utc>,
}

/// 문서 편집 기록 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EditHistory {
    pub id: String,
    pub document_id: String,
    pub action_type: String, // "insert", "update", "delete"
    pub action_description: String,
    pub content_before: Option<String>,
    pub content_after: Option<String>,
    pub position: Option<String>, // JSON 형태로 삽입 위치 정보 저장
    pub created_at: DateTime<Utc>,
}

/// 사용자 생성 요청 DTO
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub profile_picture: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
    pub token_expires_at: DateTime<Utc>,
}

/// 토큰 업데이트 요청 DTO
#[derive(Debug, Deserialize)]
pub struct UpdateTokenRequest {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_expires_at: DateTime<Utc>,
}

/// Google OAuth 응답 DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleOAuthResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub scope: String,
    pub token_type: String,
    pub id_token: Option<String>,
}

/// Google 사용자 정보 응답 DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleUserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub verified_email: bool,
}

/// 문서 목록 응답 DTO
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentListResponse {
    pub documents: Vec<Document>,
    pub total_count: i32,
}

/// 에러 응답 DTO
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub code: Option<String>,
}
