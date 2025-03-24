#![allow(clippy::needless_return)]
#![allow(clippy::too_many_arguments)]

pub mod memory;
pub mod gpu;
pub mod worker;
pub mod utils;

use napi_derive::napi;
use std::sync::atomic::{AtomicBool, Ordering};

// 초기화 상태 추적
static INITIALIZED: AtomicBool = AtomicBool::new(false);

/// 네이티브 모듈 버전 정보 반환
#[napi]
pub fn get_native_module_version() -> String {
    format!("typing_stats_native v{}", env!("CARGO_PKG_VERSION"))
}

/// 네이티브 모듈 초기화
#[napi]
pub fn initialize_native_modules() -> bool {
    // 이미 초기화된 경우
    if INITIALIZED.load(Ordering::SeqCst) {
        println!("Native modules already initialized");
        return true;
    }
    
    println!("Initializing native modules...");
    
    // 로깅 초기화
    match env_logger::try_init() {
        Ok(_) => println!("Logger initialized"),
        Err(e) => println!("Logger initialization failed: {}", e),
    }
    
    // 각 모듈 초기화
    let mut success = true;
    
    // GPU 모듈 초기화
    match gpu::initialize_gpu_module() {
        Ok(true) => println!("GPU module initialized successfully"),
        Ok(false) => {
            println!("GPU module initialization failed or GPU not available");
            // GPU는 선택적이므로 실패해도 계속 진행
        },
        Err(e) => {
            println!("GPU module error: {}", e);
            // GPU는 선택적이므로 실패해도 계속 진행
        }
    }
    
    // 메모리 풀 초기화
    match memory::initialize_memory_pools() {
        Ok(_) => println!("Memory pools initialized"),
        Err(e) => {
            println!("Memory pool initialization failed: {}", e);
            success = false;
        }
    }
    
    // 워커 풀 초기화 (자동 CPU 코어 수 사용)
    match worker::initialize_worker_pool(0) {
        Ok(true) => println!("Worker pool initialized"),
        Ok(false) => {
            println!("Worker pool initialization failed");
            success = false;
        },
        Err(e) => {
            println!("Worker pool error: {}", e);
            success = false;
        }
    }
    
    // 초기화 완료 표시
    INITIALIZED.store(success, Ordering::SeqCst);
    
    success
}

/// 네이티브 모듈 정리
#[napi]
pub fn cleanup_native_modules() -> bool {
    println!("Cleaning up native modules...");
    
    let mut success = true;
    
    // 워커 풀 종료
    match worker::shutdown_worker_pool() {
        Ok(_) => println!("Worker pool shut down"),
        Err(e) => {
            println!("Worker pool shutdown failed: {}", e);
            success = false;
        }
    }
    
    // 메모리 풀 정리
    match memory::cleanup_memory_pools() {
        Ok(_) => println!("Memory pools cleaned up"),
        Err(e) => {
            println!("Memory pool cleanup failed: {}", e);
            success = false;
        }
    }
    
    // 초기화 상태 재설정
    INITIALIZED.store(false, Ordering::SeqCst);
    
    success
}

/// 네이티브 모듈 정보 반환
#[napi]
pub fn get_native_module_info() -> String {
    let gpu_available = gpu::is_gpu_acceleration_available();
    
    let info = serde_json::json!({
        "name": "typing-stats-native",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "Rust native module for Typing Stats App",
        "features": {
            "memory_optimization": true,
            "gpu_acceleration": gpu_available,
            "worker_threads": true
        },
        "system": {
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "cpu_cores": num_cpus::get(),
            "rust_version": rustc_version_runtime::version().to_string()
        }
    });
    
    serde_json::to_string(&info).unwrap_or_else(|_| String::from("{\"error\":\"Failed to serialize module info\"}"))
}
