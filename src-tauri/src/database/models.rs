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
    pub picture_url: Option<String>,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 사용자 생성 요청
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub picture_url: Option<String>,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_expires_at: DateTime<Utc>,
}

/// Google Docs 문서 정보 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: String,
    pub google_doc_id: String,
    pub user_id: String,
    pub title: String,
    pub content: Option<String>,
    pub word_count: Option<i32>,
    pub created_time: DateTime<Utc>,
    pub modified_time: DateTime<Utc>,
    pub last_synced_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 문서 생성 요청
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub google_doc_id: String,
    pub user_id: String,
    pub title: String,
    pub content: Option<String>,
    pub word_count: Option<i32>,
    pub created_time: DateTime<Utc>,
    pub modified_time: DateTime<Utc>,
}

/// 문서 요약 정보 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DocumentSummary {
    pub id: String,
    pub document_id: String,
    pub user_id: String,
    pub summary_text: String,
    pub keywords: Option<String>,
    pub generated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 요약 생성 요청
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSummaryRequest {
    pub document_id: String,
    pub user_id: String,
    pub summary_text: String,
    pub keywords: Option<String>,
}

/// 문서 편집 기록 모델
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EditHistory {
    pub id: String,
    pub document_id: String,
    pub user_id: String,
    pub action_type: String, // "view", "edit", "summarize"
    pub content_before: Option<String>,
    pub content_after: Option<String>,
    pub metadata: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 편집 기록 생성 요청
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEditHistoryRequest {
    pub document_id: String,
    pub user_id: String,
    pub action_type: String,
    pub content_before: Option<String>,
    pub content_after: Option<String>,
    pub metadata: Option<String>,
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
