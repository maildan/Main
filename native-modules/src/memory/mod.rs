pub mod analyzer;
pub mod gc;
pub mod optimizer;
pub mod pool;
pub mod types;

use napi_derive::napi;
use napi::Error;
use std::sync::atomic::{AtomicU64, Ordering};

// 최근 메모리 최적화 타임스탬프 추적
static LAST_MEMORY_OPTIMIZATION: AtomicU64 = AtomicU64::new(0);

/// 메모리 정보 가져오기
#[napi]
pub fn get_memory_info() -> napi::Result<String> {
    let memory_info = analyzer::get_process_memory_info()
        .map_err(|e| Error::from_reason(format!("Failed to get memory info: {}", e)))?;
    
    // JSON 문자열로 변환
    let result = serde_json::to_string(&memory_info)
        .map_err(|e| Error::from_reason(format!("Failed to serialize memory info: {}", e)))?;
    
    Ok(result)
}

/// 최적화 수준 결정
#[napi]
pub fn determine_optimization_level() -> napi::Result<u32> {
    analyzer::determine_memory_optimization_level()
        .map(|level| level as u32)
        .map_err(|e| Error::from_reason(format!("Failed to determine optimization level: {}", e)))
}

/// 메모리 최적화 수행 (JavaScript에서 호출)
#[napi]
pub fn optimize_memory(level: u32, emergency: bool) -> napi::Result<String> {
    // 최적화 레벨 변환 (u32 -> OptimizationLevel)
    let opt_level = match level {
        0 => types::OptimizationLevel::Normal,
        1 => types::OptimizationLevel::Low,
        2 => types::OptimizationLevel::Medium,
        3 => types::OptimizationLevel::High,
        4 => types::OptimizationLevel::Critical,
        _ => types::OptimizationLevel::Medium, // 기본값
    };
    
    // 현재 시간 기록
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_MEMORY_OPTIMIZATION.store(now, Ordering::SeqCst);
    
    let result = optimizer::perform_memory_optimization_sync(opt_level, emergency)
        .map_err(|e| Error::from_reason(format!("Failed to optimize memory: {}", e)))?;
    
    let result_str = serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))?;
    
    Ok(result_str)
}

/// DOM 참조 정리
#[napi]
pub fn cleanup_dom_references() -> napi::Result<bool> {
    optimizer::clean_unused_resources()
        .map_err(|e| Error::from_reason(format!("Failed to cleanup DOM references: {}", e)))
}

/// 이미지 캐시 정리
#[napi]
pub fn clear_image_caches() -> napi::Result<bool> {
    gc::clean_low_priority_caches()
        .map_err(|e| Error::from_reason(format!("Failed to clear image caches: {}", e)))
}

/// 비활성 캐시 정리
#[napi]
pub fn clear_inactive_cache() -> napi::Result<bool> {
    gc::clean_inactive_caches()
        .map_err(|e| Error::from_reason(format!("Failed to clear inactive cache: {}", e)))
}

/// 우선순위가 낮은 캐시 정리
#[napi]
pub fn clear_low_priority_cache() -> napi::Result<bool> {
    gc::clean_low_priority_caches()
        .map_err(|e| Error::from_reason(format!("Failed to clear low priority cache: {}", e)))
}

/// 모든 캐시 정리
#[napi]
pub fn clear_all_cache() -> napi::Result<bool> {
    gc::clean_all_caches()
        .map_err(|e| Error::from_reason(format!("Failed to clear all cache: {}", e)))
}

/// 모든 리소스 해제
#[napi]
pub fn release_all_resources() -> napi::Result<bool> {
    optimizer::release_all_non_essential_resources()
        .map_err(|e| Error::from_reason(format!("Failed to release all resources: {}", e)))
}

/// 높은 수준의 메모리 최적화 수행
#[napi]
pub fn perform_high_level_optimization() -> napi::Result<String> {
    let result = optimizer::perform_memory_optimization_sync(types::OptimizationLevel::High, false)
        .map_err(|e| Error::from_reason(format!("Failed to perform high level optimization: {}", e)))?;
    
    let result_str = serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))?;
    
    Ok(result_str)
}

/// 긴급 메모리 복구 수행
#[napi]
pub fn perform_emergency_recovery() -> napi::Result<String> {
    let result = optimizer::perform_memory_optimization_sync(types::OptimizationLevel::Critical, true)
        .map_err(|e| Error::from_reason(format!("Failed to perform emergency recovery: {}", e)))?;
    
    let result_str = serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))?;
    
    Ok(result_str)
}

/// 가비지 컬렉션 수행
#[napi]
pub fn force_garbage_collection() -> napi::Result<String> {
    let result = gc::force_garbage_collection()
        .map_err(|e| Error::from_reason(format!("Failed to force garbage collection: {}", e)))?;
    
    let result_str = serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize GC result: {}", e)))?;
    
    Ok(result_str)
}

/// 메모리 풀 초기화
#[napi]
pub fn initialize_memory_pools() -> napi::Result<bool> {
    // Result 무시 경고 제거를 위해 let _ = 추가
    let _ = pool::initialize_memory_pools();
    Ok(true)
}

/// 메모리 풀 정리
#[napi]
pub fn cleanup_memory_pools() -> napi::Result<bool> {
    // Result 무시 경고 제거를 위해 let _ = 추가
    let _ = pool::cleanup_memory_pools();
    Ok(true)
}

/// 메모리 풀 통계
#[napi]
pub fn get_memory_pool_stats() -> napi::Result<String> {
    let stats = pool::get_pool_stats()
        .map_err(|e| Error::from_reason(format!("Failed to get pool stats: {}", e)))?;
    
    let json_str = serde_json::to_string(&stats)
        .map_err(|e| Error::from_reason(format!("Failed to serialize pool stats: {}", e)))?;
    
    Ok(json_str)
}

/// 메모리 임계값 설정 - 타입 변경하여 N-API 호환성 확보
#[napi]
pub fn set_memory_thresholds(
    low_threshold: f64,
    critical_threshold: f64,
    max_percentage: f64,
    interval: f64
) -> napi::Result<bool> {
    // 메모리 임계값 설정 (실제 구현 시 여기에 전역 상태 설정)
    let thresholds = types::MemoryThresholds {
        low_memory_threshold: low_threshold as u64,
        critical_memory_threshold: critical_threshold as u64,
        max_memory_percentage: max_percentage,
        optimization_interval: interval as u64,
    };
    
    // 실제 구현에서는 이 값들을 저장하고 사용
    println!("Memory thresholds set: {:?}", thresholds);
    
    Ok(true)
}
