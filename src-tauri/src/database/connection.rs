use sqlx::{Pool, Sqlite, SqlitePool};
use std::path::Path;
use crate::database::models::*;
use crate::config::DatabaseConfig;

/// 데이터베이스 연결 및 관리를 담당하는 구조체
#[derive(Debug, Clone)]
pub struct Database {
    pool: Pool<Sqlite>,
}

impl Database {
    /// 새로운 데이터베이스 인스턴스 생성
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
        };
        
        // 현재 작업 디렉토리 기준으로 절대 경로 생성
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
        
        println!("✓ Database initialized successfully");
        Ok(db)
    }

    /// 데이터베이스 마이그레이션 실행
    async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        // 기본 스키마 생성
        let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
        
        // SQL 문을 세미콜론으로 분리하여 실행
        for statement in migration_sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                sqlx::query(statement).execute(&self.pool).await?;
            }
        }
        
        Ok(())
    }

    /// 데이터베이스 풀에 대한 참조 반환 (내부용)
    pub fn get_pool(&self) -> &Pool<Sqlite> {
        &self.pool
    }
}

// 사용자 관련 작업들을 Database에 위임
impl Database {
    pub async fn upsert_user(&self, user: &CreateUserRequest) -> Result<User, sqlx::Error> {
        crate::database::user_operations::upsert_user(&self.pool, user).await
    }

    pub async fn update_user_tokens(&self, user_id: &str, request: &UpdateTokenRequest) -> Result<(), sqlx::Error> {
        crate::database::user_operations::update_user_tokens(&self.pool, user_id, request).await
    }

    pub async fn get_user_by_google_id(&self, google_id: &str) -> Result<Option<User>, sqlx::Error> {
        crate::database::user_operations::get_user_by_google_id(&self.pool, google_id).await
    }

    pub async fn get_user_by_id(&self, user_id: &str) -> Result<Option<User>, sqlx::Error> {
        crate::database::user_operations::get_user_by_id(&self.pool, user_id).await
    }

    pub async fn clear_user_tokens(&self, user_id: &str) -> Result<(), sqlx::Error> {
        crate::database::user_operations::clear_user_tokens(&self.pool, user_id).await
    }

    pub async fn get_all_user_profiles(&self) -> Result<Vec<UserProfile>, sqlx::Error> {
        crate::database::user_operations::get_all_user_profiles(&self.pool).await
    }

    pub async fn remove_account(&self, user_id: &str) -> Result<(), sqlx::Error> {
        crate::database::user_operations::remove_account(&self.pool, user_id).await
    }

    pub async fn switch_to_account(&self, user_id: &str) -> Result<User, sqlx::Error> {
        crate::database::user_operations::switch_to_account(&self.pool, user_id).await
    }

    pub async fn get_current_user(&self) -> Result<Option<User>, sqlx::Error> {
        crate::database::user_operations::get_current_user(&self.pool).await
    }

    pub async fn get_all_saved_accounts(&self) -> Result<Vec<UserProfile>, sqlx::Error> {
        crate::database::user_operations::get_all_saved_accounts(&self.pool).await
    }
}

// 문서 관련 작업들을 Database에 위임
impl Database {
    pub async fn upsert_document(&self, document: &CreateDocumentRequest) -> Result<Document, sqlx::Error> {
        crate::database::document_operations::upsert_document(&self.pool, document).await
    }

    pub async fn get_user_documents(&self, user_id: &str, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Document>, sqlx::Error> {
        crate::database::document_operations::get_user_documents(&self.pool, user_id, limit, offset).await
    }

    pub async fn get_document_by_id(&self, document_id: &str) -> Result<Option<Document>, sqlx::Error> {
        crate::database::document_operations::get_document_by_id(&self.pool, document_id).await
    }

    pub async fn get_document_by_google_id(&self, google_doc_id: &str) -> Result<Option<Document>, sqlx::Error> {
        crate::database::document_operations::get_document_by_google_id(&self.pool, google_doc_id).await
    }

    pub async fn get_documents_by_user(&self, user_id: &str) -> Result<Vec<Document>, sqlx::Error> {
        crate::database::document_operations::get_documents_by_user(&self.pool, user_id).await
    }

    pub async fn sync_documents(&self, user_id: &str, fresh_docs: Vec<Document>) -> Result<Vec<Document>, sqlx::Error> {
        crate::database::document_operations::sync_documents(&self.pool, user_id, fresh_docs).await
    }

    pub async fn cleanup_invalid_documents(&self) -> Result<u64, sqlx::Error> {
        crate::database::document_operations::cleanup_invalid_documents(&self.pool).await
    }

    pub async fn remove_document_by_google_id(&self, google_doc_id: &str) -> Result<(), sqlx::Error> {
        crate::database::document_operations::remove_document_by_google_id(&self.pool, google_doc_id).await
    }
}

// 요약 관련 작업들을 Database에 위임
impl Database {
    pub async fn upsert_document_summary(&self, summary: &CreateSummaryRequest) -> Result<DocumentSummary, sqlx::Error> {
        crate::database::summary_operations::upsert_document_summary(&self.pool, summary).await
    }

    pub async fn get_document_summary(&self, document_id: &str) -> Result<Option<DocumentSummary>, sqlx::Error> {
        crate::database::summary_operations::get_document_summary(&self.pool, document_id).await
    }
}

// 편집 기록 관련 작업들을 Database에 위임
impl Database {
    pub async fn add_edit_history(&self, edit: &CreateEditHistoryRequest) -> Result<EditHistory, sqlx::Error> {
        crate::database::history_operations::add_edit_history(&self.pool, edit).await
    }

    pub async fn get_edit_history(&self, document_id: &str, limit: i32) -> Result<Vec<EditHistory>, sqlx::Error> {
        crate::database::history_operations::get_edit_history(&self.pool, document_id, limit).await
    }
}
