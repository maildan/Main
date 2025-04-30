//! 메모리 관련 FFI 인터페이스
//!
//! Rust 메모리 관리 기능을 JavaScript/TypeScript에 노출합니다.

use napi::{Error, Result, JsUnknown};
use napi_derive::napi;
use serde_json::{json, Value};
use log::{debug, info, warn, error};
use crate::memory::{analyzer, optimizer, gc, settings};
use crate::memory::types::{OptimizationLevel, MemoryInfo};
use crate::ffi::{JsonResponse, parse_optimization_level, memory_info_to_json, optimization_result_to_json};
use std::sync::atomic::{AtomicU64, Ordering};

static LAST_MEMORY_INFO_REQUEST: AtomicU64 = AtomicU64::new(0);

/// 프로세스 메모리 정보 가져오기
#[napi]
pub fn get_process_memory_info_json() -> String {
    debug!("프로세스 메모리 정보 요청");
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_MEMORY_INFO_REQUEST.store(now, Ordering::SeqCst);
    
    match analyzer::get_process_memory_info() {
        Ok(memory_info) => {
            JsonResponse::success(memory_info_to_json(&memory_info))
        },
        Err(e) => {
            error!("메모리 정보 가져오기 실패: {}", e);
            JsonResponse::error(&format!("메모리 정보 가져오기 실패: {}", e))
        }
    }
}

/// 메모리 최적화 수행
#[napi]
pub fn optimize_memory_json(level_num: i32, emergency: bool) -> String {
    info!("메모리 최적화 요청: 레벨 {}, 긴급 모드: {}", level_num, emergency);
    
    let level = parse_optimization_level(level_num);
    
    match tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build() {
            Ok(rt) => {
                match rt.block_on(optimizer::perform_memory_optimization(level, emergency)) {
                    Ok(result) => {
                        // 최적화 성공
                        JsonResponse::success(optimization_result_to_json(&result))
                    },
                    Err(e) => {
                        // 최적화 실패
                        error!("메모리 최적화 실패: {}", e);
                        JsonResponse::error(&format!("메모리 최적화 실패: {}", e))
                    }
                }
            },
            Err(e) => {
                // 런타임 생성 실패
                error!("Tokio 런타임 생성 실패: {}", e);
                JsonResponse::error(&format!("Tokio 런타임 생성 실패: {}", e))
            }
        }
}

/// 메모리 최적화 수행 (동기)
#[napi]
pub fn optimize_memory_sync_json(level_num: i32, emergency: bool) -> String {
    info!("동기 메모리 최적화 요청: 레벨 {}, 긴급 모드: {}", level_num, emergency);
    
    let level = parse_optimization_level(level_num);
    
    match optimizer::perform_memory_optimization_sync(level, emergency) {
        Ok(result) => {
            // 최적화 성공
            JsonResponse::success(optimization_result_to_json(&result))
        },
        Err(e) => {
            // 최적화 실패
            error!("메모리 최적화 실패: {}", e);
            JsonResponse::error(&format!("메모리 최적화 실패: {}", e))
        }
    }
}

/// 가비지 컬렉션 강제 수행
#[napi]
pub fn force_garbage_collection_json() -> String {
    info!("가비지 컬렉션 요청");
    
    match gc::force_garbage_collection() {
        Ok(result) => {
            // GC 성공
            JsonResponse::success(json!({
                "success": result.success,
                "freed_memory": result.freed_memory,
                "freed_mb": result.freed_mb,
                "duration": result.duration,
                "timestamp": result.timestamp,
                "error": result.error
            }))
        },
        Err(e) => {
            // GC 실패
            error!("가비지 컬렉션 실패: {}", e);
            JsonResponse::error(&format!("가비지 컬렉션 실패: {}", e))
        }
    }
}

/// 메모리 설정 초기화
#[napi]
pub fn initialize_memory_settings_json(settings_json: String) -> String {
    info!("메모리 설정 초기화 요청");
    
    match settings::initialize_from_json(&settings_json) {
        Ok(_) => {
            // 초기화 성공
            JsonResponse::success(json!({
                "success": true,
                "message": "메모리 설정 초기화 성공",
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            }))
        },
        Err(e) => {
            // 초기화 실패
            error!("메모리 설정 초기화 실패: {}", e);
            JsonResponse::error(&format!("메모리 설정 초기화 실패: {}", e))
        }
    }
}

/// 메모리 설정 업데이트
#[napi]
pub fn update_memory_settings_json(settings_json: String) -> String {
    info!("메모리 설정 업데이트 요청");
    
    match settings::update_settings_from_json(&settings_json) {
        Ok(_) => {
            // 업데이트 성공
            JsonResponse::success(json!({
                "success": true,
                "message": "메모리 설정 업데이트 성공",
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            }))
        },
        Err(e) => {
            // 업데이트 실패
            error!("메모리 설정 업데이트 실패: {}", e);
            JsonResponse::error(&format!("메모리 설정 업데이트 실패: {}", e))
        }
    }
}

/// 메모리 설정 가져오기
#[napi]
pub fn get_memory_settings_json() -> String {
    debug!("메모리 설정 요청");
    
    match settings::get_settings_json() {
        Ok(settings_json) => {
            // 가져오기 성공
            JsonResponse::success(json!(settings_json))
        },
        Err(e) => {
            // 가져오기 실패
            error!("메모리 설정 가져오기 실패: {}", e);
            JsonResponse::error(&format!("메모리 설정 가져오기 실패: {}", e))
        }
    }
}

/// 메모리 진단 정보 가져오기
#[napi]
pub fn get_memory_diagnostics_json() -> String {
    debug!("메모리 진단 정보 요청");
    
    // 메모리 진단 정보 수집
    let memory_info = match analyzer::get_process_memory_info() {
        Ok(info) => memory_info_to_json(&info),
        Err(_) => json!(null),
    };
    
    let last_gc_time = gc::get_last_gc_time();
    let total_gc_performed = gc::get_total_gc_count();
    let heap_statistics = match analyzer::get_heap_statistics() {
        Ok(stats) => json!(stats),
        Err(_) => json!(null),
    };
    
    // 진단 정보 반환
    JsonResponse::success(json!({
        "memory_info": memory_info,
        "last_gc_time": last_gc_time,
        "total_gc_performed": total_gc_performed,
        "heap_statistics": heap_statistics,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    }))
}

/// 최적화 레벨 결정
#[napi]
pub fn determine_optimization_level_json() -> String {
    debug!("최적화 레벨 결정 요청");
    
    match analyzer::get_process_memory_info() {
        Ok(memory_info) => {
            let level = if memory_info.percent_used > 90.0 {
                OptimizationLevel::Critical
            } else if memory_info.percent_used > 80.0 {
                OptimizationLevel::High
            } else if memory_info.percent_used > 70.0 {
                OptimizationLevel::Medium
            } else if memory_info.percent_used > 60.0 {
                OptimizationLevel::Low
            } else {
                OptimizationLevel::Normal
            };
            
            JsonResponse::success(json!({
                "level": level as i32,
                "level_name": format!("{:?}", level),
                "memory_used_percent": memory_info.percent_used,
                "memory_used_mb": memory_info.heap_used_mb,
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            }))
        },
        Err(e) => {
            error!("메모리 정보 가져오기 실패: {}", e);
            JsonResponse::error(&format!("메모리 정보 가져오기 실패: {}", e))
        }
    }
}
