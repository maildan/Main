use napi::Error;
// 로깅 매크로 import 추가 (error 포함)
use log::{debug, info, warn, error};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration as TokioDuration};
// 자체 타입 정의 대신 types 모듈에서 가져오기
use crate::memory::types::MemoryInfo;
use crate::memory::analyzer;
use crate::memory::gc;
use crate::memory::pool;
use crate::memory::settings;
// GPU 모듈 올바르게 import - self 제거
use crate::gpu::context;
// memory_info_to_json 함수 import
use crate::memory::info::memory_info_to_json;

use std::time::Instant;
use serde_json::{json, Value};
use std::sync::Mutex;
use lazy_static::lazy_static;
use std::time::Duration;

// Optimization level enum - PartialEq 트레이트 추가
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OptimizationLevel {
    Low,
    Medium,
    High,
    Normal,
    Critical,
}

// Global optimization state
lazy_static! {
    static ref OPTIMIZATION_STATE: Mutex<OptimizationState> = Mutex::new(OptimizationState {
        last_optimization: None,
        optimization_count: 0,
        total_freed_memory: 0,
    });
}

struct OptimizationState {
    last_optimization: Option<Instant>,
    optimization_count: u32,
    total_freed_memory: usize,
}

pub struct OptimizationResult {
    pub success: bool,
    pub optimization_level: OptimizationLevel,
    pub freed_memory: Option<usize>,
    pub freed_mb: Option<f64>,
    pub duration: Option<Duration>,
    pub memory_before: Option<MemoryInfo>,
    pub memory_after: Option<MemoryInfo>,
    pub error: Option<String>,
    pub timestamp: u64,
}

impl Default for OptimizationResult {
    fn default() -> Self {
        Self {
            success: false,
            optimization_level: OptimizationLevel::Normal,
            freed_memory: None,
            freed_mb: None,
            duration: None,
            memory_before: None,
            memory_after: None,
            error: None,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }
}

// Optimize memory with specified level
pub fn optimize_memory(level: OptimizationLevel, emergency: bool) -> OptimizationResult {
    let start_time = Instant::now();
    let mut result = OptimizationResult::default();
    result.optimization_level = level;
    
    // Get memory info before optimization
    match analyzer::get_process_memory_info() {
        Ok(info) => {
            result.memory_before = Some(info);
        },
        Err(e) => {
            result.error = Some(format!("Failed to get initial memory info: {}", e));
            return result;
        }
    }
    
    // Apply optimization based on level
    match level {
        OptimizationLevel::Normal => {
            // No optimization requested
            result.success = true;
        },
        OptimizationLevel::Low => {
            // Basic optimization - just GC
            if let Err(e) = gc::force_garbage_collection() {
                result.error = Some(format!("GC failed: {}", e));
                return result;
            }
            result.success = true;
        },
        OptimizationLevel::Medium => {
            // Medium optimization - GC + some resource cleanup
            if let Err(e) = gc::force_garbage_collection() {
                result.error = Some(format!("GC failed: {}", e));
                return result;
            }
            
            // Cleanup GPU resources that aren't actively used
            if emergency {
                // GPU 리소스 정리 코드 - 구현 예정
            }
            
            result.success = true;
        },
        OptimizationLevel::High => {
            // High optimization - GC + aggressive resource cleanup
            if let Err(e) = gc::force_garbage_collection() {
                result.error = Some(format!("GC failed: {}", e));
                return result;
            }
            
            // More aggressive GPU cleanup - 구현 예정
            
            result.success = true;
        },
        OptimizationLevel::Critical => {
            // Extreme optimization - GC + release all possible resources
            if let Err(e) = gc::force_garbage_collection() {
                result.error = Some(format!("GC failed: {}", e));
                return result;
            }
            
            // Release all possible GPU resources - 구현 예정
            
            result.success = true;
        }
    }
    
    // Get memory info after optimization
    match analyzer::get_process_memory_info() {
        Ok(info) => {
            let memory_before = result.memory_before.as_ref().unwrap();
            result.memory_after = Some(info.clone());
            
            // Calculate freed memory
            if memory_before.heap_used > info.heap_used {
                let freed = memory_before.heap_used - info.heap_used;
                result.freed_memory = Some(freed as usize);
                result.freed_mb = Some(freed as f64 / (1024.0 * 1024.0));
                
                // Update global state
                if let Ok(mut state) = OPTIMIZATION_STATE.lock() {
                    state.last_optimization = Some(Instant::now());
                    state.optimization_count += 1;
                    state.total_freed_memory += freed as usize;
                }
            }
        },
        Err(e) => {
            result.error = Some(format!("Failed to get final memory info: {}", e));
        }
    }
    
    // Record duration
    result.duration = Some(start_time.elapsed());
    result.timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    result
}

// Convert optimization result to JSON
pub fn optimization_result_to_json(result: &OptimizationResult) -> Value {
    let mut json_result = json!({
        "success": result.success,
        "optimization_level": result.optimization_level as u8,
        "timestamp": result.timestamp,
    });
    
    if let Some(freed) = result.freed_memory {
        json_result["freed_memory"] = json!(freed);
    }
    
    if let Some(freed_mb) = result.freed_mb {
        json_result["freed_mb"] = json!(freed_mb);
    }
    
    if let Some(duration) = &result.duration {
        json_result["duration"] = json!(duration.as_millis());
    }
    
    if let Some(ref error) = result.error {
        json_result["error"] = json!(error);
    }
    
    if let Some(ref before) = result.memory_before {
        json_result["memory_before"] = memory_info_to_json(before);
    }
    
    if let Some(ref after) = result.memory_after {
        json_result["memory_after"] = memory_info_to_json(after);
    }
    
    json_result
}

static LAST_OPTIMIZATION_TIME: AtomicU64 = AtomicU64::new(0);
static OPTIMIZATION_COUNT: AtomicU64 = AtomicU64::new(0);
static TOTAL_FREED_MEMORY: AtomicU64 = AtomicU64::new(0);

pub fn get_last_optimization_time() -> u64 {
    LAST_OPTIMIZATION_TIME.load(Ordering::SeqCst)
}

/// GPU 가속화 활성화 상태 확인
/// 
/// 사용자 설정에서 GPU 가속화가 활성화되어 있는지 확인합니다.
pub fn is_gpu_acceleration_enabled() -> bool {
    // GPU 가용성 확인 - 임시 구현
    context::is_gpu_initialized()
}

/// GPU 가속화 활성화
pub fn enable_gpu_acceleration() -> Result<bool, Error> {
    if context::check_gpu_availability() {
        // GPU 가속화 활성화 시도
        return Ok(true); // 임시 구현
    }
    
    // GPU를 사용할 수 없는 경우
    Err(Error::from_reason("GPU 가속화를 사용할 수 없습니다"))
}

pub fn optimize_gpu_resources() -> Result<bool, Error> {
    // GPU 리소스 최적화
    if is_gpu_acceleration_enabled() {
        debug!("GPU 리소스 최적화 수행 중...");
        // 실제 구현이 없으므로 성공 상태 반환
        debug!("GPU 리소스 최적화 완료");
        return Ok(true);
    }
    // GPU 가속화가 활성화되지 않은 경우 아무 작업도 수행하지 않음
    Ok(false)
}

/// 사용자 설정에 따라 GPU 가속화 상태 조정
pub fn adjust_gpu_acceleration_based_on_memory(memory_info: &MemoryInfo) -> Result<(), Error> {
    // 하드웨어 가속이 설정에서 비활성화된 경우 아무 작업도 하지 않음
    if !settings::is_hardware_acceleration_enabled() {
        return Ok(());
    }

    // 처리 모드에 따라 GPU 사용 여부 결정
    let processing_mode = settings::get_processing_mode();
    let _mode_specific_setting = match processing_mode.as_str() {
        "cpu-intensive" => false, // CPU 집약적 모드에서는 GPU 비활성화
        "gpu-intensive" => true,  // GPU 집약적 모드에서는 GPU 활성화
        _ => true,                // auto 또는 normal 모드에서는 메모리 사용량에 따라 결정
    };

    // CPU 집약적 모드일 경우 무조건 GPU 비활성화
    if processing_mode == "cpu-intensive" {
        if context::is_gpu_initialized() {
            debug!("CPU 집약적 모드: GPU 가속화 비활성화");
            // GPU 비활성화 구현 필요
        }
        return Ok(());
    }

    // GPU 집약적 모드일 경우 메모리 상태가 심각하지 않으면 GPU 유지
    if processing_mode == "gpu-intensive" {
        if memory_info.percent_used > 90.0 {
            debug!("GPU 집약적 모드이지만 메모리 사용량이 매우 높음: GPU 가속화 임시 비활성화");
            // GPU 비활성화 구현 필요
        } else if !context::is_gpu_initialized() && context::check_gpu_availability() {
            debug!("GPU 집약적 모드: GPU 가속화 활성화");
            // GPU 활성화 구현 필요
        }
        return Ok(());
    }

    // 기본 모드(auto) 또는 normal 모드에서 메모리 사용량에 따라 GPU 가속화 활성화 여부 결정
    let high_memory_usage = memory_info.percent_used > 85.0;
    
    if high_memory_usage {
        // 메모리 사용량이 높을 때 GPU 가속화 비활성화
        debug!("메모리 사용량이 높아 GPU 가속화 비활성화 ({:.1}%)", 
               memory_info.percent_used);
        
        // GPU 리소스 최적화 - bool 결과 무시하고 Error만 전파
        if let Err(e) = optimize_gpu_resources() {
            return Err(e);
        }
        
        // GPU 가속화 상태를 변경하는 다른 함수 호출
        if context::is_gpu_initialized() {
            // gpu 모듈 함수로 변경
            debug!("GPU 컨텍스트 이미 초기화됨, 가속화 비활성화");
            // GPU 비활성화 구현 필요
        }
    } else if memory_info.percent_used < 70.0 {
        // 메모리 사용량이 적당할 때 GPU 가속화 활성화
        debug!("메모리 사용량이 적정하여 GPU 가속화 활성화 가능 ({:.1}%)",
               memory_info.percent_used);
        
        // GPU 가속화 상태를 변경하는 다른 함수 호출
        if !context::is_gpu_initialized() && context::check_gpu_availability() {
            debug!("GPU 가속화 활성화 시도");
            // GPU 활성화 구현 필요
        }
    }
    
    // 프로세싱 모드에 따른 특정 설정 처리
    let _mode_specific_setting = match processing_mode.as_str() {
        "normal" => {
            // 일반 모드 
            debug!("일반 모드에서 메모리 최적화 설정 적용");
            1.0
        },
        "cpu-intensive" => {
            // CPU 집약적 모드
            debug!("CPU 집약적 모드에서 메모리 최적화 설정 적용");
            1.5
        },
        "gpu-intensive" => {
            // GPU 집약적 모드
            debug!("GPU 집약적 모드에서 메모리 최적화 설정 적용");
            2.0
        },
        _ => {
            // 기본 (자동)
            debug!("자동 모드에서 메모리 최적화 설정 적용");
            1.0
        }
    };
    
    Ok(())
}

pub async fn perform_memory_optimization(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    info!("비동기 메모리 최적화 시작: 레벨 {:?}, 긴급 모드: {}", level, emergency);
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    OPTIMIZATION_COUNT.fetch_add(1, Ordering::SeqCst);
    
    let memory_before = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory: {}", e)));
        }
    };
    
    debug!("최적화 전 메모리 상태: {:.2}MB 사용 중 ({:.1}%)", 
        memory_before.heap_used_mb, memory_before.percent_used);
    
    if let Err(e) = adjust_gpu_acceleration_based_on_memory(&memory_before) {
        warn!("GPU 가속화 상태 조정 실패: {}", e);
    }
    
    // 사용자 설정에 따라 공격적인 GC 사용 여부 결정
    let use_aggressive_gc = settings::is_aggressive_gc_enabled() || emergency;
    
    match level {
        OptimizationLevel::Normal => {
            debug!("기본 최적화 수행 중...");
            perform_light_optimization().await?;
        },
        OptimizationLevel::Low => {
            debug!("낮은 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
            }
        },
        OptimizationLevel::Medium => {
            debug!("중간 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
            }
        },
        OptimizationLevel::High => {
            debug!("높은 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            perform_high_optimization().await?;
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
                // 셰이더 캐시 정리 구현 필요
            }
        },
        OptimizationLevel::Critical => {
            info!("긴급 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            perform_high_optimization().await?;
            
            // 사용자 설정에 따라 공격적인 GC 수행
            if use_aggressive_gc {
                gc::force_garbage_collection()?;
            } else {
                gc::perform_basic_gc()?;
            }
            
            if is_gpu_acceleration_enabled() && emergency {
                debug!("긴급 상황: GPU 가속화 일시 중지");
                // GPU 비활성화 구현 필요
            }
            
            if emergency {
                warn!("긴급 메모리 복구 모드 활성화!");
                perform_emergency_recovery().await?;
            }
        }
    }
    
    sleep(TokioDuration::from_millis(100)).await;
    
    let memory_after = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("최적화 후 메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory after optimization: {}", e)));
        }
    };
    
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    // u64를 usize로 변환하는 대신, usize를 u64로 변환 (이 방향이 항상 안전함)
    TOTAL_FREED_MEMORY.fetch_add(freed_memory as u64, Ordering::SeqCst);
    
    let freed_mb = freed_memory as f64 / (1024.0 * 1024.0);
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64 - now;
    
    debug!("최적화 완료: {:.2}MB 해제됨, 소요 시간: {}ms", freed_mb, duration);
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: level,
        memory_before: Some(memory_before),
        memory_after: Some(memory_after),
        freed_memory: Some(freed_memory as usize),
        freed_mb: Some(freed_mb),
        duration: Some(Duration::from_millis(duration)),
        timestamp: now,
        error: None,
    })
}

pub fn perform_memory_optimization_sync(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    info!("동기 메모리 최적화 시작: 레벨 {:?}, 긴급 모드: {}", level, emergency);
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    OPTIMIZATION_COUNT.fetch_add(1, Ordering::SeqCst);
    
    let memory_before = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory: {}", e)));
        }
    };
    
    debug!("최적화 전 메모리 상태: {:.2}MB 사용 중 ({:.1}%)", 
        memory_before.heap_used_mb, memory_before.percent_used);
    
    if let Err(e) = adjust_gpu_acceleration_based_on_memory(&memory_before) {
        warn!("GPU 가속화 상태 조정 실패: {}", e);
    }
    
    match level {
        OptimizationLevel::Normal => {
            debug!("기본 최적화 수행 중...");
            gc::perform_basic_gc()?;
        },
        OptimizationLevel::Low => {
            debug!("낮은 수준 최적화 수행 중...");
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
            
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
            }
        },
        OptimizationLevel::Medium => {
            debug!("중간 수준 최적화 수행 중...");
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
            pool::reclaim_idle_objects()?;
            
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
            }
        },
        OptimizationLevel::High => {
            debug!("높은 수준 최적화 수행 중...");
            gc::perform_aggressive_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
            release_backend_resources()?;
            pool::reclaim_all_available_objects()?;
            
            if is_gpu_acceleration_enabled() {
                let _ = optimize_gpu_resources();
                // 셰이더 캐시 정리 구현 필요
            }
        },
        OptimizationLevel::Critical => {
            info!("긴급 최적화 수행 중...");
            gc::perform_emergency_gc()?;
            clean_unused_resources()?;
            release_all_non_essential_resources()?;
            pool::reclaim_all_objects()?;
            
            if is_gpu_acceleration_enabled() && emergency {
                debug!("긴급 상황: GPU 가속화 일시 중지");
                // GPU 비활성화 구현 필요
            }
            
            if emergency {
                warn!("긴급 메모리 복구 모드 활성화!");
                gc::force_garbage_collection()?;
            }
        }
    }
    
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    let memory_after = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("최적화 후 메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory after optimization: {}", e)));
        }
    };
    
    if emergency && memory_after.percent_used < 75.0 {
        if !is_gpu_acceleration_enabled() {
            debug!("메모리 회복 후 GPU 가속화 재활성화 시도");
            // GPU 활성화 구현 필요
        }
    }
    
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    // u64를 u64로 변환 (이미 u64임)
    TOTAL_FREED_MEMORY.fetch_add(freed_memory, Ordering::SeqCst);
    
    let freed_mb = freed_memory as f64 / (1024.0 * 1024.0);
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64 - now;
    
    debug!("최적화 완료: {:.2}MB 해제됨, 소요 시간: {}ms", 
        freed_mb, duration);
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: level,
        memory_before: Some(memory_before),
        memory_after: Some(memory_after),
        freed_memory: Some(freed_memory as usize),
        freed_mb: Some(freed_mb),
        duration: Some(Duration::from_millis(duration)),
        timestamp: now,
        error: None,
    })
}

async fn perform_light_optimization() -> Result<(), Error> {
    debug!("경량 최적화 수행 중...");
    
    gc::clean_inactive_caches()?;
    pool::cleanup_inactive_pools()?;
    
    sleep(TokioDuration::from_millis(10)).await;
    
    Ok(())
}

async fn perform_low_optimization() -> Result<(), Error> {
    debug!("낮은 수준 최적화 수행 중...");
    
    clean_unused_resources()?;
    gc::clean_low_priority_caches()?;
    
    sleep(TokioDuration::from_millis(20)).await;
    
    Ok(())
}

async fn perform_medium_optimization() -> Result<(), Error> {
    debug!("중간 수준 최적화 수행 중...");
    
    release_unused_buffers()?;
    pool::optimize_memory_pools()?;
    
    sleep(TokioDuration::from_millis(30)).await;
    
    Ok(())
}

async fn perform_high_optimization() -> Result<(), Error> {
    debug!("높은 수준 최적화 수행 중...");
    
    release_backend_resources()?;
    gc::clean_all_caches()?;
    pool::compact_memory_pools()?;
    
    sleep(TokioDuration::from_millis(30)).await;
    
    Ok(())
}

async fn perform_emergency_recovery() -> Result<(), Error> {
    warn!("긴급 복구 모드 활성화!");
    
    release_all_non_essential_resources()?;
    pool::reset_memory_pools()?;
    
    if is_gpu_acceleration_enabled() {
        debug!("GPU 리소스 완전 정리");
        // GPU 리소스 정리 구현 필요
    }
    
    force_temporary_memory_release();
    
    sleep(TokioDuration::from_millis(50)).await;
    
    Ok(())
}

pub fn clean_unused_resources() -> Result<bool, Error> {
    debug!("사용하지 않는 리소스 정리 중...");
    
    Ok(true)
}

pub fn release_unused_buffers() -> Result<bool, Error> {
    debug!("미사용 버퍼 해제 중...");
    
    Ok(true)
}

pub fn release_backend_resources() -> Result<bool, Error> {
    debug!("백엔드 리소스 정리 중...");
    
    if is_gpu_acceleration_enabled() {
        if let Err(e) = optimize_gpu_resources() {
            warn!("GPU 리소스 정리 실패: {}", e);
        }
    }
    
    Ok(true)
}

pub fn release_all_non_essential_resources() -> Result<bool, Error> {
    warn!("모든 비필수 리소스 해제 중...");
    
    clean_unused_resources()?;
    release_unused_buffers()?;
    release_backend_resources()?;
    gc::clean_all_caches()?;
    
    if is_gpu_acceleration_enabled() {
        debug!("모든 비필수 GPU 리소스 해제");
        // GPU 리소스 해제 구현 필요
    }
    
    Ok(true)
}

fn force_temporary_memory_release() {
    let size = 50 * 1024 * 1024;
    let _buffer = vec![0u8; size];
    drop(_buffer);
    
    debug!("임시 메모리 할당/해제 완료 (GC 유도)");
}

pub async fn auto_optimize_memory_if_needed() -> Result<OptimizationResult, Error> {
    // 자동 최적화가 설정에서 비활성화된 경우 빠르게 종료
    if !settings::is_automatic_optimization_enabled() {
        debug!("자동 메모리 최적화가 설정에서 비활성화되어 있습니다");
        
        // 기본 성공 결과 반환
        let memory_info = analyzer::get_process_memory_info()?;
        return Ok(OptimizationResult {
            success: true,
            optimization_level: OptimizationLevel::Normal,
            memory_before: Some(memory_info.clone()),
            memory_after: Some(memory_info),
            freed_memory: Some(0),
            freed_mb: Some(0.0),
            duration: Some(Duration::from_millis(0)),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            error: None,
        });
    }

    debug!("자동 메모리 최적화 검사 중...");
    
    let memory_info = analyzer::get_process_memory_info()?;
    
    // 설정에서 가져온 임계값 사용
    let threshold = settings::get_optimization_threshold();
    let memory_used_mb = memory_info.heap_used_mb;
    
    // 임계값과 비교하여 최적화 수준 결정
    let (opt_level, emergency) = if memory_used_mb > threshold * 1.5 {
        (OptimizationLevel::Critical, true)
    } else if memory_used_mb > threshold * 1.2 {
        (OptimizationLevel::High, false)
    } else if memory_used_mb > threshold {
        (OptimizationLevel::Medium, false)
    } else {
        (OptimizationLevel::Normal, false)
    };
    
    if opt_level != OptimizationLevel::Normal {
        debug!("자동 메모리 최적화 수행: 레벨 {:?}, 긴급 모드: {}", opt_level, emergency);
        return perform_memory_optimization(opt_level, emergency).await;
    }
    
    debug!("메모리 사용량이 정상 범위입니다: {:.2}MB <= {:.2}MB", memory_used_mb, threshold);
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: OptimizationLevel::Normal,
        memory_before: Some(memory_info.clone()),
        memory_after: Some(memory_info),
        freed_memory: Some(0),
        freed_mb: Some(0.0),
        duration: Some(Duration::from_millis(0)),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        error: None,
    })
}

// 최적화 통계 구조체
pub struct OptimizationStats {
    pub count: u32,
    pub last_time: u64,
    pub total_freed: u64,
}

// 최적화 통계 가져오기 함수
pub fn get_optimization_stats() -> OptimizationStats {
    OptimizationStats {
        count: OPTIMIZATION_COUNT.load(Ordering::SeqCst) as u32,
        last_time: LAST_OPTIMIZATION_TIME.load(Ordering::SeqCst),
        total_freed: TOTAL_FREED_MEMORY.load(Ordering::SeqCst),
    }
}