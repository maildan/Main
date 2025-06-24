use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::Path;
use crate::database::models::*;
use crate::config::DatabaseConfig;
use chrono::Utc;
use uuid::Uuid;

/// 데이터베이스 연결 및 관리를 담당하는 구조체
#[derive(Debug, Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {    /// 새로운 데이터베이스 인스턴스 생성
    pub async fn new() -> Result<Self, sqlx::Error> {
        // # debug: 데이터베이스 초기화 시작
        println!("✓ Database ready");
        
        let config = DatabaseConfig::from_env();
        let database_url = &config.url;
        
        // SQLite 파일 경로 처리
        let db_path = if database_url.starts_with("sqlite:") {
            database_url.strip_prefix("sqlite:").unwrap_or(database_url)
        } else {
            database_url
        };        // 현재 작업 디렉토리 기준으로 절대 경로 생성
        let absolute_path = if db_path.starts_with("./") {
            // 개발 환경에서는 프로젝트 루트 기준, 배포 환경에서는 실행 파일 기준
            if cfg!(debug_assertions) {
                // 개발 환경: 현재 디렉토리 기준
                std::env::current_dir()
                    .map_err(|e| sqlx::Error::Io(e))?
                    .join(db_path.trim_start_matches("./"))
            } else {
                // 배포 환경: 실행 파일 디렉토리 기준
                std::env::current_exe()
                    .map_err(|e| sqlx::Error::Io(e))?
                    .parent()
                    .ok_or_else(|| sqlx::Error::Io(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        "실행 파일 디렉토리를 찾을 수 없습니다"
                    )))?
                    .join(db_path.trim_start_matches("./"))
            }
        } else if db_path.starts_with("../") {
            std::env::current_dir()
                .map_err(|e| sqlx::Error::Io(e))?
                .join(db_path)
        } else if Path::new(db_path).is_absolute() {
            Path::new(db_path).to_path_buf()
        } else {
            // 상대 경로
            if cfg!(debug_assertions) {
                std::env::current_dir()
                    .map_err(|e| sqlx::Error::Io(e))?
                    .join(db_path)
            } else {
                std::env::current_exe()
                    .map_err(|e| sqlx::Error::Io(e))?
                    .parent()
                    .ok_or_else(|| sqlx::Error::Io(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        "실행 파일 디렉토리를 찾을 수 없습니다"
                    )))?
                    .join(db_path)
            }
        };
        

          // 데이터베이스 파일이 없으면 생성
        if !absolute_path.exists() {
            if let Some(parent) = absolute_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    sqlx::Error::Io(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!("디렉토리 생성 실패: {}", e),
                    ))
                })?;
                println!("Created directory: {:?}", parent);
            }
            
            // 빈 데이터베이스 파일 생성
            std::fs::File::create(&absolute_path).map_err(|e| {
                sqlx::Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("데이터베이스 파일 생성 실패: {}", e),
                ))
            })?;
            println!("Created database file: {:?}", absolute_path);
        }
        
        // SQLite 연결 URL 생성
        let sqlite_url = format!("sqlite:{}", absolute_path.to_string_lossy());
        

        let pool = SqlitePool::connect(&sqlite_url).await?;

        let db = Self { pool };
        db.run_migrations().await?;
        
        // # debug: 데이터베이스 초기화 완료

        
        Ok(db)
    }

    /// 데이터베이스 마이그레이션 실행
    async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // # debug: 마이그레이션 시작

        
        // 기본 스키마 생성
        let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
        
        // SQL 문을 세미콜론으로 분리하여 실행
        for statement in migration_sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                sqlx::query(statement).execute(&self.pool).await?;
            }
        }
        
        // # debug: 마이그레이션 완료

        
        Ok(())
    }

    /// 사용자 생성 또는 업데이트
    pub async fn upsert_user(&self, user: &CreateUserRequest) -> Result<User, sqlx::Error> {
        let user_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, google_id, email, name, picture_url, access_token, refresh_token, token_expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT(google_id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                picture_url = EXCLUDED.picture_url,
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                updated_at = EXCLUDED.updated_at
            RETURNING *
            "#
        )
        .bind(&user_id)
        .bind(&user.google_id)
        .bind(&user.email)
        .bind(&user.name)
        .bind(&user.picture_url)
        .bind(&user.access_token)
        .bind(&user.refresh_token)
        .bind(&user.token_expires_at)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }    /// 사용자 토큰 업데이트
    pub async fn update_user_tokens(&self, user_id: &str, request: &crate::database::UpdateTokenRequest) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        
        sqlx::query(
            "UPDATE users SET access_token = $1, refresh_token = COALESCE($2, refresh_token), token_expires_at = $3, updated_at = $4 WHERE id = $5"
        )
        .bind(&request.access_token)
        .bind(request.refresh_token.as_deref())
        .bind(request.token_expires_at)
        .bind(now)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Google ID로 사용자 조회
    pub async fn get_user_by_google_id(&self, google_id: &str) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE google_id = $1"
        )
        .bind(google_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    /// 사용자 ID로 사용자 조회
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<Option<User>, sqlx::Error> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    /// 문서 생성 또는 업데이트
    pub async fn upsert_document(&self, document: &CreateDocumentRequest) -> Result<Document, sqlx::Error> {
        let doc_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let document = sqlx::query_as::<_, Document>(
            r#"
            INSERT INTO documents (id, google_doc_id, user_id, title, content, word_count, created_time, modified_time, last_synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT(google_doc_id) DO UPDATE SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                word_count = EXCLUDED.word_count,
                modified_time = EXCLUDED.modified_time,
                last_synced_at = EXCLUDED.last_synced_at,
                updated_at = EXCLUDED.updated_at
            RETURNING *
            "#
        )
        .bind(&doc_id)
        .bind(&document.google_doc_id)
        .bind(&document.user_id)
        .bind(&document.title)
        .bind(&document.content)
        .bind(&document.word_count)
        .bind(&document.created_time)
        .bind(&document.modified_time)
        .bind(&now)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(document)
    }

    /// 사용자의 문서 목록 조회
    pub async fn get_user_documents(&self, user_id: &str, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Document>, sqlx::Error> {
        let limit = limit.unwrap_or(100);
        let offset = offset.unwrap_or(0);

        let documents = sqlx::query_as::<_, Document>(
            "SELECT * FROM documents WHERE user_id = $1 ORDER BY modified_time DESC LIMIT $2 OFFSET $3"
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(documents)
    }

    /// 문서 내용 조회
    pub async fn get_document_by_id(&self, document_id: &str) -> Result<Option<Document>, sqlx::Error> {
        let document = sqlx::query_as::<_, Document>(
            "SELECT * FROM documents WHERE id = $1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(document)
    }

    /// Google 문서 ID로 문서 조회
    pub async fn get_document_by_google_id(&self, google_doc_id: &str) -> Result<Option<Document>, sqlx::Error> {
        let document = sqlx::query_as::<_, Document>(
            "SELECT * FROM documents WHERE google_doc_id = $1"
        )
        .bind(google_doc_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(document)
    }

    /// 문서 요약 생성 또는 업데이트
    pub async fn upsert_document_summary(&self, summary: &CreateSummaryRequest) -> Result<DocumentSummary, sqlx::Error> {
        let summary_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let document_summary = sqlx::query_as::<_, DocumentSummary>(
            r#"
            INSERT INTO document_summaries (id, document_id, user_id, summary_text, keywords, generated_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT(document_id) DO UPDATE SET
                summary_text = EXCLUDED.summary_text,
                keywords = EXCLUDED.keywords,
                generated_at = EXCLUDED.generated_at,
                updated_at = EXCLUDED.updated_at
            RETURNING *
            "#
        )
        .bind(&summary_id)
        .bind(&summary.document_id)
        .bind(&summary.user_id)
        .bind(&summary.summary_text)
        .bind(&summary.keywords)
        .bind(&now)
        .bind(&now)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(document_summary)
    }

    /// 문서 요약 조회
    pub async fn get_document_summary(&self, document_id: &str) -> Result<Option<DocumentSummary>, sqlx::Error> {
        let summary = sqlx::query_as::<_, DocumentSummary>(
            "SELECT * FROM document_summaries WHERE document_id = $1"
        )
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(summary)
    }

    /// 편집 기록 추가
    pub async fn add_edit_history(&self, edit: &CreateEditHistoryRequest) -> Result<EditHistory, sqlx::Error> {
        let edit_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let edit_history = sqlx::query_as::<_, EditHistory>(
            r#"
            INSERT INTO edit_history (id, document_id, user_id, action_type, content_before, content_after, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#
        )
        .bind(&edit_id)
        .bind(&edit.document_id)
        .bind(&edit.user_id)
        .bind(&edit.action_type)
        .bind(&edit.content_before)
        .bind(&edit.content_after)
        .bind(&edit.metadata)
        .bind(&now)
        .fetch_one(&self.pool)
        .await?;

        Ok(edit_history)
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