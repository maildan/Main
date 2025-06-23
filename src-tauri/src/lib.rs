use std::sync::Mutex;
use tauri::State;

mod database;
mod google;

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

/// Google OAuth 인증 URL 생성
#[tauri::command]
async fn get_google_auth_url(state: State<'_, AppState>) -> Result<String, String> {
    let oauth = state.google_oauth.lock().unwrap();
    oauth.get_auth_url().map_err(|e| e.to_string())
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

    // 문서 동기화
    match docs_api.sync_documents(&user.access_token, &db).await {
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

    // 문서 내용 동기화
    match docs_api.sync_document_content(&user.access_token, &document_id, &db).await {
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

    // 편집 기록 저장
    let edit_history = database::EditHistory {
        id: uuid::Uuid::new_v4().to_string(),
        document_id: document_id.clone(),
        action_type: "insert".to_string(),
        action_description: format!("텍스트 삽입: {} characters", text.len()),
        content_before: None,
        content_after: Some(text.clone()),
        position: position.map(|p| p.to_string()),
        created_at: chrono::Utc::now(),
    };

    if let Err(e) = db.create_edit_history(&edit_history).await {
        eprintln!("편집 기록 저장 실패: {}", e);
    }

    // 실제 문서에 텍스트 삽입
    match docs_api.insert_text(&user.access_token, &document_id, &text, position).await {
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

/// AI 요약 생성 (임시 구현)
#[tauri::command]
async fn generate_summary(document_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    
    // 실제 구현에서는 AI API를 호출하여 요약 생성
    let summary_text = "이것은 AI로 생성된 문서 요약입니다. 실제 구현에서는 문서 내용을 분석하여 의미있는 요약을 생성합니다.".to_string();
    
    // 요약을 데이터베이스에 저장
    match db.create_summary(&document_id, &summary_text, "ai_generated").await {
        Ok(_) => Ok(summary_text),
        Err(e) => Err(format!("요약 저장 실패: {}", e))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let app_state = AppState::new().await.expect("앱 상태 초기화 실패");
          tauri::Builder::default()
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init())
            .manage(app_state)
            .invoke_handler(tauri::generate_handler![
                greet,
                get_google_auth_url,
                authenticate_google_user,
                check_auth_status,
                logout,
                fetch_google_docs,
                fetch_document_content,
                insert_text_to_document,
                generate_summary,
                refresh_auth_token
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
