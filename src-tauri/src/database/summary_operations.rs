use sqlx::{Pool, Sqlite};
use crate::database::models::*;
use chrono::Utc;
use uuid::Uuid;

/// 문서 요약 생성 또는 업데이트
pub async fn upsert_document_summary(pool: &Pool<Sqlite>, summary: &CreateSummaryRequest) -> Result<DocumentSummary, sqlx::Error> {
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
    .fetch_one(pool)
    .await?;

    Ok(document_summary)
}

/// 문서 요약 조회
pub async fn get_document_summary(pool: &Pool<Sqlite>, document_id: &str) -> Result<Option<DocumentSummary>, sqlx::Error> {
    let summary = sqlx::query_as::<_, DocumentSummary>(
        "SELECT * FROM document_summaries WHERE document_id = $1"
    )
    .bind(document_id)
    .fetch_optional(pool)
    .await?;

    Ok(summary)
}
