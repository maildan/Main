use napi::Error;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use log::{debug, warn, error}; // info 제거함
use serde_json::json;
use crate::memory::analyzer;
use crate::memory::settings;

// 메트릭 수집용 카운터
static GC_INVOCATIONS: AtomicU64 = AtomicU64::new(0);
static LAST_GC_TIME: AtomicU64 = AtomicU64::new(0);
static TOTAL_MEMORY_FREED: AtomicU64 = AtomicU64::new(0);

// 최소 GC 간격 (ms)
const MIN_GC_INTERVAL: u64 = 5000;

/// 전체 가비지 컬렉션 강제 실행
/// 
/// 이 함수는 가비지 컬렉션을 강제로 실행하고 메모리 해제를 시도합니다.
pub fn force_garbage_collection() -> Result<String, Error> {
    // 호출 간 최소 간격 확인 (너무 자주 호출되지 않도록)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    let last_gc = LAST_GC_TIME.load(Ordering::SeqCst);
    
    // 마지막 GC 이후 최소 간격을 유지 (과도한 GC 방지)
    if now - last_gc < MIN_GC_INTERVAL {
        debug!("GC 요청 무시: 마지막 GC 이후 충분한 시간이 경과하지 않음 ({}ms < {}ms)", 
               now - last_gc, MIN_GC_INTERVAL);
        
        // 최소 간격을 유지하지 못한 경우에도 실패로 처리하지 않고, 성공으로 처리하되 freed_memory를 0으로 설정
        let result = json!({
            "success": true,
            "timestamp": now,
            "freed_memory": 0,
            "freed_mb": 0,
            "throttled": true,
            "message": "GC 간격 제한으로 인해 실행 생략"
        });
        
        return Ok(result.to_string());
    }
    
    // GC 호출 횟수 증가
    GC_INVOCATIONS.fetch_add(1, Ordering::SeqCst);
    LAST_GC_TIME.store(now, Ordering::SeqCst);
    
    // GC 전 메모리 정보 가져오기
    let memory_before = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("GC 전 메모리 정보 가져오기 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to get memory info before GC: {}", e)));
        }
    };
    
    debug!("가비지 컬렉션 수행 중... 현재 메모리: {:.2}MB", memory_before.heap_used_mb);
    
    // 메모리 압박 생성하여 GC 유도
    let start_time = std::time::Instant::now();
    perform_forced_memory_pressure()?;
    
    // 설정에 따라 적극적인 GC 수행 여부 결정
    if settings::is_aggressive_gc_enabled() {
        // 좀 더 적극적인 메모리 압박 (2회)
        perform_forced_memory_pressure()?;
        perform_forced_memory_pressure()?;
    }
    
    // GC 후 메모리 정보 가져오기
    let memory_after = match analyzer::get_process_memory_info() {
        Ok(info) => info,
        Err(e) => {
            error!("GC 후 메모리 정보 가져오기 실패: {}", e);
            return Err(Error::from_reason(format!("Failed to get memory info after GC: {}", e)));
        }
    };
    
    // 해제된 메모리 계산 
    let freed_memory = if memory_before.heap_used > memory_after.heap_used {
        memory_before.heap_used - memory_after.heap_used 
    } else {
        0
    };
    
    // 총 해제된 메모리 누적
    TOTAL_MEMORY_FREED.fetch_add(freed_memory, Ordering::SeqCst);
    
    // MB 단위로 변환
    let freed_mb = (freed_memory as f64) / (1024.0 * 1024.0);
    
    // 경과 시간 계산
    let elapsed = start_time.elapsed().as_millis() as u64;
    
    debug!("가비지 컬렉션 완료: {:.2}MB 해제됨, 소요 시간: {}ms", freed_mb, elapsed);
    
    // 결과 생성 및 반환
    let result = json!({
        "success": true,
        "timestamp": now,
        "freed_memory": freed_memory,
        "freed_mb": freed_mb,
        "duration": elapsed
    });
    
    Ok(result.to_string())
}

/// 메모리 압박을 생성하여 GC 유도
fn perform_forced_memory_pressure() -> Result<(), Error> {
    // 임시 대량 메모리 할당 (GC 유도)
    let allocation_size = 10 * 1024 * 1024; // 10MB
    
    // 안전한 메모리 할당을 위한 벡터 크기 제한
    let max_allocation = std::cmp::min(allocation_size, 100 * 1024 * 1024); // 최대 100MB로 제한
    
    debug!("GC 유도를 위한 임시 메모리 할당: {}MB", max_allocation / (1024 * 1024));
    
    // 여러 작은 할당으로 나누어 수행 (더 효과적인 GC 유도)
    for _ in 0..5 {
        let allocation_chunk = max_allocation / 5;
        let _buffer = vec![0u8; allocation_chunk];
        // 할당된 메모리를 즉시 해제하는 대신, 잠시 유지 후 해제
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    
    Ok(())
}

/// 기본 가비지 컬렉션 수행
/// 
/// 이 함수는 더 가벼운 방식으로 GC를 수행합니다.
pub fn perform_basic_gc() -> Result<(), Error> {
    debug!("기본 GC 수행");
    
    // 간단한 메모리 압박 생성
    perform_forced_memory_pressure()?;
    
    Ok(())
}

/// 적극적인 가비지 컬렉션 수행
/// 
/// 이 함수는 더 적극적인 방식으로 GC를 수행합니다.
pub fn perform_aggressive_gc() -> Result<(), Error> {
    debug!("적극적인 GC 수행");
    
    // 여러 번의 메모리 압박 생성
    perform_forced_memory_pressure()?;
    std::thread::sleep(std::time::Duration::from_millis(20));
    perform_forced_memory_pressure()?;
    
    Ok(())
}

/// 긴급 가비지 컬렉션 수행
/// 
/// 메모리 부족 상황에서 긴급하게 GC를 수행합니다.
pub fn perform_emergency_gc() -> Result<(), Error> {
    warn!("긴급 GC 수행");
    
    // 가장 적극적인 메모리 압박 생성
    for _ in 0..3 {
        perform_forced_memory_pressure()?;
        std::thread::sleep(std::time::Duration::from_millis(30));
    }
    
    Ok(())
}

/// 비활성 캐시 정리
pub fn clean_inactive_caches() -> Result<(), Error> {
    debug!("비활성 캐시 정리");
    
    // 구현은 다른 Rust 모듈이 담당
    
    Ok(())
}

/// 우선순위가 낮은 캐시 정리
pub fn clean_low_priority_caches() -> Result<(), Error> {
    debug!("우선순위가 낮은 캐시 정리");
    
    // 구현은 다른 Rust 모듈이 담당
    
    Ok(())
}

/// 모든 캐시 정리
pub fn clean_all_caches() -> Result<(), Error> {
    debug!("모든 캐시 정리");
    
    // 구현은 다른 Rust 모듈이 담당
    
    Ok(())
}

/// GC 통계 가져오기
pub fn get_gc_statistics() -> Result<String, Error> {
    let invocations = GC_INVOCATIONS.load(Ordering::SeqCst);
    let last_gc = LAST_GC_TIME.load(Ordering::SeqCst);
    let total_freed = TOTAL_MEMORY_FREED.load(Ordering::SeqCst);
    
    let result = json!({
        "invocations": invocations,
        "last_gc_time": last_gc,
        "total_memory_freed": total_freed,
        "total_memory_freed_mb": (total_freed as f64) / (1024.0 * 1024.0),
        "timestamp": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    });
    
    Ok(result.to_string())
}

/// 가비지 컬렉션 간 최소 간격 확인
pub fn can_perform_gc() -> bool {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    let last_gc = LAST_GC_TIME.load(Ordering::SeqCst);
    
    now - last_gc >= MIN_GC_INTERVAL
}

/// 마지막 GC 시간 가져오기
pub fn get_last_gc_time() -> u64 {
    LAST_GC_TIME.load(Ordering::SeqCst)
}
