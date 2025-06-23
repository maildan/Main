use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::Path;
use crate::database::models::*;
use chrono::Utc;
use uuid::Uuid;

/// 데이터베이스 연결 및 관리를 담당하는 구조체
#[derive(Debug, Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    /// 새로운 데이터베이스 인스턴스 생성
    pub async fn new() -> Result<Self, sqlx::Error> {
        let db_path = Self::get_database_path().await?;
        
        // 데이터베이스 파일이 없으면 생성
        if !Path::new(&db_path).exists() {
            if let Some(parent) = Path::new(&db_path).parent() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    sqlx::Error::Io(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("디렉토리 생성 실패: {}", e),
                    ))
                })?;
            }
        }

        let database_url = format!("sqlite:{}", db_path);
        let pool = SqlitePool::connect(&database_url).await?;

        let db = Self { pool };
        db.run_migrations().await?;

        Ok(db)
    }

    /// 데이터베이스 파일 경로 가져오기
    async fn get_database_path() -> Result<String, sqlx::Error> {
        // 임시로 현재 디렉토리 사용 (실제 구현에서는 앱 데이터 디렉토리 사용)
        let db_path = std::env::current_dir()
            .map_err(|e| sqlx::Error::Io(e))?
            .join("loop_pro.db");
        
        Ok(db_path.to_string_lossy().to_string())
    }

    /// 데이터베이스 마이그레이션 실행
    async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // 사용자 테이블 생성
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                google_id TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                name TEXT NOT NULL,
                profile_picture TEXT,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                token_expires_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 문서 테이블 생성
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                google_created_time DATETIME NOT NULL,
                google_modified_time DATETIME NOT NULL,
                last_synced DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                word_count INTEGER,
                content_summary TEXT
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 요약 테이블 생성
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS summaries (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                summary_text TEXT NOT NULL,
                summary_type TEXT NOT NULL DEFAULT 'ai_generated',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 편집 기록 테이블 생성
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS edit_history (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_description TEXT NOT NULL,
                content_before TEXT,
                content_after TEXT,
                position TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 사용자 생성 또는 업데이트
    pub async fn upsert_user(&self, request: CreateUserRequest) -> Result<User, sqlx::Error> {
        let user_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, google_id, email, name, profile_picture, access_token, refresh_token, token_expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT(google_id) DO UPDATE SET
                email = excluded.email,
                name = excluded.name,
                profile_picture = excluded.profile_picture,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                updated_at = excluded.updated_at
            RETURNING *
            "#,
        )
        .bind(&user_id)
        .bind(&request.google_id)
        .bind(&request.email)
        .bind(&request.name)
        .bind(&request.profile_picture)
        .bind(&request.access_token)
        .bind(&request.refresh_token)
        .bind(&request.token_expires_at)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    /// Google ID로 사용자 조회
    pub async fn get_user_by_google_id(&self, google_id: &str) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE google_id = $1")
            .bind(google_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(user)
    }

    /// 사용자 토큰 업데이트
    pub async fn update_user_tokens(&self, google_id: &str, request: UpdateTokenRequest) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE users 
            SET access_token = $1, 
                refresh_token = COALESCE($2, refresh_token),
                token_expires_at = $3,
                updated_at = $4
            WHERE google_id = $5
            "#,
        )
        .bind(&request.access_token)
        .bind(&request.refresh_token)
        .bind(&request.token_expires_at)
        .bind(&now)
        .bind(google_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 문서 저장 또는 업데이트
    pub async fn upsert_document(&self, doc: &Document) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO documents (id, title, google_created_time, google_modified_time, last_synced, word_count, content_summary)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                google_modified_time = excluded.google_modified_time,
                last_synced = excluded.last_synced,
                word_count = excluded.word_count,
                content_summary = excluded.content_summary
            "#,
        )
        .bind(&doc.id)
        .bind(&doc.title)
        .bind(&doc.google_created_time)
        .bind(&doc.google_modified_time)
        .bind(&now)
        .bind(&doc.word_count)
        .bind(&doc.content_summary)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 모든 문서 조회
    pub async fn get_all_documents(&self) -> Result<Vec<Document>, sqlx::Error> {
        let documents = sqlx::query_as::<_, Document>(
            "SELECT * FROM documents ORDER BY google_modified_time DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(documents)
    }

    /// 문서 ID로 조회
    pub async fn get_document_by_id(&self, doc_id: &str) -> Result<Option<Document>, sqlx::Error> {
        let document = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = $1")
            .bind(doc_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(document)
    }

    /// 요약 저장
    pub async fn create_summary(&self, document_id: &str, summary_text: &str, summary_type: &str) -> Result<Summary, sqlx::Error> {
        let summary_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let summary = sqlx::query_as::<_, Summary>(
            r#"
            INSERT INTO summaries (id, document_id, summary_text, summary_type, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(&summary_id)
        .bind(document_id)
        .bind(summary_text)
        .bind(summary_type)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(summary)
    }

    /// 문서의 최신 요약 조회
    pub async fn get_latest_summary(&self, document_id: &str) -> Result<Option<Summary>, sqlx::Error> {
        let summary = sqlx::query_as::<_, Summary>(
            "SELECT * FROM summaries WHERE document_id = $1 ORDER BY created_at DESC LIMIT 1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(summary)
    }

    /// 편집 기록 저장
    pub async fn create_edit_history(&self, edit: &EditHistory) -> Result<(), sqlx::Error> {
        let edit_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO edit_history (id, document_id, action_type, action_description, content_before, content_after, position, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(&edit_id)
        .bind(&edit.document_id)
        .bind(&edit.action_type)
        .bind(&edit.action_description)
        .bind(&edit.content_before)
        .bind(&edit.content_after)
        .bind(&edit.position)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 문서의 편집 기록 조회
    pub async fn get_edit_history(&self, document_id: &str, limit: i32) -> Result<Vec<EditHistory>, sqlx::Error> {
        let history = sqlx::query_as::<_, EditHistory>(
            "SELECT * FROM edit_history WHERE document_id = $1 ORDER BY created_at DESC LIMIT $2"
        )
        .bind(document_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(history)
    }
}
