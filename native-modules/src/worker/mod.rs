pub mod pool;
pub mod task;

// 내부 사용을 위한 pool 모듈 함수를 별칭으로 재정의
use pool::{
    initialize_worker_pool as pool_initialize_worker_pool,
    shutdown_worker_pool as pool_shutdown_worker_pool,
    get_worker_pool_stats as pool_get_worker_pool_stats,
    submit_task as pool_submit_task
};

use napi_derive::napi;

// napi 인터페이스 함수
#[napi]
pub fn initialize_worker_pool(thread_count: u32) -> napi::Result<bool> {
    pool_initialize_worker_pool(thread_count)
        .map_err(|e| napi::Error::from_reason(format!("Failed to initialize worker pool: {}", e)))
}

#[napi]
pub fn shutdown_worker_pool() -> napi::Result<bool> {
    pool_shutdown_worker_pool()
        .map_err(|e| napi::Error::from_reason(format!("Failed to shutdown worker pool: {}", e)))
}

#[napi(js_name = "submit_task")]
pub fn submit_task_sync(task_type: String, data: String) -> napi::Result<String> {
    pool_submit_task(task_type, data)
        .map_err(|e| napi::Error::from_reason(format!("Failed to submit task: {}", e)))
}

#[napi]
pub fn get_worker_pool_stats() -> napi::Result<String> {
    let stats = pool_get_worker_pool_stats()
        .map_err(|e| napi::Error::from_reason(format!("Failed to get worker pool stats: {}", e)))?;
    
    let json_string = serde_json::to_string(&stats)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize worker pool stats: {}", e)))?;
    
    Ok(json_string)
}
