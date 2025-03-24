#[macro_use]
extern crate napi_derive;

pub mod memory;
pub mod gpu;
pub mod worker;
pub mod utils;

use std::sync::atomic::AtomicBool;

// 초기화 상태 추적 - 미사용 경고 제거를 위한 속성 추가
#[allow(dead_code)]
static INITIALIZED: AtomicBool = AtomicBool::new(false);

// u64를 직접 반환하지 않고 String으로 변환하여 반환
#[napi]
pub fn get_timestamp() -> String {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    timestamp.to_string()
}

/// 네이티브 모듈 버전 정보 반환
#[napi]
pub fn get_native_module_version() -> String {
    format!("typing_stats_native v{}", env!("CARGO_PKG_VERSION"))
}

/// 네이티브 모듈 초기화
#[napi]
pub fn initialize_native_modules() -> bool {
    // 기본적인 초기화 작업
    // 필요한 경우 메모리, GPU, 워커 풀 초기화
    true
}

/// 네이티브 모듈 정리
#[napi]
pub fn cleanup_native_modules() -> bool {
    // 정리 작업 수행
    true
}

/// 네이티브 모듈 정보 반환
#[napi]
pub fn get_native_module_info() -> String {
    let info = serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "description": env!("CARGO_PKG_DESCRIPTION"),
        "features": {
            "memory_optimization": true,
            "gpu_acceleration": true,
            "worker_threads": true
        },
        "system": {
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "cpu_cores": num_cpus::get(),
            "rust_version": rustc_version_runtime::version().to_string()
        }
    });
    
    serde_json::to_string(&info).unwrap_or_default()
}
