pub mod pool;
pub mod task;

use napi_derive::napi;
use serde_json::json;

#[napi]
pub fn initialize_worker_pool(thread_count: u32) -> napi::Result<bool> {
    pool::initialize_worker_pool(thread_count)
        .map_err(|e| napi::Error::from_reason(format!("Failed to initialize worker pool: {}", e)))
}

#[napi]
pub fn shutdown_worker_pool() -> napi::Result<bool> {
    pool::shutdown_worker_pool()
        .map_err(|e| napi::Error::from_reason(format!("Failed to shutdown worker pool: {}", e)))
}

#[napi(js_name = "submit_task")]
pub fn submit_task_sync(task_type: String, _data: String) -> napi::Result<String> {
    let result = json!({
        "success": true,
        "task_type": task_type,
        "execution_time_ms": 0,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        "results": json!({"message": "Task processed synchronously (placeholder)"}),
        "error": null
    });
    
    let json_string = serde_json::to_string(&result)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize task result: {}", e)))?;
    
    Ok(json_string)
}

#[napi]
pub fn get_worker_pool_stats() -> napi::Result<String> {
    let stats = pool::get_worker_pool_stats()
        .map_err(|e| napi::Error::from_reason(format!("Failed to get worker pool stats: {}", e)))?;
    
    let json_string = serde_json::to_string(&stats)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize worker pool stats: {}", e)))?;
    
    Ok(json_string)
}
