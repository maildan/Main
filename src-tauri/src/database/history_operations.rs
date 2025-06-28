use sqlx::{Pool, Sqlite};
use crate::database::models::*;
use chrono::Utc;
use uuid::Uuid;

/// 편집 기록 추가
pub async fn add_edit_history(pool: &Pool<Sqlite>, edit: &CreateEditHistoryRequest) -> Result<EditHistory, sqlx::Error> {
    let edit_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let edit_history = sqlx::query_as::<_, EditHistory>(
        r#"
        INSERT INTO edit_history (id, document_id, user_id, action_type, content_before, content_after, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    .fetch_one(pool)
    .await?;

    Ok(edit_history)
}

/// 문서의 편집 기록 조회
pub async fn get_edit_history(pool: &Pool<Sqlite>, document_id: &str, limit: i32) -> Result<Vec<EditHistory>, sqlx::Error> {
    let history = sqlx::query_as::<_, EditHistory>(
        "SELECT * FROM edit_history WHERE document_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .bind(document_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(history)
}
