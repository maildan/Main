use std::sync::Mutex;
use tauri::State;
use chrono::{DateTime, Utc};

mod database;
mod google;
mod config;

use database::Database;
use google::{GoogleOAuth, GoogleDocsAPI};

/// 앱 상태 관리를 위한 구조체
pub struct AppState {
    pub db: Mutex<Option<Database>>,
    pub google_oauth: Mutex<GoogleOAuth>,
    pub google_docs: Mutex<GoogleDocsAPI>,
    pub current_user: Mutex<Option<database::User>>,
}

impl AppState {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        // 환경변수 로드
        config::load_env()?;
        
        let db = Database::new().await?;
        let google_oauth = GoogleOAuth::new()?;
        let google_docs = GoogleDocsAPI::new();

        // DB에서 current_user 복구
        let current_user = db.get_current_user().await.ok().flatten();

        Ok(Self {
            db: Mutex::new(Some(db)),
            google_oauth: Mutex::new(google_oauth),
            google_docs: Mutex::new(google_docs),
            current_user: Mutex::new(current_user),
        })
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Google OAuth 인증 URL 생성 및 브라우저에서 열기
#[tauri::command]
async fn start_google_auth(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let auth_url = {
        let oauth = state.google_oauth.lock().unwrap();
        oauth.get_auth_url().map_err(|e| e.to_string())?
    };
    
    // 브라우저에서 OAuth URL 열기
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(&auth_url, None::<&str>).map_err(|e| format!("브라우저 열기 실패: {}", e))?;
    
    Ok(auth_url)
}

/// Google OAuth 코드로 사용자 인증
#[tauri::command]
async fn authenticate_google_user(code: String, state: State<'_, AppState>) -> Result<database::User, String> {
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
            // 현재 사용자 정보 저장
            *state.current_user.lock().unwrap() = Some(user.clone());
            Ok(user)
        }
        Err(e) => Err(e.to_string())
    }
}

/// 현재 인증 상태 확인
#[tauri::command]
async fn check_auth_status(state: State<'_, AppState>) -> Result<Option<database::User>, String> {
    let current_user = state.current_user.lock().unwrap().clone();
    if let Some(mut user) = current_user {
        let db = state.db.lock().unwrap().as_ref().unwrap().clone();
        let oauth = state.google_oauth.lock().unwrap().clone();
        // 토큰 유효성 검사 및 갱신 시도
        if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
            println!("check_auth_status: 토큰 유효성 검사 실패: {}", e);
            // 토큰이 만료/실패하면 인증된 사용자로 간주하지 않음
            return Ok(None);
        }
        // 토큰이 유효하면 최신 사용자 정보 반환
        return Ok(Some(user));
    }
    Ok(None)
}

/// 로그아웃
#[tauri::command]
async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    *state.current_user.lock().unwrap() = None;
    Ok(())
}

/// Google Docs 문서 목록 가져오기
#[tauri::command]
async fn fetch_google_docs(state: State<'_, AppState>) -> Result<Vec<database::Document>, String> {
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

    // 토큰 유효성 검사 및 갱신
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }

    // 액세스 토큰 확인
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;

    // 문서 동기화
    match docs_api.sync_documents(access_token, &user.id, &db).await {
        Ok(documents) => {
            // 사용자 정보 다시 저장
            *state.current_user.lock().unwrap() = Some(user);
            Ok(documents)
        }
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            Err(format!("문서 목록 조회 실패: {}", e))
        }
    }
}

/// 특정 문서 내용 가져오기
#[tauri::command]
async fn fetch_document_content(document_id: String, state: State<'_, AppState>) -> Result<String, String> {
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

    // 토큰 유효성 검사 및 갱신
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }

    // 액세스 토큰 확인
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;

    // 문서 내용 동기화
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

/// 문서에 텍스트 삽입
#[tauri::command]
async fn insert_text_to_document(
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

    // 토큰 유효성 검사 및 갱신
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }

    // 액세스 토큰 확인
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;

    // 편집 기록 저장
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

    // 실제 문서에 텍스트 삽입
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

/// AI 요약 생성
#[tauri::command]
async fn generate_summary(document_id: String, state: State<'_, AppState>) -> Result<String, String> {
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

    // 토큰 유효성 검사 및 갱신
    if let Err(e) = oauth.ensure_valid_token(&mut user, &db).await {
        *state.current_user.lock().unwrap() = Some(user);
        return Err(format!("토큰 갱신 실패: {}", e));
    }

    // 액세스 토큰 확인
    let access_token = user.access_token.as_ref()
        .ok_or_else(|| "액세스 토큰이 없습니다".to_string())?;

    // 1. 문서 내용 가져오기
    let doc_text = match docs_api.sync_document_content(access_token, &document_id, &db).await {
        Ok(text) => text,
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            return Err(format!("문서 내용 조회 실패: {}", e));
        }
    };

    // 2. 요약 생성
    let (summary_text, keywords) = match docs_api.generate_summary(&doc_text) {
        Ok(result) => result,
        Err(e) => {
            *state.current_user.lock().unwrap() = Some(user);
            return Err(format!("요약 생성 실패: {}", e));
        }
    };
    
    // 3. 요약 요청 생성
    let summary_request = database::CreateSummaryRequest {
        document_id: document_id.clone(),
        user_id: user.id.clone(),
        summary_text: summary_text.clone(),
        keywords: Some(keywords.join(",")),
    };
    
    // 4. 요약을 데이터베이스에 저장
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

/// 토큰 갱신
#[tauri::command]
async fn refresh_auth_token(state: State<'_, AppState>) -> Result<(), String> {
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

/// 계정 제거 (사용자와 관련된 모든 데이터 삭제)
#[tauri::command]
async fn remove_account(state: State<'_, AppState>, account_id: String) -> Result<(), String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    
    // 현재 사용자와 동일한 계정인지 확인
    let current_user = state.current_user.lock().unwrap().clone();
    if let Some(user) = current_user {
        if user.id == account_id {
            // 현재 사용자를 None으로 설정
            *state.current_user.lock().unwrap() = None;
        }
    }
    
    // 데이터베이스에서 계정과 모든 관련 데이터 제거
    db.remove_account(&account_id).await
        .map_err(|e| e.to_string())?;
    
    println!("Successfully removed account: {}", account_id);
    Ok(())
}

/// 계정 전환
#[tauri::command]
async fn switch_account(state: State<'_, AppState>, user_id: String) -> Result<serde_json::Value, String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    // 데이터베이스에서 계정 전환
    let mut switched_user = db.switch_to_account(&user_id).await
        .map_err(|e| e.to_string())?;
    // 앱 상태의 현재 사용자 업데이트
    *state.current_user.lock().unwrap() = Some(switched_user.clone());
    println!("Successfully switched to account: {} ({})", switched_user.email, switched_user.id);
    // 토큰 유효성 검사
    let mut need_reauth = false;
    if let Err(e) = oauth.ensure_valid_token(&mut switched_user, &db).await {
        println!("Token validation/refresh failed: {}", e);
        need_reauth = true;
    }
    Ok(serde_json::json!({
        "user": switched_user,
        "needReauth": need_reauth
    }))
}

/// 저장된 모든 계정 조회
#[tauri::command]
async fn get_saved_accounts(state: State<'_, AppState>) -> Result<Vec<database::UserProfile>, String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    
    let accounts = db.get_all_saved_accounts().await
        .map_err(|e| e.to_string())?;
    
    println!("Retrieved {} saved accounts", accounts.len());
    Ok(accounts)
}

/// URL을 기본 브라우저에서 열기
#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    use std::process::Command;
    
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .output()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&url)
            .output()
    } else {
        Command::new("xdg-open")
            .arg(&url)
            .output()
    };

    match result {
        Ok(_) => {
            println!("Opened URL in browser: {}", url);
            Ok(())
        }
        Err(e) => Err(format!("Failed to open URL: {}", e))
    }
}

/// Google OAuth 웹뷰 로그인 (자동화된 로그인)
#[tauri::command]
async fn google_login_with_webview(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<database::User, String> {
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };
    
    // 웹뷰를 사용한 자동화된 로그인
    let auth_code = oauth.login_with_webview(&app).await
        .map_err(|e| e.to_string())?;
    
    // 인증 코드로 사용자 인증
    let user = oauth.authenticate_user(&auth_code, &db).await
        .map_err(|e| e.to_string())?;
    
    // 현재 사용자 정보 저장
    *state.current_user.lock().unwrap() = Some(user.clone());
    
    println!("User authenticated via webview: {}", user.email);
    Ok(user)
}

/// 자동 문서 동기화 (문서 목록 + 내용 모두 동기화)
#[tauri::command]
async fn auto_sync_documents(state: State<'_, AppState>) -> Result<Vec<database::Document>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().unwrap().clone()
    };

    // 현재 사용자 가져오기 (is_current = true)
    let current_user = database::user_operations::get_current_user(db.get_pool()).await
        .map_err(|e| format!("현재 사용자 조회 실패: {}", e))?
        .ok_or_else(|| "현재 로그인된 사용자가 없습니다".to_string())?;

    // access_token을 미리 추출
    let access_token = current_user.access_token.clone().unwrap_or_default();

    let google_docs = {
        let docs_guard = state.google_docs.lock().unwrap();
        docs_guard.clone()
    };

    println!("Starting auto sync for current user: {}", current_user.email);

    // 1. 구글 드라이브에서 문서 목록 가져오기
    let google_docs_list = google_docs.fetch_documents(&access_token).await
        .map_err(|e| e.to_string())?;

    let mut synced_documents = Vec::new();

    // 2. 각 문서의 내용도 가져와서 DB에 저장
    for google_file in google_docs_list {
        let (text_content, has_content) = {
            let fetch_result = google_docs.fetch_document_content(&access_token, &google_file.id).await;
            match fetch_result {
                Ok(content) => {
                    // GoogleDocsContent에서 실제 텍스트 추출
                    let text = google_docs.extract_text_from_content(&content);
                    (text, true)
                }
                Err(e) => {
                    eprintln!("Failed to fetch content for document {}: {}", google_file.name, e.to_string());
                    (String::new(), false)
                }
            }
        };

        // 날짜 문자열을 DateTime으로 파싱
        let created_time = DateTime::parse_from_rfc3339(&google_file.created_time)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());
        let modified_time = DateTime::parse_from_rfc3339(&google_file.modified_time)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let doc_request = database::CreateDocumentRequest {
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
    
    // 현재 사용자의 모든 문서 반환 (새로 동기화된 것 + 기존 것)
    let all_user_documents = db.get_documents_by_user(&current_user.id).await
        .map_err(|e| format!("사용자 문서 조회 실패: {}", e))?;
    
    println!("Returning {} total documents for user: {}", all_user_documents.len(), current_user.email);
    Ok(all_user_documents)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let app_state = AppState::new().await.expect("앱 상태 초기화 실패");
          tauri::Builder::default()
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init())
            .manage(app_state)            .invoke_handler(tauri::generate_handler![
                greet,
                start_google_auth,
                authenticate_google_user,
                check_auth_status,
                logout,
                fetch_google_docs,
                fetch_document_content,
                insert_text_to_document,
                generate_summary,
                refresh_auth_token,
                switch_account,
                remove_account,
                get_saved_accounts,
                open_url,
                google_login_with_webview,
                auto_sync_documents,
                cancel_oauth_login,
                search_user_documents_by_keyword
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}

#[tauri::command]
async fn cancel_oauth_login(_state: State<'_, AppState>) -> Result<(), String> {
    GoogleOAuth::cancel_oauth_login();
    Ok(())
}

#[tauri::command]
async fn search_user_documents_by_keyword(state: State<'_, AppState>, keyword: String, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<database::Document>, String> {
    let user_id = match state.current_user.lock().unwrap().as_ref() {
        Some(user) => user.id.clone(),
        None => return Err("로그인된 사용자가 없습니다.".to_string()),
    };
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let docs = database::document_operations::get_user_documents_by_keyword(db.get_pool(), &user_id, &keyword, limit, offset)
        .await
        .map_err(|e| e.to_string())?;
    Ok(docs)
}
