pub mod analyzer;
pub mod gc;
pub mod optimizer;
pub mod pool;
pub mod types;
pub mod settings;

use napi_derive::napi;
use napi::Error;
use std::sync::atomic::{AtomicU64, Ordering};
use serde_json::json;
use log::{info, error, debug};
use once_cell::sync::Lazy;

// 메모리 최적화 이력 저장소
pub static OPTIMIZATION_HISTORY: Lazy<parking_lot::RwLock<Vec<types::OptimizationResult>>> = 
    Lazy::new(|| parking_lot::RwLock::new(Vec::with_capacity(10)));

// 최근 메모리 최적화 타임스탬프 추적
static LAST_MEMORY_OPTIMIZATION: AtomicU64 = AtomicU64::new(0);

/// 메모리 상태 가져오기 (엔트리포인트)
/// 
/// 애플리케이션의 현재 메모리 상태를 JSON 형태로 반환합니다.
#[napi]
pub fn get_memory_info() -> napi::Result<String> {
    match analyzer::get_process_memory_info() {
        Ok(memory_info) => {
            let json_result = json!({
                "heap_used": memory_info.heap_used,
                "heap_total": memory_info.heap_total,
                "heap_limit": memory_info.heap_limit,
                "rss": memory_info.rss,
                "external": memory_info.external,
                "heap_used_mb": memory_info.heap_used_mb,
                "rss_mb": memory_info.rss_mb,
                "percent_used": memory_info.percent_used,
                "timestamp": memory_info.timestamp
            });
            
            Ok(json_result.to_string())
        },
        Err(e) => {
            error!("메모리 정보 가져오기 실패: {}", e);
            Err(e)
        }
    }
}

/// 메모리 최적화 수준 결정
#[napi]
pub fn determine_optimization_level() -> napi::Result<u8> {
    match analyzer::determine_memory_optimization_level() {
        Ok(level) => Ok(level),
        Err(e) => {
            error!("최적화 수준 결정 실패: {}", e);
            Err(e)
        }
    }
}

/// 메모리 최적화 수행
/// 
/// 요청된 최적화 수준에 따라 메모리 최적화를 수행합니다.
#[napi]
pub fn optimize_memory(level: u8, emergency: bool) -> napi::Result<String> {
    info!("메모리 최적화 요청: 레벨 {}, 긴급 모드 {}", level, emergency);
    
    // 최적화 수준 변환
    let optimization_level = match level {
        0 => types::OptimizationLevel::Normal,
        1 => types::OptimizationLevel::Low,
        2 => types::OptimizationLevel::Medium,
        3 => types::OptimizationLevel::High,
        4 => types::OptimizationLevel::Critical,
        _ => types::OptimizationLevel::Medium,
    };
    
    // Tokio 런타임을 사용하여 비동기 최적화 실행
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => return Err(Error::from_reason(format!("런타임 생성 실패: {}", e))),
    };
    
    let result = match runtime.block_on(optimizer::perform_memory_optimization(optimization_level, emergency)) {
        Ok(result) => {
            // 최적화 이력 저장
            OPTIMIZATION_HISTORY.write().push(result.clone());
            LAST_MEMORY_OPTIMIZATION.store(result.timestamp, Ordering::SeqCst);
            
            // 결과를 JSON으로 변환
            match serde_json::to_string(&result) {
                Ok(json) => json,
                Err(e) => return Err(Error::from_reason(format!("결과 직렬화 실패: {}", e))),
            }
        },
        Err(e) => {
            error!("메모리 최적화 실패: {}", e);
            return Err(e);
        }
    };
    
    Ok(result)
}

/// 강제 가비지 컬렉션 수행
#[napi]
pub fn force_garbage_collection() -> napi::Result<String> {
    match gc::force_garbage_collection() {
        Ok(result) => {
            // 결과를 JSON으로 변환
            match serde_json::to_string(&result) {
                Ok(json) => Ok(json),
                Err(e) => Err(Error::from_reason(format!("결과 직렬화 실패: {}", e))),
            }
        },
        Err(e) => {
            error!("가비지 컬렉션 실패: {}", e);
            Err(e)
        }
    }
}

/// 메모리 설정 초기화
#[napi]
pub fn initialize_memory_settings(settings_json: String) -> napi::Result<bool> {
    debug!("메모리 설정 초기화 요청");
    match settings::initialize_memory_settings(&settings_json) {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("메모리 설정 초기화 실패: {}", e);
            Err(e)
        }
    }
}

/// 메모리 설정 업데이트
#[napi]
pub fn update_memory_settings(settings_json: String) -> napi::Result<bool> {
    debug!("메모리 설정 업데이트 요청");
    match settings::update_memory_settings(&settings_json) {
        Ok(result) => Ok(result),
        Err(e) => {
            error!("메모리 설정 업데이트 실패: {}", e);
            Err(e)
        }
    }
}

/// 현재 메모리 설정 가져오기
#[napi]
pub fn get_memory_settings() -> napi::Result<String> {
    debug!("메모리 설정 가져오기 요청");
    match settings::get_settings_json() {
        Ok(json) => Ok(json),
        Err(e) => {
            error!("메모리 설정 가져오기 실패: {}", e);
            Err(e)
        }
    }
}

/// 자동 메모리 최적화 수행 (필요한 경우)
#[napi]
pub fn auto_optimize_memory_if_needed() -> napi::Result<String> {
    // Tokio 런타임을 사용하여 비동기 최적화 실행
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => return Err(Error::from_reason(format!("런타임 생성 실패: {}", e))),
    };
    
    let result = match runtime.block_on(optimizer::auto_optimize_memory_if_needed()) {
        Ok(result) => {
            // 최적화가 수행된 경우에만 이력 저장
            if result.freed_memory.unwrap_or(0) > 0 {
                OPTIMIZATION_HISTORY.write().push(result.clone());
                LAST_MEMORY_OPTIMIZATION.store(result.timestamp, Ordering::SeqCst);
            }
            
            // 결과를 JSON으로 변환
            match serde_json::to_string(&result) {
                Ok(json) => json,
                Err(e) => return Err(Error::from_reason(format!("결과 직렬화 실패: {}", e))),
            }
        },
        Err(e) => {
            error!("자동 메모리 최적화 실패: {}", e);
            return Err(e);
        }
    };
    
    Ok(result)
}
