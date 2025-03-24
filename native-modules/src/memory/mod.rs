pub mod analyzer;
pub mod gc;
pub mod optimizer;
pub mod pool;
pub mod types;

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
/// 이 함수는 메모리 모니터링 대시보드 및 진단에 활용됩니다.
#[napi]
pub fn get_memory_info() -> napi::Result<String> {
    debug!("메모리 정보 요청 수신");
    match analyzer::get_process_memory_info() {
        Ok(memory_info) => {
            let result = serde_json::to_string(&memory_info)
                .map_err(|e| Error::from_reason(format!("Failed to serialize memory info: {}", e)))?;
            
            debug!("메모리 정보 반환: {:.2}MB 사용 중 ({:.1}%)", 
                memory_info.heap_used_mb, memory_info.percent_used);
            Ok(result)
        },
        Err(e) => {
            error!("메모리 정보 분석 오류: {}", e);
            Err(Error::from_reason(format!("Failed to get memory info: {}", e)))
        }
    }
}

/// 최적화 수준 결정 (엔트리포인트)
/// 
/// 현재 메모리 상태를 기반으로 필요한 최적화 수준을 결정합니다.
/// 반환된 수준(0-4)에 따라 클라이언트는 최적화 전략을 수립할 수 있습니다.
#[napi]
pub fn determine_optimization_level() -> napi::Result<u32> {
    debug!("최적화 수준 분석 요청 수신");
    match analyzer::determine_memory_optimization_level() {
        Ok(level) => {
            debug!("결정된 최적화 수준: {}", level);
            Ok(level as u32)
        },
        Err(e) => {
            error!("최적화 수준 결정 오류: {}", e);
            Err(Error::from_reason(format!("Failed to determine optimization level: {}", e)))
        }
    }
}

/// 메모리 최적화 수행 (엔트리포인트)
/// 
/// 지정된 수준의 메모리 최적화를 수행합니다.
/// 긴급 모드를 활성화하면 더 적극적인 최적화 전략이 적용됩니다.
#[napi]
pub fn optimize_memory(level: u32, emergency: bool) -> napi::Result<String> {
    info!("메모리 최적화 요청: 레벨 {}, 긴급 모드: {}", level, emergency);
    
    // 최적화 레벨 변환 (u32 -> OptimizationLevel)
    let opt_level = match level {
        0 => types::OptimizationLevel::Normal,
        1 => types::OptimizationLevel::Low,
        2 => types::OptimizationLevel::Medium,
        3 => types::OptimizationLevel::High,
        4 => types::OptimizationLevel::Critical,
        _ => {
            debug!("유효하지 않은 최적화 레벨 ({}), 기본값(Medium)으로 대체", level);
            types::OptimizationLevel::Medium // 기본값
        }
    };
    
    // 현재 시간 기록
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_MEMORY_OPTIMIZATION.store(now, Ordering::SeqCst);
    
    match optimizer::perform_memory_optimization_sync(opt_level, emergency) {
        Ok(result) => {
            // 결과 이력 저장
            let mut history = OPTIMIZATION_HISTORY.write();
            history.push(result.clone());
            if history.len() > 20 {  // 최대 20개 이력만 유지
                history.remove(0);
            }
            
            let result_str = serde_json::to_string(&result)
                .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))?;
            
            // 최적화 결과 로깅
            if let (Some(freed_mb), Some(duration)) = (result.freed_mb, result.duration) {
                info!("메모리 최적화 완료: {:.2}MB 해제됨, 소요 시간: {}ms", 
                    freed_mb, duration);
            }
            
            Ok(result_str)
        },
        Err(e) => {
            error!("메모리 최적화 실패: {}", e);
            
            // 실패 결과 생성 및 반환
            let error_result = json!({
                "success": false,
                "optimization_level": opt_level as u8,
                "error": e.to_string(),
                "timestamp": now
            });
            
            Ok(serde_json::to_string(&error_result)
                .unwrap_or_else(|_| format!("{{\"success\":false,\"error\":\"{}\"}}", e)))
        }
    }
}

/// 가비지 컬렉션 수행 (엔트리포인트)
#[napi]
pub fn force_garbage_collection() -> napi::Result<String> {
    info!("가비지 컬렉션 강제 수행 요청");
    
    match gc::force_garbage_collection() {
        Ok(result) => {
            let result_str = serde_json::to_string(&result)
                .map_err(|e| Error::from_reason(format!("Failed to serialize GC result: {}", e)))?;
            
            // GC 결과 로깅
            if let Some(freed_mb) = result.freed_mb {
                info!("가비지 컬렉션 완료: {:.2}MB 해제됨", freed_mb);
            }
            
            Ok(result_str)
        },
        Err(e) => {
            error!("가비지 컬렉션 실패: {}", e);
            
            // 실패 결과 생성 및 반환
            let error_result = json!({
                "success": false,
                "error": e.to_string(),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(serde_json::to_string(&error_result)
                .unwrap_or_else(|_| format!("{{\"success\":false,\"error\":\"{}\"}}", e)))
        }
    }
}

/// 메모리 풀 초기화 (엔트리포인트)
#[napi]
pub fn initialize_memory_pools() -> napi::Result<bool> {
    info!("메모리 풀 초기화 요청");
    
    match pool::initialize_memory_pools() {
        Ok(_) => {
            info!("메모리 풀 초기화 완료");
            Ok(true)
        },
        Err(e) => {
            error!("메모리 풀 초기화 실패: {}", e);
            Err(Error::from_reason(format!("Failed to initialize memory pools: {}", e)))
        }
    }
}

/// 메모리 최적화 이력 가져오기
#[napi]
pub fn get_optimization_history() -> napi::Result<String> {
    debug!("최적화 이력 요청 수신");
    
    let history = OPTIMIZATION_HISTORY.read();
    match serde_json::to_string(&*history) {
        Ok(json) => Ok(json),
        Err(e) => Err(Error::from_reason(format!("Failed to serialize optimization history: {}", e)))
    }
}

// 추가 유틸리티 함수들...
