use tauri::State;
use crate::{AppState, database};

#[tauri::command]
pub async fn fetch_google_docs(state: State<'_, AppState>) -> Result<Vec<database::Document>, String> {
    let user = {
        let mut current_user_guard = state.current_user.lock().unwrap();
        match current_user_guard.take() {
            Some(user) => user,
            None => return Err("인증되지 않은 사용자입니다".to_string()),
        }
    };
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let docs_api = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };
    let mut user = user;
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;
    match docs_api.sync_documents(access_token, &user.id, &db).await {
        Ok(documents) => {
            *state.current_user.lock().unwrap() = Some(user);
            Ok(documents)
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("문서 목록 조회 실패: {}", e))
        }
    }
}

#[tauri::command]
pub async fn fetch_document_content(document_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let user = {
        let mut current_user_guard = state.current_user.lock().unwrap();
        match current_user_guard.take() {
            Some(user) => user,
            None => return Err("인증되지 않은 사용자입니다".to_string()),
        }
    };
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let docs_api = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };
    let mut user = user;
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;
    match docs_api.sync_document_content(access_token, &document_id, &db).await {
        Ok(content) => {
            *state.current_user.lock().unwrap() = Some(user);
            Ok(content)
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("문서 내용 조회 실패: {}", e))
        }
    }
}

#[tauri::command]
pub async fn insert_text_to_document(
    document_id: String,
    text: String,
    position: Option<i32>,
    state: State<'_, AppState>
) -> Result<(), String> {
    let user = {
        let mut current_user_guard = state.current_user.lock().unwrap();
        match current_user_guard.take() {
            Some(user) => user,
            None => return Err("인증되지 않은 사용자입니다".to_string()),
        }
    };
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let docs_api = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };
    let mut user = user;
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;
    let edit_request = database::CreateEditHistoryRequest {
        document_id: document_id.clone(),
        user_id: user.id.clone(),
        action_type: "insert".to_string(),
        content_before: None,
        content_after: Some(text.clone()),
        metadata: position.map(|p| format!("{{\"position\": {}}}", p)),
    };
    if let Err(e) = db.add_edit_history(&edit_request).await {
        eprintln!("편집 기록 저장 실패: {}", e);
    }
    match docs_api.insert_text(access_token, &document_id, &text, position).await {
        Ok(_) => {
            *state.current_user.lock().unwrap() = Some(user);
            Ok(())
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("텍스트 삽입 실패: {}", e))
        }
    }
}

#[tauri::command]
pub async fn generate_summary(document_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let user = {
        let current_user_guard = state.current_user.lock().unwrap();
        match current_user_guard.as_ref() {
            Some(user) => user.clone(),
            None => return Err("인증되지 않은 사용자입니다".to_string()),
        }
    };
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let docs_api = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };
    let mut user = user;
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;
    let doc_text = match docs_api.sync_document_content(access_token, &document_id, &db).await {
        Ok(text) => text,
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            return Err(format!("문서 내용 조회 실패: {}", e));
        }
    };
    let (summary_text, keywords) = match docs_api.generate_summary(&doc_text) {
        Ok(result) => result,
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            return Err(format!("요약 생성 실패: {}", e));
        }
    };
    let summary_request = database::CreateSummaryRequest {
        document_id: document_id.clone(),
        user_id: user.id.clone(),
        summary_text: summary_text.clone(),
        keywords: Some(keywords.join(",")),
    };
    match db.upsert_document_summary(&summary_request).await {
        Ok(_) => {
            *state.current_user.lock().unwrap() = Some(user);
            Ok(summary_text)
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("요약 저장 실패: {}", e))
        }
    }
}
