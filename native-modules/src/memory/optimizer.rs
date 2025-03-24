use napi::Error;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};
use crate::memory::types::{OptimizationLevel, OptimizationResult};
use crate::memory::analyzer;
use crate::memory::gc;

// 최적화 시간 추적
static LAST_OPTIMIZATION_TIME: AtomicU64 = AtomicU64::new(0);

/// 마지막 최적화 수행 시간 반환
pub fn get_last_optimization_time() -> u64 {
    LAST_OPTIMIZATION_TIME.load(Ordering::SeqCst)
}

/// 메모리 최적화 수행 - 비동기 구현
/// 
/// 최적화 레벨에 따라 다양한 최적화 작업 수행
/// emergency가 true인 경우 더 적극적인 최적화 수행
pub async fn perform_memory_optimization(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    // 현재 시간 기록
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    
    // 최적화 전 메모리 상태 확인
    let memory_before = analyzer::get_process_memory_info()?;
    
    // 최적화 수준에 따른 처리
    match level {
        OptimizationLevel::Normal => {
            // 가벼운 최적화만 수행
            perform_light_optimization().await?;
        },
        OptimizationLevel::Low => {
            // 가벼운 최적화 + 추가 작업
            perform_light_optimization().await?;
            perform_low_optimization().await?;
        },
        OptimizationLevel::Medium => {
            // 중간 수준 최적화
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
        },
        OptimizationLevel::High | OptimizationLevel::Critical => {
            // 높은 수준의 최적화 (모든 단계 포함)
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            perform_high_optimization().await?;
            
            // 긴급 상황이거나 Critical 레벨인 경우 강제 GC 수행
            if emergency || level == OptimizationLevel::Critical {
                gc::force_garbage_collection()?;
                perform_emergency_recovery().await?;
            }
        }
    }
    
    // 최적화 후 메모리 상태 확인 (GC가 작동할 시간 제공)
    sleep(Duration::from_millis(100)).await;
    let memory_after = analyzer::get_process_memory_info()?;
    
    // 해제된 메모리 계산
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    let freed_mb_f64 = freed_memory as f64 / (1024.0 * 1024.0);
    let freed_mb = freed_mb_f64 as u64; // f64에서 u64로 변환
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: level,
        memory_before: Some(memory_before),
        memory_after: Some(memory_after),
        freed_memory: Some(freed_memory),
        freed_mb: Some(freed_mb), // u64 타입으로 전달
        duration: Some(SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64 - now),
        timestamp: now,
        error: None,
    })
}

/// 동기 메모리 최적화 수행
/// JS에서 async/await 없이도 호출 가능한 버전
pub fn perform_memory_optimization_sync(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    // 현재 시간 기록
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    
    // 최적화 전 메모리 상태 확인
    let memory_before = analyzer::get_process_memory_info()?;
    
    // 최적화 단계별 수행 (동기 버전)
    match level {
        OptimizationLevel::Normal => {
            // 기본 최적화 (캐시 정리 등)
            gc::perform_basic_gc()?;
        },
        OptimizationLevel::Low => {
            // 낮은 수준 최적화
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
        },
        OptimizationLevel::Medium => {
            // 중간 수준 최적화
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
        },
        OptimizationLevel::High => {
            // 높은 수준 최적화
            gc::perform_aggressive_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
            release_backend_resources()?;
        },
        OptimizationLevel::Critical => {
            // 최고 수준 최적화 (긴급)
            gc::perform_emergency_gc()?;
            clean_unused_resources()?;
            release_all_non_essential_resources()?;
            
            if emergency {
                gc::force_garbage_collection()?;
            }
        }
    }
    
    // 최적화 후 메모리 상태 확인
    std::thread::sleep(std::time::Duration::from_millis(100));
    let memory_after = analyzer::get_process_memory_info()?;
    
    // 해제된 메모리 계산
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    let freed_mb_f64 = freed_memory as f64 / (1024.0 * 1024.0);
    let freed_mb = freed_mb_f64 as u64; // f64에서 u64로 변환
    
    Ok(OptimizationResult {
        success: true,
        optimization_level: level,
        memory_before: Some(memory_before),
        memory_after: Some(memory_after),
        freed_memory: Some(freed_memory),
        freed_mb: Some(freed_mb), // u64 타입으로 전달
        duration: Some(SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64 - now),
        timestamp: now,
        error: None,
    })
}

// 경량 최적화 (비활성 캐시 정리)
async fn perform_light_optimization() -> Result<(), Error> {
    // 비활성 캐시 정리
    gc::clean_inactive_caches()?;
    Ok(())
}

// 낮은 수준의 최적화
async fn perform_low_optimization() -> Result<(), Error> {
    // 임시 리소스 정리
    clean_unused_resources()?;
    sleep(Duration::from_millis(10)).await;
    Ok(())
}

// 중간 수준의 최적화
async fn perform_medium_optimization() -> Result<(), Error> {
    // 미사용 버퍼 해제
    release_unused_buffers()?;
    sleep(Duration::from_millis(20)).await;
    Ok(())
}

// 높은 수준의 최적화
async fn perform_high_optimization() -> Result<(), Error> {
    // 백엔드 리소스 정리
    release_backend_resources()?;
    sleep(Duration::from_millis(30)).await;
    Ok(())
}

// 긴급 복구 모드
async fn perform_emergency_recovery() -> Result<(), Error> {
    // 모든 비필수 리소스 해제
    release_all_non_essential_resources()?;
    sleep(Duration::from_millis(50)).await;
    Ok(())
}

// 이하 최적화 유틸리티 함수들

/// 사용하지 않는 리소스 정리
pub fn clean_unused_resources() -> Result<bool, Error> {
    // 실제 구현에서는 애플리케이션 특성에 맞게 구현
    log::info!("불필요한 리소스 정리 중...");
    Ok(true)
}

/// 미사용 버퍼 해제
pub fn release_unused_buffers() -> Result<bool, Error> {
    // 실제 구현에서는 메모리 풀 및 캐시 시스템과 연동
    log::info!("미사용 버퍼 해제 중...");
    Ok(true)
}

/// 백엔드 리소스 정리
pub fn release_backend_resources() -> Result<bool, Error> {
    // 실제 구현에서는 GPU 리소스 및 네트워크 연결 등 정리
    log::info!("백엔드 리소스 정리 중...");
    Ok(true)
}

/// 모든 비필수 리소스 해제
pub fn release_all_non_essential_resources() -> Result<bool, Error> {
    // 실제 구현에서는 앱 상태를 최소한으로 유지하며 대부분의 리소스 해제
    log::info!("모든 비필수 리소스 해제 중...");
    
    clean_unused_resources()?;
    release_unused_buffers()?;
    release_backend_resources()?;
    gc::clean_all_caches()?;
    
    Ok(true)
}

/// 메모리 사용량 체크 및 자동 최적화
pub async fn auto_optimize_memory_if_needed() -> Result<OptimizationResult, Error> {
    // 현재 메모리 사용량 확인
    let memory_info = analyzer::get_process_memory_info()?;
    
    // 최적화 레벨 결정
    let opt_level = if memory_info.percent_used > 90.0 {
        OptimizationLevel::Critical
    } else if memory_info.percent_used > 80.0 {
        OptimizationLevel::High
    } else if memory_info.percent_used > 70.0 {
        OptimizationLevel::Medium
    } else if memory_info.percent_used > 50.0 {
        OptimizationLevel::Low
    } else {
        OptimizationLevel::Normal
    };
    
    // 임계값 초과 시 최적화 수행
    if opt_level != OptimizationLevel::Normal {
        let emergency = opt_level == OptimizationLevel::Critical;
        return perform_memory_optimization(opt_level, emergency).await;
    }
    
    // 최적화가 필요하지 않은 경우
    Ok(OptimizationResult {
        success: true,
        optimization_level: OptimizationLevel::Normal,
        memory_before: Some(memory_info.clone()),
        memory_after: Some(memory_info),
        freed_memory: Some(0),
        freed_mb: Some(0), // 0.0에서 0으로 변경
        duration: Some(0),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        error: None,
    })
}
