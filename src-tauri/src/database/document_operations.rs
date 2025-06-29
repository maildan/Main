use sqlx::{Pool, Sqlite};
use crate::database::models::*;
use chrono::{Utc, DateTime};
use uuid::Uuid;

/// 문서 정보 생성 또는 업데이트
pub async fn upsert_document(pool: &Pool<Sqlite>, document: &CreateDocumentRequest) -> Result<Document, sqlx::Error> {
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
    .fetch_one(pool)
    .await?;

    Ok(document)
}

/// 사용자의 문서 목록 조회
pub async fn get_user_documents(pool: &Pool<Sqlite>, user_id: &str, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Document>, sqlx::Error> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let documents = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE user_id = $1 ORDER BY modified_time DESC LIMIT $2 OFFSET $3"
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(documents)
}

/// 문서 ID로 조회
pub async fn get_document_by_id(pool: &Pool<Sqlite>, document_id: &str) -> Result<Option<Document>, sqlx::Error> {
    let document = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE id = $1"
    )
    .bind(document_id)
    .fetch_optional(pool)
    .await?;

    Ok(document)
}

/// Google 문서 ID로 조회
pub async fn get_document_by_google_id(pool: &Pool<Sqlite>, google_doc_id: &str) -> Result<Option<Document>, sqlx::Error> {
    let document = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE google_doc_id = $1"
    )
    .bind(google_doc_id)
    .fetch_optional(pool)
    .await?;

    Ok(document)
}

/// 특정 사용자의 문서들 조회
pub async fn get_documents_by_user(pool: &Pool<Sqlite>, user_id: &str) -> Result<Vec<Document>, sqlx::Error> {
    let documents = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE user_id = $1 ORDER BY modified_time DESC"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(documents)
}

/// 문서 동기화 - 새로운 문서 목록과 기존 문서를 비교하여 업데이트
pub async fn sync_documents(pool: &Pool<Sqlite>, user_id: &str, fresh_docs: Vec<Document>) -> Result<Vec<Document>, sqlx::Error> {
    // 트랜잭션 시작
    let mut tx = pool.begin().await?;
    let now = Utc::now();

    for doc in &fresh_docs {
        // 기존 문서가 있는지 확인
        let existing = sqlx::query_as::<_, (String, chrono::NaiveDateTime)>(
            "SELECT id, modified_time FROM documents WHERE google_doc_id = ? AND user_id = ?"
        )
        .bind(&doc.google_doc_id)
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?;

        if let Some((existing_id, existing_modified_time)) = existing {
            // 웹의 문서가 더 최신인 경우만 업데이트
            let existing_modified: DateTime<Utc> = DateTime::from_naive_utc_and_offset(existing_modified_time, Utc);
            if doc.modified_time > existing_modified {
                sqlx::query(
                    r#"
                    UPDATE documents 
                    SET title = ?, content = ?, word_count = ?, 
                        modified_time = ?, last_synced_at = ?, updated_at = ?
                    WHERE id = ?
                    "#
                )
                .bind(&doc.title)
                .bind(&doc.content)
                .bind(doc.word_count)
                .bind(&doc.modified_time)
                .bind(&now)
                .bind(&now)
                .bind(&existing_id)
                .execute(&mut *tx)
                .await?;
            }
        } else {
            // 새 문서 추가
            let new_id = Uuid::new_v4().to_string();
            
            sqlx::query(
                r#"
                INSERT INTO documents (
                    id, google_doc_id, user_id, title, content, word_count,
                    created_time, modified_time, last_synced_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#
            )
            .bind(&new_id)
            .bind(&doc.google_doc_id)
            .bind(user_id)
            .bind(&doc.title)
            .bind(&doc.content)
            .bind(doc.word_count)
            .bind(&doc.created_time)
            .bind(&doc.modified_time)
            .bind(&now)
            .bind(&now)
            .bind(&now)
            .execute(&mut *tx)
            .await?;
        }
    }

    // 트랜잭션 커밋
    tx.commit().await?;

    // 동기화된 문서 목록 반환
    get_documents_by_user(pool, user_id).await
}

/// 유효하지 않은 문서들 정리 (Google Docs에서 삭제된 문서 등)
pub async fn cleanup_invalid_documents(pool: &Pool<Sqlite>) -> Result<u64, sqlx::Error> {
    // UUID 패턴과 일치하는 google_doc_id를 가진 문서들 삭제
    // Google Docs ID는 일반적으로 44자의 영숫자와 하이픈/언더스코어 조합
    let result = sqlx::query(
        r#"
        DELETE FROM documents 
        WHERE google_doc_id LIKE '%-%-%-%--%' 
        AND LENGTH(google_doc_id) = 36
        "#
    )
    .execute(pool)
    .await?;

    println!("Cleaned up {} invalid document records", result.rows_affected());
    Ok(result.rows_affected())
}

/// Google Doc ID로 문서 제거
pub async fn remove_document_by_google_id(pool: &Pool<Sqlite>, google_doc_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "DELETE FROM documents WHERE google_doc_id = ?"
    )
    .bind(google_doc_id)
    .execute(pool)
    .await?;

    println!("Removed document with Google ID: {}", google_doc_id);
    Ok(())
}

/// 키워드로 사용자의 문서 검색 (제목만)
pub async fn get_user_documents_by_keyword(pool: &Pool<Sqlite>, user_id: &str, keyword: &str, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Document>, sqlx::Error> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);
    let like_pattern = format!("%{}%", keyword);
    let documents = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE user_id = $1 AND title LIKE $2 ORDER BY modified_time DESC LIMIT $3 OFFSET $4"
    )
    .bind(user_id)
    .bind(&like_pattern)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(documents)
}


