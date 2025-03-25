pub mod analyzer;
pub mod gc;
pub mod optimizer;
pub mod pool;
pub mod types;
pub mod settings;
pub mod info;
use napi_derive::napi;
use napi::Error;
use std::sync::atomic::AtomicU64;
use serde_json::json;
use log::{info, error}; // debug 제거
use once_cell::sync::Lazy;
use std::sync::RwLock;

// 사용하지 않는 정적 변수에 #[allow(dead_code)] 추가
#[allow(dead_code)]
static OPTIMIZATION_HISTORY: Lazy<RwLock<Vec<optimizer::OptimizationResult>>> = 
    Lazy::new(|| RwLock::new(Vec::with_capacity(10)));

// 사용하지 않는 정적 변수에 #[allow(dead_code)] 추가
#[allow(dead_code)]
static LAST_MEMORY_OPTIMIZATION: AtomicU64 = AtomicU64::new(0);

/// 메모리 정보 가져오기
#[napi]
pub fn get_memory_info() -> napi::Result<String> {
    match analyzer::get_process_memory_info() {
        Ok(info) => {
            // 메모리 정보를 JSON으로 변환
            let json = json!({
                "heap_used": info.heap_used,
                "heap_total": info.heap_total,
                "heap_limit": info.heap_limit,
                "rss": info.rss,
                "external": info.external,
                "heap_used_mb": info.heap_used_mb,
                "rss_mb": info.rss_mb,
                "percent_used": info.percent_used,
                "timestamp": info.timestamp
            });
            
            Ok(json.to_string())
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
    
    // 최적화 수준 변환 - optimizer 모듈의 OptimizationLevel 사용
    let optimization_level = match level {
        0 => optimizer::OptimizationLevel::Normal,
        1 => optimizer::OptimizationLevel::Low,
        2 => optimizer::OptimizationLevel::Medium,
        3 => optimizer::OptimizationLevel::High,
        4 => optimizer::OptimizationLevel::Critical,
        _ => optimizer::OptimizationLevel::Medium,
    };
    
    // Tokio 런타임을 사용하여 비동기 최적화 실행
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => return Err(Error::from_reason(format!("런타임 생성 실패: {}", e))),
    };
    
    let result = match runtime.block_on(optimizer::perform_memory_optimization(optimization_level, emergency)) {
        Ok(result) => {
            // 결과를 JSON으로 변환
            let json_result = optimizer::optimization_result_to_json(&result);
            json_result.to_string()
        },
        Err(e) => {
            error!("메모리 최적화 실패: {}", e);
            json!({
                "success": false,
                "error": e.to_string(),
                "optimization_level": level,
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            }).to_string()
        }
    };
    
    Ok(result)
}

/// 가비지 컬렉션 수행
#[napi]
pub fn force_garbage_collection() -> napi::Result<String> {
    match gc::force_garbage_collection() {
        Ok(result) => {
            // GC 결과를 직접 파싱하여 JSON 생성
            let collected_json = serde_json::from_str::<serde_json::Value>(&result)
                .unwrap_or_else(|_| json!({}));
            
            // 기존 JSON 구조를 유지하면서 success 필드 추가
            let mut result_json = json!({
                "success": true,
            });
            
            // 파싱된 결과가 객체인 경우, 모든 필드를 복사
            if let Some(obj) = collected_json.as_object() {
                if let Some(result_obj) = result_json.as_object_mut() {
                    for (key, value) in obj {
                        result_obj.insert(key.clone(), value.clone());
                    }
                }
            }
            
            Ok(result_json.to_string())
        },
        Err(e) => {
            error!("가비지 컬렉션 실패: {}", e);
            let error_json = json!({
                "success": false,
                "error": e.to_string(),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(error_json.to_string())
        }
    }
}

/// 메모리 세부 정보 가져오기
#[napi]
pub fn get_memory_diagnostics() -> napi::Result<String> {
    // 메모리 상태 가져오기
    let memory_info = match analyzer::get_process_memory_info() {
        Ok(info) => Some(info),
        Err(_) => None,
    };
    
    // optimizer 모듈에서 최적화 통계 가져오기 함수 호출
    let optimization_stats = optimizer::get_optimization_stats();
    
    // 메모리 세부 정보 생성
    let diagnostics = json!({
        "memory_state": {
            "current": memory_info.map(|info| {
                json!({
                    "heap_used_mb": info.heap_used_mb,
                    "heap_total_mb": (info.heap_total as f64) / (1024.0 * 1024.0),
                    "rss_mb": info.rss_mb,
                    "percent_used": info.percent_used
                })
            }),
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        },
        "optimization_stats": {
            "count": optimization_stats.count,
            "last_optimization_time": optimization_stats.last_time,
            "total_freed_memory_bytes": optimization_stats.total_freed,
            "total_freed_memory_mb": (optimization_stats.total_freed as f64) / (1024.0 * 1024.0)
        }
    });
    
    Ok(diagnostics.to_string())
}

/// 자동 메모리 최적화 (필요한 경우)
#[napi]
pub fn auto_optimize_memory_if_needed() -> napi::Result<String> {
    // Tokio 런타임 생성
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => return Err(Error::from_reason(format!("런타임 생성 실패: {}", e))),
    };
    
    // 자동 최적화 수행
    match runtime.block_on(optimizer::auto_optimize_memory_if_needed()) {
        Ok(result) => {
            // 결과를 JSON으로 변환
            let json_result = optimizer::optimization_result_to_json(&result);
            Ok(json_result.to_string())
        },
        Err(e) => {
            error!("자동 메모리 최적화 실패: {}", e);
            let error_json = json!({
                "success": false,
                "error": e.to_string(),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(error_json.to_string())
        }
    }
}
