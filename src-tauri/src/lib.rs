use std::sync::Mutex;

mod database;
mod google;
mod config;

mod commands {
    pub mod auth;
    pub mod docs;
    pub mod user;
    pub mod misc;
    pub mod search;
    pub use auth::*;
    pub use docs::*;
    pub use user::*;
    pub use misc::*;
    pub use search::*;
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::async_runtime::block_on(async {
        let app_state = AppState::new().await.expect("앱 상태 초기화 실패");
          tauri::Builder::default()
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init())
            .manage(app_state)            .invoke_handler(tauri::generate_handler![
                commands::greet,
                commands::start_google_auth,
                commands::authenticate_google_user,
                commands::check_auth_status,
                commands::logout,
                commands::fetch_google_docs,
                commands::fetch_document_content,
                commands::insert_text_to_document,
                commands::generate_summary,
                commands::refresh_auth_token,
                commands::switch_account,
                commands::remove_account,
                commands::get_saved_accounts,
                commands::open_url,
                commands::google_login_with_webview,
                commands::auto_sync_documents,
                commands::cancel_oauth_login,
                commands::search_user_documents_by_keyword
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    });
}
