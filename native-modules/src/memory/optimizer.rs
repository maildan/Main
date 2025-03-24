use napi::Error;
// 로깅 매크로 import 추가 (error 포함)
use log::{debug, info, warn, error};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};
use crate::memory::types::{OptimizationLevel, OptimizationResult, MemoryInfo};
use crate::memory::analyzer;
use crate::memory::gc;
use crate::memory::pool;
use crate::memory::settings;
// GPU 모듈 올바르게 import
use crate::gpu::{self, context};
// 이전에 중복 선언된 함수 대신 사용할 함수들 import
use crate::gpu::{
    cleanup_unused_gpu_resources,
    clear_shader_caches,
    release_all_gpu_resources
};

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
    // 사용자 설정 먼저 확인 (하드웨어 가속 비활성화된 경우 무조건 false)
    if !settings::is_hardware_acceleration_enabled() {
        return false;
    }
    
    // 그 다음 실제 GPU 가용성 확인
    crate::gpu::is_gpu_acceleration_available()
}

pub fn optimize_gpu_resources() -> Result<bool, Error> {
    // 사용자 설정 및 실제 GPU 상태 확인
    if is_gpu_acceleration_enabled() {
        debug!("GPU 리소스 최적화 수행 중...");
        match cleanup_unused_gpu_resources() {
            Ok(_) => {
                debug!("GPU 리소스 최적화 완료");
                return Ok(true);
            },
            Err(e) => {
                warn!("GPU 리소스 최적화 실패: {}", e);
                return Err(e);
            }
        }
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
            gpu::disable_gpu_acceleration()?;
        }
        return Ok(());
    }

    // GPU 집약적 모드일 경우 메모리 상태가 심각하지 않으면 GPU 유지
    if processing_mode == "gpu-intensive" {
        if memory_info.percent_used > 90.0 {
            debug!("GPU 집약적 모드이지만 메모리 사용량이 매우 높음: GPU 가속화 임시 비활성화");
            gpu::disable_gpu_acceleration()?;
        } else if !context::is_gpu_initialized() && context::check_gpu_availability() {
            debug!("GPU 집약적 모드: GPU 가속화 활성화");
            gpu::enable_gpu_acceleration()?;
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
            if let Err(e) = gpu::disable_gpu_acceleration() {
                warn!("GPU 가속화 비활성화 실패: {}", e);
                // 경고만 발생시키고 계속 진행
            }
            debug!("GPU 컨텍스트 이미 초기화됨, 가속화 비활성화");
        }
    } else if memory_info.percent_used < 70.0 {
        // 메모리 사용량이 적당할 때 GPU 가속화 활성화
        debug!("메모리 사용량이 적정하여 GPU 가속화 활성화 가능 ({:.1}%)",
               memory_info.percent_used);
        
        // GPU 가속화 상태를 변경하는 다른 함수 호출
        if !context::is_gpu_initialized() && context::check_gpu_availability() {
            debug!("GPU 가속화 활성화 시도");
            // gpu 모듈 함수로 변경
            if let Err(e) = gpu::enable_gpu_acceleration() {
                warn!("GPU 가속화 활성화 실패: {}", e);
                // 경고만 발생시키고 계속 진행
            }
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
                if let Err(e) = clear_shader_caches() {
                    warn!("셰이더 캐시 정리 실패: {}", e);
                }
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
                if let Err(e) = gpu::disable_gpu_acceleration() {
                    warn!("GPU 가속화 비활성화 실패: {}", e);
                }
            }
            
            if emergency {
                warn!("긴급 메모리 복구 모드 활성화!");
                perform_emergency_recovery().await?;
            }
        }
    }
    
    sleep(Duration::from_millis(100)).await;
    
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
    
    TOTAL_FREED_MEMORY.fetch_add(freed_memory, Ordering::SeqCst);
    
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
        freed_memory: Some(freed_memory),
        freed_mb: Some(freed_mb as u64),
        duration: Some(duration),
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
                if let Err(e) = clear_shader_caches() {
                    warn!("셰이더 캐시 정리 실패: {}", e);
                }
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
                if let Err(e) = gpu::disable_gpu_acceleration() {
                    warn!("GPU 가속화 비활성화 실패: {}", e);
                }
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
            match gpu::enable_gpu_acceleration() {
                Ok(_) => debug!("GPU 가속화 재활성화 성공"),
                Err(e) => warn!("GPU 가속화 재활성화 실패: {}", e)
            }
        }
    }
    
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    TOTAL_FREED_MEMORY.fetch_add(freed_memory, Ordering::SeqCst);
    
    let freed_mb = freed_memory / (1024 * 1024);
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64 - now;
    
    debug!("최적화 완료: {:.2}MB 해제됨, 소요 시간: {}ms", 
        freed_memory as f64 / (1024.0 * 1024.0), duration);
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: level,
        memory_before: Some(memory_before),
        memory_after: Some(memory_after),
        freed_memory: Some(freed_memory),
        freed_mb: Some(freed_mb as u64),
        duration: Some(duration),
        timestamp: now,
        error: None,
    })
}

async fn perform_light_optimization() -> Result<(), Error> {
    debug!("경량 최적화 수행 중...");
    
    gc::clean_inactive_caches()?;
    pool::cleanup_inactive_pools()?;
    
    sleep(Duration::from_millis(10)).await;
    
    Ok(())
}

async fn perform_low_optimization() -> Result<(), Error> {
    debug!("낮은 수준 최적화 수행 중...");
    
    clean_unused_resources()?;
    gc::clean_low_priority_caches()?;
    
    sleep(Duration::from_millis(20)).await;
    
    Ok(())
}

async fn perform_medium_optimization() -> Result<(), Error> {
    debug!("중간 수준 최적화 수행 중...");
    
    release_unused_buffers()?;
    pool::optimize_memory_pools()?;
    
    sleep(Duration::from_millis(30)).await;
    
    Ok(())
}

async fn perform_high_optimization() -> Result<(), Error> {
    debug!("높은 수준 최적화 수행 중...");
    
    release_backend_resources()?;
    gc::clean_all_caches()?;
    pool::compact_memory_pools()?;
    
    sleep(Duration::from_millis(30)).await;
    
    Ok(())
}

async fn perform_emergency_recovery() -> Result<(), Error> {
    warn!("긴급 복구 모드 활성화!");
    
    release_all_non_essential_resources()?;
    pool::reset_memory_pools()?;
    
    if is_gpu_acceleration_enabled() {
        debug!("GPU 리소스 완전 정리");
        if let Err(e) = release_all_gpu_resources() {
            warn!("GPU 리소스 정리 실패: {}", e);
        }
    }
    
    force_temporary_memory_release();
    
    sleep(Duration::from_millis(50)).await;
    
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
        if let Err(e) = release_all_gpu_resources() {
            warn!("GPU 리소스 해제 실패: {}", e);
        }
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
            freed_mb: Some(0),
            duration: Some(0),
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
        freed_mb: Some(0),
        duration: Some(0),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        error: None,
    })
}