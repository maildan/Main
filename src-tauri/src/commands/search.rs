use tauri::State;
use crate::{AppState, database};

#[tauri::command]
pub async fn search_user_documents_by_keyword(state: State<'_, AppState>, keyword: String, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<database::Document>, String> {
    let user_id = match state.current_user.lock().unwrap().as_ref() {
        Some(user) => user.id.clone(),
        None => return Err("로그인된 사용자가 없습니다.".to_string()),
    };
    let db = state.db.lock().unwrap().as_ref().unwrap().clone();
    let docs = database::document_operations::get_user_documents_by_keyword(db.get_pool(), &user_id, &keyword, limit, offset)
        .await
        .map_err(|e| e.to_string())?;
    use std::collections::HashSet;
    let mut seen = HashSet::new();
    let mut unique_docs = Vec::new();
    for doc in docs {
        if seen.insert(doc.title.clone()) {
            unique_docs.push(doc);
        }
    }
    Ok(unique_docs)
}
