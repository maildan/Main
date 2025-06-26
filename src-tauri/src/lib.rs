use std::sync::Mutex;
use tauri::State;

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
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // 환경변수 로드
        config::load_env()?;
        
        let db = Database::new().await?;
        let google_oauth = GoogleOAuth::new()?;
        let google_docs = GoogleDocsAPI::new();

        Ok(Self {
            db: Mutex::new(Some(db)),
            google_oauth: Mutex::new(google_oauth),
            google_docs: Mutex::new(google_docs),
            current_user: Mutex::new(None),
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
    Ok(current_user)
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
                remove_account
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
