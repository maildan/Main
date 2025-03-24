use napi::Error;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};
use log::{info, debug, warn, error};
use crate::memory::types::{OptimizationLevel, OptimizationResult};
use crate::memory::analyzer;
use crate::memory::gc;
use crate::memory::pool;

// 최적화 이력 관리
static LAST_OPTIMIZATION_TIME: AtomicU64 = AtomicU64::new(0);
static OPTIMIZATION_COUNT: AtomicU64 = AtomicU64::new(0);
static TOTAL_FREED_MEMORY: AtomicU64 = AtomicU64::new(0);

/// 마지막 최적화 수행 시간 반환
pub fn get_last_optimization_time() -> u64 {
    LAST_OPTIMIZATION_TIME.load(Ordering::SeqCst)
}

/// 메모리 최적화 수행 - 비동기 구현
/// 
/// 지정된 최적화 레벨에 따라 필요한 메모리 최적화 작업을 수행합니다.
/// 긴급 모드에서는 더 적극적인 최적화가 진행됩니다.
pub async fn perform_memory_optimization(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    info!("비동기 메모리 최적화 시작: 레벨 {:?}, 긴급 모드: {}", level, emergency);
    
    // 현재 타임스탬프 기록
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // 최적화 카운터 업데이트
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    OPTIMIZATION_COUNT.fetch_add(1, Ordering::SeqCst);
    
    // 최적화 전 메모리 상태 확인
    let memory_before = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory: {}", e)));
        }
    };
    
    debug!("최적화 전 메모리 상태: {:.2}MB 사용 중 ({:.1}%)", 
        memory_before.heap_used_mb, memory_before.percent_used);
    
    // 최적화 단계 실행 - 단계적으로 수행
    match level {
        OptimizationLevel::Normal => {
            debug!("기본 최적화 수행 중...");
            perform_light_optimization().await?;
        },
        OptimizationLevel::Low => {
            debug!("낮은 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
        },
        OptimizationLevel::Medium => {
            debug!("중간 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
        },
        OptimizationLevel::High => {
            debug!("높은 수준 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            perform_high_optimization().await?;
        },
        OptimizationLevel::Critical => {
            info!("긴급 최적화 수행 중...");
            perform_light_optimization().await?;
            perform_low_optimization().await?;
            perform_medium_optimization().await?;
            perform_high_optimization().await?;
            
            // 긴급 상황: 강제 GC 수행
            gc::force_garbage_collection()?;
            
            if emergency {
                warn!("긴급 메모리 복구 모드 활성화!");
                perform_emergency_recovery().await?;
            }
        }
    }
    
    // 최적화 후 메모리 상태 확인 (GC가 작동할 시간 제공)
    sleep(Duration::from_millis(100)).await;
    
    let memory_after = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("최적화 후 메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory after optimization: {}", e)));
        }
    };
    
    // 해제된 메모리 계산
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    // 글로벌 카운터 업데이트
    TOTAL_FREED_MEMORY.fetch_add(freed_memory, Ordering::SeqCst);
    
    // 결과 생성
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
        freed_mb: Some(freed_mb),
        duration: Some(duration),
        timestamp: now,
        error: None,
    })
}

/// 동기 메모리 최적화 수행
/// 
/// JS 런타임에서 비동기가 지원되지 않을 때 사용되는 동기 버전입니다.
pub fn perform_memory_optimization_sync(
    level: OptimizationLevel,
    emergency: bool
) -> Result<OptimizationResult, Error> {
    info!("동기 메모리 최적화 시작: 레벨 {:?}, 긴급 모드: {}", level, emergency);
    
    // 현재 타임스탬프 기록
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // 최적화 카운터 업데이트
    LAST_OPTIMIZATION_TIME.store(now, Ordering::SeqCst);
    OPTIMIZATION_COUNT.fetch_add(1, Ordering::SeqCst);
    
    // 최적화 전 메모리 상태 확인
    let memory_before = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory: {}", e)));
        }
    };
    
    debug!("최적화 전 메모리 상태: {:.2}MB 사용 중 ({:.1}%)", 
        memory_before.heap_used_mb, memory_before.percent_used);
    
    // 동기 최적화 단계 실행
    match level {
        OptimizationLevel::Normal => {
            debug!("기본 최적화 수행 중...");
            gc::perform_basic_gc()?;
        },
        OptimizationLevel::Low => {
            debug!("낮은 수준 최적화 수행 중...");
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
        },
        OptimizationLevel::Medium => {
            debug!("중간 수준 최적화 수행 중...");
            gc::perform_basic_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
            pool::reclaim_idle_objects()?;
        },
        OptimizationLevel::High => {
            debug!("높은 수준 최적화 수행 중...");
            gc::perform_aggressive_gc()?;
            clean_unused_resources()?;
            release_unused_buffers()?;
            release_backend_resources()?;
            pool::reclaim_all_available_objects()?;
        },
        OptimizationLevel::Critical => {
            info!("긴급 최적화 수행 중...");
            gc::perform_emergency_gc()?;
            clean_unused_resources()?;
            release_all_non_essential_resources()?;
            pool::reclaim_all_objects()?;
            
            if emergency {
                warn!("긴급 메모리 복구 모드 활성화!");
                gc::force_garbage_collection()?;
            }
        }
    }
    
    // 최적화 후 메모리 상태 확인
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    let memory_after = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("최적화 후 메모리 상태 분석 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to analyze memory after optimization: {}", e)));
        }
    };
    
    // 해제된 메모리 계산
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used
    } else {
        0
    };
    
    // 글로벌 카운터 업데이트
    TOTAL_FREED_MEMORY.fetch_add(freed_memory, Ordering::SeqCst);
    
    // 결과 생성
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
        freed_mb: Some(freed_mb),
        duration: Some(duration),
        timestamp: now,
        error: None,
    })
}

// =================== 최적화 전략 구현 ===================

/// 경량 최적화 - 비활성 캐시 정리, 초기 메모리 정리
async fn perform_light_optimization() -> Result<(), Error> {
    debug!("경량 최적화 수행 중...");
    
    // 비활성 캐시 정리
    gc::clean_inactive_caches()?;
    
    // 객체 풀 정리
    pool::cleanup_inactive_pools()?;
    
    // 비동기 처리를 위한 짧은 지연
    sleep(Duration::from_millis(10)).await;
    
    Ok(())
}

/// 낮은 수준 최적화 - 미사용 리소스 정리
async fn perform_low_optimization() -> Result<(), Error> {
    debug!("낮은 수준 최적화 수행 중...");
    
    // 미사용 리소스 정리
    clean_unused_resources()?;
    
    // 우선순위가 낮은 캐시 정리
    gc::clean_low_priority_caches()?;
    
    // 비동기 처리를 위한 짧은 지연
    sleep(Duration::from_millis(20)).await;
    
    Ok(())
}

/// 중간 수준 최적화 - 버퍼 해제 및 적극적 캐시 관리
async fn perform_medium_optimization() -> Result<(), Error> {
    debug!("중간 수준 최적화 수행 중...");
    
    // 미사용 버퍼 해제
    release_unused_buffers()?;
    
    // 객체 풀 최적화
    pool::optimize_memory_pools()?;
    
    // 비동기 처리를 위한 짧은 지연
    sleep(Duration::from_millis(30)).await;
    
    Ok(())
}

/// 높은 수준 최적화 - 백엔드 리소스 정리 및 메모리 회수
async fn perform_high_optimization() -> Result<(), Error> {
    debug!("높은 수준 최적화 수행 중...");
    
    // 백엔드 리소스 정리
    release_backend_resources()?;
    
    // 모든 캐시 정리
    gc::clean_all_caches()?;
    
    // 객체 풀 압축
    pool::compact_memory_pools()?;
    
    // 비동기 처리를 위한 짧은 지연
    sleep(Duration::from_millis(30)).await;
    
    Ok(())
}

/// 긴급 복구 모드 - 모든 비필수 리소스 해제 및 최대 메모리 회수
async fn perform_emergency_recovery() -> Result<(), Error> {
    warn!("긴급 복구 모드 활성화!");
    
    // 모든 비필수 리소스 해제
    release_all_non_essential_resources()?;
    
    // 메모리 풀 초기화
    pool::reset_memory_pools()?;
    
    // 임시 메모리 직접 해제 (강제 GC 유도)
    force_temporary_memory_release();
    
    // 추가 대기 시간
    sleep(Duration::from_millis(50)).await;
    
    Ok(())
}

// =================== 리소스 관리 유틸리티 함수 ===================

/// 사용하지 않는 리소스 정리
pub fn clean_unused_resources() -> Result<bool, Error> {
    debug!("사용하지 않는 리소스 정리 중...");
    
    // DOM 참조 정리, 비활성 이벤트 리스너 제거 등
    // (실제 구현에서는 애플리케이션 특성에 맞게 구현)
    Ok(true)
}

/// 미사용 버퍼 해제
pub fn release_unused_buffers() -> Result<bool, Error> {
    debug!("미사용 버퍼 해제 중...");
    
    // 캐시된 버퍼 해제
    // (실제 구현에서는 메모리 풀 및 캐시 시스템과 연동)
    Ok(true)
}

/// 백엔드 리소스 정리
pub fn release_backend_resources() -> Result<bool, Error> {
    debug!("백엔드 리소스 정리 중...");
    
    // GPU 리소스, 네트워크 연결 등 정리
    // (실제 구현에서는 구체적인 백엔드 리소스 관리 로직 구현)
    Ok(true)
}

/// 모든 비필수 리소스 해제
pub fn release_all_non_essential_resources() -> Result<bool, Error> {
    warn!("모든 비필수 리소스 해제 중...");
    
    // 앱 상태를 최소한으로 유지하며 대부분의 리소스 해제
    clean_unused_resources()?;
    release_unused_buffers()?;
    release_backend_resources()?;
    gc::clean_all_caches()?;
    
    Ok(true)
}

/// 임시 메모리 직접 해제 (GC 유도)
fn force_temporary_memory_release() {
    // 대용량 임시 배열 할당 후 즉시 해제하여 GC 유도
    let size = 50 * 1024 * 1024; // 50MB
    let _buffer = vec![0u8; size];
    drop(_buffer);
    
    debug!("임시 메모리 할당/해제 완료 (GC 유도)");
}

/// 메모리 사용량 체크 및 자동 최적화
pub async fn auto_optimize_memory_if_needed() -> Result<OptimizationResult, Error> {
    debug!("자동 메모리 최적화 검사 중...");
    
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
        
        info!("자동 메모리 최적화 실행 (레벨: {:?}, 긴급 모드: {})", opt_level, emergency);
        return perform_memory_optimization(opt_level, emergency).await;
    }
    
    debug!("현재 자동 최적화 불필요 (메모리 사용률: {:.1}%)", memory_info.percent_used);
    
    // 최적화가 필요하지 않은 경우
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
