pub mod analyzer;
pub mod gc;
pub mod optimizer;
pub mod pool;
pub mod types;
pub mod settings;
pub mod info;
use napi_derive::napi;
use serde_json::json;
use log::{info, error}; 
use once_cell::sync::Lazy;
use std::sync::RwLock;
use std::sync::atomic::AtomicU64;

#[allow(dead_code)]
static OPTIMIZATION_HISTORY: Lazy<RwLock<Vec<optimizer::OptimizationResult>>> = 
    Lazy::new(|| RwLock::new(Vec::with_capacity(10)));

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
pub fn determine_optimization_level() -> napi::Result<i32> {
    let memory_info = analyzer::get_process_memory_info()?;
    
    // 메모리 사용률에 따라 최적화 수준 결정
    let level = if memory_info.percent_used > 90.0 {
        4 // Critical
    } else if memory_info.percent_used > 80.0 {
        3 // High
    } else if memory_info.percent_used > 70.0 {
        2 // Medium
    } else if memory_info.percent_used > 50.0 {
        1 // Low
    } else {
        0 // Normal
    };
    
    info!("최적화 수준 결정: {} (메모리 사용률: {:.1}%)", level, memory_info.percent_used);
    Ok(level)
}

/// 가비지 컬렉션 강제 수행
#[napi]
pub fn force_garbage_collection() -> napi::Result<String> {
    info!("가비지 컬렉션 강제 수행 요청");
    
    match gc::force_garbage_collection() {
        Ok(result) => {
            // Assuming result is already a string containing the GC result
            // Just pass it through or parse it if you need to modify
            Ok(result)
        },
        Err(e) => {
            error!("가비지 컬렉션 실패: {}", e);
            let json = json!({
                "success": false,
                "error": e.to_string(),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(json.to_string())
        }
    }
}

/// 메모리 최적화 수행
#[napi]
pub fn optimize_memory(level_str: String, emergency: bool) -> napi::Result<String> {
    info!("메모리 최적화 요청: 레벨={}, 긴급={}", level_str, emergency);
    
    // 문자열 레벨을 최적화 열거형으로 변환
    let level = match level_str.to_lowercase().as_str() {
        "normal" => optimizer::OptimizationLevel::Normal,
        "low" => optimizer::OptimizationLevel::Low,
        "medium" => optimizer::OptimizationLevel::Medium,
        "high" => optimizer::OptimizationLevel::High,
        "critical" => optimizer::OptimizationLevel::Critical,
        _ => {
            // 숫자 변환 시도
            if let Ok(num) = level_str.parse::<i32>() {
                match num {
                    0 => optimizer::OptimizationLevel::Normal,
                    1 => optimizer::OptimizationLevel::Low,
                    2 => optimizer::OptimizationLevel::Medium,
                    3 => optimizer::OptimizationLevel::High,
                    4 | _ => optimizer::OptimizationLevel::Critical,
                }
            } else {
                // 기본값: 중간 수준
                optimizer::OptimizationLevel::Medium
            }
        }
    };
    
    let result = optimizer::optimize_memory(level, emergency);
    let json = optimizer::optimization_result_to_json(&result);
    
    Ok(json.to_string())
}

/// 비동기 메모리 최적화 수행
#[napi]
pub async fn optimize_memory_async(level_str: String, emergency: bool) -> napi::Result<String> {
    info!("비동기 메모리 최적화 요청: 레벨={}, 긴급={}", level_str, emergency);
    
    // 문자열 레벨을 최적화 열거형으로 변환
    let level = match level_str.to_lowercase().as_str() {
        "normal" => optimizer::OptimizationLevel::Normal,
        "low" => optimizer::OptimizationLevel::Low,
        "medium" => optimizer::OptimizationLevel::Medium,
        "high" => optimizer::OptimizationLevel::High,
        "critical" => optimizer::OptimizationLevel::Critical,
        _ => {
            // 숫자 변환 시도
            if let Ok(num) = level_str.parse::<i32>() {
                match num {
                    0 => optimizer::OptimizationLevel::Normal,
                    1 => optimizer::OptimizationLevel::Low,
                    2 => optimizer::OptimizationLevel::Medium,
                    3 => optimizer::OptimizationLevel::High,
                    4 | _ => optimizer::OptimizationLevel::Critical,
                }
            } else {
                // 기본값: 중간 수준
                optimizer::OptimizationLevel::Medium
            }
        }
    };
    
    match optimizer::perform_memory_optimization(level, emergency).await {
        Ok(result) => {
            let json = optimizer::optimization_result_to_json(&result);
            Ok(json.to_string())
        },
        Err(e) => {
            error!("비동기 메모리 최적화 실패: {}", e);
            let json = json!({
                "success": false,
                "error": e.to_string(),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(json.to_string())
        }
    }
}

/// 메모리 최적화 통계 가져오기
#[napi]
pub fn get_memory_optimization_stats() -> napi::Result<String> {
    let stats = optimizer::get_optimization_stats();
    
    let json = json!({
        "count": stats.count,
        "last_time": stats.last_time,
        "total_freed_mb": stats.total_freed / (1024 * 1024),
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    });
    
    Ok(json.to_string())
}
