use tauri::State;
use crate::{AppState, database};

#[tauri::command]
pub async fn switch_account(state: State<'_, AppState>, user_id: String) -> Result<serde_json::Value, String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let oauth = {
        let oauth_guard = state.google_oauth.lock().unwrap();
        oauth_guard.clone()
    };
    let mut switched_user = db.switch_to_account(&user_id).await
        .map_err(|e| e.to_string())?;
    *state.current_user.lock().unwrap() = Some(switched_user.clone());
    println!("Successfully switched to account: {} ({})", switched_user.email, switched_user.id);
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

#[tauri::command]
pub async fn get_saved_accounts(state: State<'_, AppState>) -> Result<Vec<database::UserProfile>, String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let accounts = db.get_all_saved_accounts().await
        .map_err(|e| e.to_string())?;
    println!("Retrieved {} saved accounts", accounts.len());
    Ok(accounts)
}

#[tauri::command]
pub async fn remove_account(state: State<'_, AppState>, account_id: String) -> Result<(), String> {
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let current_user = state.current_user.lock().unwrap().clone();
    if let Some(user) = current_user {
        if user.id == account_id {
            *state.current_user.lock().unwrap() = None;
        }
    }
    db.remove_account(&account_id).await
        .map_err(|e| e.to_string())?;
    println!("Successfully removed account: {}", account_id);
    Ok(())
}
