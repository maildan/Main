use tauri::State;
use crate::{AppState, database};

#[tauri::command]
pub async fn google_login_with_webview(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<database::User, String> {
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let auth_code = oauth.login_with_webview(&app).await
        .map_err(|e| e.to_string())?;
    let user = oauth.authenticate_user(&auth_code, &db).await
        .map_err(|e| e.to_string())?;
    *state.current_user.lock().unwrap() = Some(user.clone());
    println!("User authenticated via webview: {}", user.email);
    Ok(user)
}

#[tauri::command]
pub async fn check_auth_status(state: State<'_, AppState>) -> Result<Option<database::User>, String> {
    let current_user = state.current_user.lock().unwrap().clone();
    if let Some(mut user) = current_user {
        let db = state.db.lock().unwrap().as_ref().unwrap().clone();
        let oauth = state.google_oauth.lock().unwrap().clone();
        if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
            println!("check_auth_status: 토큰 유효성 검사 실패: {}", e);
            return Ok(None);
        }
        return Ok(Some(user));
    }
    Ok(None)
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    *state.current_user.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn refresh_auth_token(state: State<'_, AppState>) -> Result<(), String> {
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
    let mut user = user;
    match oauth.ensure_valid_token(&mut user, &db).await {
        Ok(_) => {
            *state.current_user.lock().unwrap() = Some(user);
            Ok(())
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("토큰 갱신 실패: {}", e))
        }
    }
}

#[tauri::command]
pub async fn cancel_oauth_login(_state: State<'_, AppState>) -> Result<(), String> {
    crate::google::GoogleOAuth::cancel_oauth_login();
    Ok(())
}

#[tauri::command]
pub async fn start_google_auth(app: tauri::AppHandle, state: tauri::State<'_, crate::AppState>) -> Result<String, String> {
    let auth_url = {
        let oauth = state.google_oauth.lock().unwrap();
        oauth.get_auth_url().map_err(|e| e.to_string())?
    };
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(&auth_url, None::<&str>).map_err(|e| format!("브라우저 열기 실패: {}", e))?;
    Ok(auth_url)
}

#[tauri::command]
pub async fn authenticate_google_user(code: String, state: tauri::State<'_, crate::AppState>) -> Result<crate::database::User, String> {
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    match oauth.authenticate_user(&code, &db).await {
        Ok(user) => {
            *state.current_user.lock().unwrap() = Some(user.clone());
            Ok(user)
        }
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn auto_sync_documents(state: tauri::State<'_, crate::AppState>) -> Result<Vec<crate::database::Document>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    let current_user = crate::database::user_operations::get_current_user(db.get_pool()).await
        .map_err(|e| format!("현재 사용자 조회 실패: {}", e))?
        .ok_or_else(|| "현재 로그인된 사용자가 없습니다".to_string())?;
    let access_token = current_user.access_token.clone().unwrap_or_default();
    let google_docs = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };
    println!("Starting auto sync for current user: {}", current_user.email);
    let google_docs_list = google_docs.fetch_documents(&access_token).await
        .map_err(|e| e.to_string())?;
    let mut synced_documents = Vec::new();
    for google_file in google_docs_list {
        let (text_content, has_content) = {
            let fetch_result = google_docs.fetch_document_content(&access_token, &google_file.id).await;
            match fetch_result {
                Ok(content) => {
                    let text = google_docs.extract_text_from_content(&content);
                    (text, true)
                }
                Err(e) => {
                    eprintln!("Failed to fetch content for document {}: {}", google_file.name, e.to_string());
                    (String::new(), false)
                }
            }
        };
        let created_time = chrono::DateTime::parse_from_rfc3339(&google_file.created_time)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        let modified_time = chrono::DateTime::parse_from_rfc3339(&google_file.modified_time)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        let doc_request = crate::database::CreateDocumentRequest {
            google_doc_id: google_file.id.clone(),
            user_id: current_user.id.clone(),
            title: google_file.name.clone(),
            content: if has_content { Some(text_content.clone()) } else { None },
            word_count: Some(if has_content { text_content.split_whitespace().count() as i32 } else { 0 }),
            created_time,
            modified_time,
        };
        match db.upsert_document(&doc_request).await {
            Ok(document) => {
                println!("Synced document: {}", document.title);
                synced_documents.push(document);
            }
            Err(e) => {
                eprintln!("Failed to save document {}: {}", google_file.name, e);
            }
        }
    }
    println!("Auto sync completed. Synced {} new/updated documents", synced_documents.len());
    let all_user_documents = db.get_documents_by_user(&current_user.id).await
        .map_err(|e| format!("사용자 문서 조회 실패: {}", e))?;
    println!("Returning {} total documents for user: {}", all_user_documents.len(), current_user.email);
    Ok(all_user_documents)
}
