use sqlx::{Pool, Sqlite};
use crate::database::models::*;
use chrono::{Utc, DateTime};
use uuid::Uuid;

/// 사용자 정보 생성 또는 업데이트
pub async fn upsert_user(pool: &Pool<Sqlite>, user: &CreateUserRequest) -> Result<User, sqlx::Error> {
    let user_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let mut tx = pool.begin().await?;

    // 기존 모든 사용자의 is_current를 false로 설정
    sqlx::query("UPDATE users SET is_current = false")
        .execute(&mut *tx)
        .await?;

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, google_id, email, name, picture_url, access_token, refresh_token, token_expires_at, is_current, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT(google_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            picture_url = EXCLUDED.picture_url,
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            is_current = EXCLUDED.is_current,
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
    .bind(true) // 새로 생성되는 사용자를 현재 사용자로 설정
    .bind(&now)
    .bind(&now)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(user)
}

/// 사용자 토큰 업데이트
pub async fn update_user_tokens(pool: &Pool<Sqlite>, user_id: &str, request: &UpdateTokenRequest) -> Result<(), sqlx::Error> {
    let now = Utc::now();
    
    sqlx::query(
        "UPDATE users SET access_token = $1, refresh_token = COALESCE($2, refresh_token), token_expires_at = $3, updated_at = $4 WHERE id = $5"
    )
    .bind(&request.access_token)
    .bind(request.refresh_token.as_deref())
    .bind(request.token_expires_at)
    .bind(now)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Google ID로 사용자 조회
pub async fn get_user_by_google_id(pool: &Pool<Sqlite>, google_id: &str) -> Result<Option<User>, sqlx::Error> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE google_id = $1"
    )
    .bind(google_id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// 사용자 ID로 조회
pub async fn get_user_by_id(pool: &Pool<Sqlite>, user_id: &str) -> Result<Option<User>, sqlx::Error> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// 사용자 토큰 정보 삭제 (스마트 로그아웃)
pub async fn clear_user_tokens(pool: &Pool<Sqlite>, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE users SET access_token = NULL, refresh_token = NULL WHERE id = ?"
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// 모든 사용자 프로필 조회 (계정 전환용)
pub async fn get_all_user_profiles(pool: &Pool<Sqlite>) -> Result<Vec<UserProfile>, sqlx::Error> {
    #[derive(sqlx::FromRow)]
    struct UserProfileRow {
        id: String,
        google_id: String,
        email: String,
        name: String,
        picture_url: Option<String>,
        has_valid_token: i32,
        is_current: i32,
        created_at: chrono::NaiveDateTime,
        updated_at: chrono::NaiveDateTime,
    }

    let rows = sqlx::query_as::<_, UserProfileRow>(
        r#"
        SELECT 
            id,
            google_id,
            email,
            name,
            picture_url,
            CASE 
                WHEN access_token IS NOT NULL AND token_expires_at > datetime('now') 
                THEN 1 
                ELSE 0 
            END as has_valid_token,
            CASE WHEN is_current THEN 1 ELSE 0 END as is_current,
            created_at,
            updated_at
        FROM users 
        ORDER BY is_current DESC, updated_at DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    let profiles = rows.into_iter().map(|row| UserProfile {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        picture_url: row.picture_url,
        has_valid_token: row.has_valid_token != 0,
        is_current: row.is_current != 0,
        created_at: DateTime::from_naive_utc_and_offset(row.created_at, Utc),
        updated_at: DateTime::from_naive_utc_and_offset(row.updated_at, Utc),
    }).collect();

    Ok(profiles)
}

/// 계정 제거 (사용자와 관련된 모든 데이터 삭제)
pub async fn remove_account(pool: &Pool<Sqlite>, user_id: &str) -> Result<(), sqlx::Error> {
    // 트랜잭션 시작
    let mut tx = pool.begin().await?;

    // 1. 편집 기록 삭제
    sqlx::query(
        r#"DELETE FROM edit_history 
           WHERE document_id IN (
               SELECT id FROM documents WHERE user_id = ?
           )"#
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    // 2. 문서 요약 삭제
    sqlx::query(
        r#"DELETE FROM document_summaries 
           WHERE document_id IN (
               SELECT id FROM documents WHERE user_id = ?
           )"#
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    // 3. 문서 삭제
    sqlx::query(
        "DELETE FROM documents WHERE user_id = ?"
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    // 4. 사용자 삭제
    sqlx::query(
        "DELETE FROM users WHERE id = ?"
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    // 트랜잭션 커밋
    tx.commit().await?;

    println!("Successfully removed account and all related data for user: {}", user_id);
    Ok(())
}

/// 계정 전환 - 특정 사용자를 현재 사용자로 설정
pub async fn switch_to_account(pool: &Pool<Sqlite>, user_id: &str) -> Result<User, sqlx::Error> {
    let mut tx = pool.begin().await?;

    // 1. 모든 계정의 is_current를 false로 설정
    sqlx::query("UPDATE users SET is_current = false")
        .execute(&mut *tx)
        .await?;

    // 2. 선택된 계정을 current로 설정하고 정보 반환
    let user = sqlx::query_as::<_, User>(
        "UPDATE users SET is_current = true WHERE id = ? RETURNING *"
    )
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;

    // 트랜잭션 커밋
    tx.commit().await?;

    println!("Successfully switched to account: {} ({})", user.email, user.id);
    Ok(user)
}

/// 현재 활성 사용자 조회
pub async fn get_current_user(pool: &Pool<Sqlite>) -> Result<Option<User>, sqlx::Error> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE is_current = true LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// 저장된 모든 계정 조회 (토큰 정보 제외)
pub async fn get_all_saved_accounts(pool: &Pool<Sqlite>) -> Result<Vec<UserProfile>, sqlx::Error> {
    let accounts = sqlx::query_as::<_, UserProfile>(
        r#"
        SELECT 
            id, 
            google_id, 
            email, 
            name, 
            picture_url, 
            CASE 
                WHEN access_token IS NOT NULL AND token_expires_at > datetime('now') 
                THEN true 
                ELSE false 
            END as has_valid_token,
            is_current,
            created_at, 
            updated_at 
        FROM users 
        ORDER BY is_current DESC, updated_at DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    Ok(accounts)
}
