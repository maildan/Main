use napi::Error;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use std::time::{SystemTime, UNIX_EPOCH};
use log::{info, debug, warn};
use crate::memory::types::{MemoryPoolStats, PoolDetail};

// 메모리 풀 크기 상수 (바이트) - 더 세분화된 버퍼 크기
const TINY_BUFFER_SIZE: usize = 1 * 1024;       // 1KB
const EXTRA_SMALL_BUFFER_SIZE: usize = 4 * 1024;    // 4KB
const SMALL_BUFFER_SIZE: usize = 16 * 1024;     // 16KB
const MEDIUM_SMALL_BUFFER_SIZE: usize = 32 * 1024;  // 32KB
const MEDIUM_BUFFER_SIZE: usize = 64 * 1024;    // 64KB
const MEDIUM_LARGE_BUFFER_SIZE: usize = 128 * 1024; // 128KB
const LARGE_BUFFER_SIZE: usize = 256 * 1024;    // 256KB
const EXTRA_LARGE_BUFFER_SIZE: usize = 1024 * 1024; // 1MB
const HUGE_BUFFER_SIZE: usize = 4 * 1024 * 1024;    // 4MB

// 풀 크기 설정 (각 풀당 최대 객체 수)
const MAX_TINY_POOL_SIZE: usize = 500;          // 많이 필요한 작은 버퍼
const MAX_EXTRA_SMALL_POOL_SIZE: usize = 200;
const MAX_SMALL_POOL_SIZE: usize = 100;
const MAX_MEDIUM_SMALL_POOL_SIZE: usize = 75;
const MAX_MEDIUM_POOL_SIZE: usize = 50;
const MAX_MEDIUM_LARGE_POOL_SIZE: usize = 30;
const MAX_LARGE_POOL_SIZE: usize = 20;
const MAX_EXTRA_LARGE_POOL_SIZE: usize = 10;
const MAX_HUGE_POOL_SIZE: usize = 5;            // 적게 필요한 큰 버퍼

/// 메모리 풀 아이템 (재사용 가능한 버퍼)
struct PoolItem {
    buffer: Vec<u8>,
    last_used: u64,
    times_used: u32,
}

/// 메모리 풀 구조
struct MemoryPool {
    name: String,
    item_size: usize,
    available_items: Vec<PoolItem>,
    total_allocated: AtomicU64,
    total_freed: AtomicU64,
    reuse_count: AtomicU64,
    max_items: usize,
    active_count: AtomicU64,
}

impl MemoryPool {
    fn new(name: &str, item_size: usize, max_items: usize) -> Self {
        Self {
            name: name.to_string(),
            item_size,
            available_items: Vec::with_capacity(max_items),
            total_allocated: AtomicU64::new(0),
            total_freed: AtomicU64::new(0),
            reuse_count: AtomicU64::new(0),
            max_items,
            active_count: AtomicU64::new(0),
        }
    }
    
    // 버퍼 획득
    fn acquire_buffer(&mut self) -> Vec<u8> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        // 재사용 가능한 버퍼가 있으면 반환
        if let Some(mut item) = self.available_items.pop() {
            self.reuse_count.fetch_add(1, Ordering::Relaxed);
            self.active_count.fetch_add(1, Ordering::Relaxed);
            
            item.last_used = now;
            item.times_used += 1;
            
            // 버퍼 내용 초기화 (보안/버그 방지)
            item.buffer.fill(0);
            return item.buffer;
        }
        
        // 새 버퍼 할당
        self.total_allocated.fetch_add(self.item_size as u64, Ordering::Relaxed);
        self.active_count.fetch_add(1, Ordering::Relaxed);
        
        let mut buffer = Vec::with_capacity(self.item_size);
        buffer.resize(self.item_size, 0);
        buffer
    }
    
    // 버퍼 반환
    fn release_buffer(&mut self, mut buffer: Vec<u8>) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        // 풀이 가득 찼으면 버퍼 버림
        if self.available_items.len() >= self.max_items {
            self.total_freed.fetch_add(buffer.capacity() as u64, Ordering::Relaxed);
            self.active_count.fetch_sub(1, Ordering::Relaxed);
            return;
        }
        
        // 버퍼 초기화 및 풀에 반환
        buffer.clear();
        
        // 용량이 맞지 않으면 재조정
        if buffer.capacity() != self.item_size {
            buffer.shrink_to_fit();
            buffer.reserve_exact(self.item_size);
        }
        
        self.available_items.push(PoolItem {
            buffer,
            last_used: now,
            times_used: 1,
        });
        
        self.active_count.fetch_sub(1, Ordering::Relaxed);
    }
    
    // 오래된 버퍼 정리
    fn cleanup_old_buffers(&mut self, max_age_ms: u64) -> usize {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        let initial_len = self.available_items.len();
        
        // 오래된 항목 필터링
        self.available_items.retain(|item| {
            let age = now.saturating_sub(item.last_used);
            age <= max_age_ms
        });
        
        let removed = initial_len - self.available_items.len();
        if removed > 0 {
            self.total_freed.fetch_add((removed * self.item_size) as u64, Ordering::Relaxed);
        }
        
        removed
    }
    
    // 풀 통계 가져오기
    fn get_stats(&self) -> PoolDetail {
        PoolDetail {
            name: self.name.clone(),
            object_size: self.item_size as u64,
            active_objects: self.active_count.load(Ordering::Relaxed) as usize,
            available_objects: self.available_items.len(),
            allocations: self.total_allocated.load(Ordering::Relaxed) / self.item_size as u64,
        }
    }
}

// 글로벌 메모리 풀 관리자
static MEMORY_POOLS: Lazy<RwLock<HashMap<String, RwLock<MemoryPool>>>> = 
    Lazy::new(|| RwLock::new(HashMap::new()));

// 성능 측정 카운터
static POOL_ALLOCATIONS: AtomicU64 = AtomicU64::new(0);
static POOL_REUSES: AtomicU64 = AtomicU64::new(0);
static LAST_CLEANUP_TIME: AtomicU64 = AtomicU64::new(0);

/// 메모리 풀 초기화
pub fn initialize_memory_pools() -> Result<(), Error> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    info!("메모리 풀 초기화 시작");
    let mut pools = MEMORY_POOLS.write();
    
    // 이미 초기화되었으면 중복 초기화 방지
    if !pools.is_empty() {
        debug!("메모리 풀이 이미 초기화됨");
        return Ok(());
    }
    
    // 다양한 크기의 메모리 풀 생성 - 세분화된 크기
    let pool_configs = [
        ("tiny_buffer", TINY_BUFFER_SIZE, MAX_TINY_POOL_SIZE),
        ("extra_small_buffer", EXTRA_SMALL_BUFFER_SIZE, MAX_EXTRA_SMALL_POOL_SIZE),
        ("small_buffer", SMALL_BUFFER_SIZE, MAX_SMALL_POOL_SIZE),
        ("medium_small_buffer", MEDIUM_SMALL_BUFFER_SIZE, MAX_MEDIUM_SMALL_POOL_SIZE),
        ("medium_buffer", MEDIUM_BUFFER_SIZE, MAX_MEDIUM_POOL_SIZE),
        ("medium_large_buffer", MEDIUM_LARGE_BUFFER_SIZE, MAX_MEDIUM_LARGE_POOL_SIZE),
        ("large_buffer", LARGE_BUFFER_SIZE, MAX_LARGE_POOL_SIZE),
        ("extra_large_buffer", EXTRA_LARGE_BUFFER_SIZE, MAX_EXTRA_LARGE_POOL_SIZE),
        ("huge_buffer", HUGE_BUFFER_SIZE, MAX_HUGE_POOL_SIZE),
        // 특수 목적 버퍼
        ("str_buffer", 1024, 200),
        ("json_buffer", 16 * 1024, 30),
        ("xml_buffer", 32 * 1024, 20),
        ("blob_buffer", 128 * 1024, 10),
    ];
    
    for (name, size, max_items) in pool_configs.iter() {
        pools.insert(
            name.to_string(),
            RwLock::new(MemoryPool::new(name, *size, *max_items))
        );
    }
    
    LAST_CLEANUP_TIME.store(now, Ordering::SeqCst);
    info!("메모리 풀 초기화 완료: {} 풀 생성됨", pools.len());
    Ok(())
}

/// 메모리 풀 정리
pub fn cleanup_memory_pools() -> Result<(), Error> {
    info!("메모리 풀 정리 시작");
    let pools = MEMORY_POOLS.read();
    
    if pools.is_empty() {
        debug!("정리할 메모리 풀 없음");
        return Ok(());
    }
    
    // 모든 풀 정리
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let item_count = pool_guard.available_items.len();
        pool_guard.available_items.clear();
        debug!("풀 정리: {} (항목 {} 개 해제)", name, item_count);
    }
    
    info!("메모리 풀 정리 완료");
    Ok(())
}

/// 메모리 풀에서 버퍼 획득
pub fn acquire_buffer(pool_name: &str, size: usize) -> Result<Vec<u8>, Error> {
    POOL_ALLOCATIONS.fetch_add(1, Ordering::Relaxed);
    
    // 풀 초기화 확인
    if MEMORY_POOLS.read().is_empty() {
        let _ = initialize_memory_pools();
    }
    
    // 풀 이름으로 적합한 풀 결정
    let actual_pool_name = determine_pool_name(pool_name, size);
    
    // 풀에서 버퍼 획득
    let pools = MEMORY_POOLS.read();
    if let Some(pool) = pools.get(&actual_pool_name) {
        let mut pool_guard = pool.write();
        let buffer = pool_guard.acquire_buffer();
        POOL_REUSES.fetch_add(1, Ordering::Relaxed);
        return Ok(buffer);
    }
    
    // 풀이 없으면 직접 할당
    debug!("요청된 풀 없음: {}, 직접 할당", actual_pool_name);
    let mut buffer = Vec::with_capacity(size);
    buffer.resize(size, 0);
    Ok(buffer)
}

/// 버퍼를 메모리 풀로 반환
pub fn release_buffer(pool_name: &str, buffer: Vec<u8>) -> Result<(), Error> {
    // 풀 초기화 확인
    if MEMORY_POOLS.read().is_empty() {
        return Ok(());
    }
    
    // 풀 이름으로 적합한 풀 결정
    let capacity = buffer.capacity();
    let actual_pool_name = determine_pool_name(pool_name, capacity);
    
    // 풀에 버퍼 반환
    let pools = MEMORY_POOLS.read();
    if let Some(pool) = pools.get(&actual_pool_name) {
        let mut pool_guard = pool.write();
        pool_guard.release_buffer(buffer);
    }
    
    Ok(())
}

/// 버퍼 크기에 적합한 풀 이름 결정
fn determine_pool_name(preferred_name: &str, size: usize) -> String {
    // 우선 선호하는 풀 이름으로 검색
    let pools = MEMORY_POOLS.read();
    if pools.contains_key(preferred_name) {
        return preferred_name.to_string();
    }
    
    // 크기에 맞는 적절한 풀 선택
    let pool_name = if size <= TINY_BUFFER_SIZE {
        "tiny_buffer"
    } else if size <= EXTRA_SMALL_BUFFER_SIZE {
        "extra_small_buffer"
    } else if size <= SMALL_BUFFER_SIZE {
        "small_buffer"
    } else if size <= MEDIUM_SMALL_BUFFER_SIZE {
        "medium_small_buffer"
    } else if size <= MEDIUM_BUFFER_SIZE {
        "medium_buffer"
    } else if size <= MEDIUM_LARGE_BUFFER_SIZE {
        "medium_large_buffer"
    } else if size <= LARGE_BUFFER_SIZE {
        "large_buffer"
    } else if size <= EXTRA_LARGE_BUFFER_SIZE {
        "extra_large_buffer"
    } else {
        "huge_buffer"
    };
    
    // 특수 목적 풀 확인 (크기보다 특별한 목적이 더 중요)
    if preferred_name.contains("str") || preferred_name.contains("string") {
        return "str_buffer".to_string();
    } else if preferred_name.contains("json") {
        return "json_buffer".to_string();
    } else if preferred_name.contains("xml") {
        return "xml_buffer".to_string();
    } else if preferred_name.contains("blob") || preferred_name.contains("binary") {
        return "blob_buffer".to_string();
    }
    
    pool_name.to_string()
}

/// 비활성 풀 정리
pub fn cleanup_inactive_pools() -> Result<(), Error> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // 마지막 정리 후 일정 시간 이상 지났는지 확인
    let last_cleanup = LAST_CLEANUP_TIME.load(Ordering::SeqCst);
    if now - last_cleanup < 60000 {  // 1분마다 정리
        return Ok(());
    }
    
    debug!("비활성 메모리 풀 정리 시작");
    let pools = MEMORY_POOLS.read();
    let mut total_removed = 0;
    
    // 모든 풀에서 오래된 버퍼 정리
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let removed = pool_guard.cleanup_old_buffers(300000);  // 5분 이상 미사용
        if removed > 0 {
            debug!("풀 {} 에서 {} 항목 정리됨", name, removed);
            total_removed += removed;
        }
    }
    
    LAST_CLEANUP_TIME.store(now, Ordering::SeqCst);
    
    if total_removed > 0 {
        info!("비활성 메모리 풀 정리 완료: 총 {} 항목 해제됨", total_removed);
    } else {
        debug!("비활성 메모리 풀 정리 완료: 해제된 항목 없음");
    }
    
    Ok(())
}

/// 유휴 객체 회수
pub fn reclaim_idle_objects() -> Result<(), Error> {
    debug!("유휴 객체 회수 시작");
    let pools = MEMORY_POOLS.read();
    let mut total_reclaimed = 0;
    
    // 각 풀에서 항목의 절반만 유지
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let available = pool_guard.available_items.len();
        
        if available > 5 {  // 최소 5개는 유지
            let remove_count = available / 2;
            pool_guard.available_items.truncate(available - remove_count);
            total_reclaimed += remove_count;
            debug!("풀 {}에서 {} 항목 회수됨", name, remove_count);
        }
    }
    
    if total_reclaimed > 0 {
        info!("유휴 객체 회수 완료: 총 {} 항목 해제됨", total_reclaimed);
    } else {
        debug!("유휴 객체 회수 완료: 해제된 항목 없음");
    }
    
    Ok(())
}

/// 사용 가능한 모든 객체 회수
pub fn reclaim_all_available_objects() -> Result<(), Error> {
    info!("모든 사용 가능한 객체 회수 시작");
    let pools = MEMORY_POOLS.read();
    let mut total_reclaimed = 0;
    
    // 각 풀에서 최소 항목만 유지하고 나머지 회수
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let available = pool_guard.available_items.len();
        
        if available > 3 {  // 최소 3개만 유지
            total_reclaimed += available - 3;
            pool_guard.available_items.truncate(3);
            debug!("풀 {}에서 {} 항목 회수됨", name, available - 3);
        }
    }
    
    info!("모든 사용 가능한 객체 회수 완료: 총 {} 항목 해제됨", total_reclaimed);
    Ok(())
}

/// 모든 객체 회수 (긴급 모드)
pub fn reclaim_all_objects() -> Result<(), Error> {
    warn!("긴급 모드: 모든 객체 회수 시작");
    let pools = MEMORY_POOLS.read();
    let mut total_reclaimed = 0;
    
    // 각 풀에서 모든 항목 회수
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let available = pool_guard.available_items.len();
        total_reclaimed += available;
        pool_guard.available_items.clear();
        debug!("풀 {}에서 모든 항목({}) 회수됨", name, available);
    }
    
    warn!("긴급 모드: 모든 객체 회수 완료: 총 {} 항목 해제됨", total_reclaimed);
    Ok(())
}

/// 메모리 풀 최적화
pub fn optimize_memory_pools() -> Result<(), Error> {
    debug!("메모리 풀 최적화 시작");
    
    // 유휴 객체 정리
    cleanup_inactive_pools()?;
    
    // 사용률이 낮은 풀 축소
    let pools = MEMORY_POOLS.read();
    
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        // 풀에서 과도하게 많은 항목 회수
        if pool_guard.available_items.len() > pool_guard.max_items / 2 {
            let to_keep = pool_guard.max_items / 2;
            let removed = pool_guard.available_items.len() - to_keep;
            pool_guard.available_items.truncate(to_keep);
            debug!("풀 {} 최적화: {} 항목 회수됨, {} 항목 유지", name, removed, to_keep);
        }
    }
    
    debug!("메모리 풀 최적화 완료");
    Ok(())
}

/// 메모리 풀 압축
pub fn compact_memory_pools() -> Result<(), Error> {
    info!("메모리 풀 압축 시작");
    
    // 모든 풀 압축 - 각 풀에서 항목 축소
    let pools = MEMORY_POOLS.read();
    let mut total_compacted = 0;
    
    for (name, pool) in pools.iter() {
        let mut pool_guard = pool.write();
        let initial_count = pool_guard.available_items.len();
        
        // 크기가 작은 풀일수록 더 많은 항목 유지
        let target_percentage = match pool_guard.item_size {
            size if size <= EXTRA_SMALL_BUFFER_SIZE => 50, // 50% 유지
            size if size <= MEDIUM_BUFFER_SIZE => 40,      // 40% 유지
            size if size <= LARGE_BUFFER_SIZE => 30,       // 30% 유지
            _ => 20,                                       // 20% 유지
        };
        
        let target_count = (pool_guard.max_items * target_percentage) / 100;
        if initial_count > target_count {
            let removed = initial_count - target_count;
            pool_guard.available_items.truncate(target_count);
            total_compacted += removed;
            debug!("풀 {} 압축: {} 항목 제거, {} 항목 유지", 
                name, removed, target_count);
        }
    }
    
    info!("메모리 풀 압축 완료: 총 {} 항목 압축됨", total_compacted);
    Ok(())
}

/// 메모리 풀 통계 가져오기
pub fn get_pool_stats() -> Result<MemoryPoolStats, Error> {
    let pools = MEMORY_POOLS.read();
    
    // 풀에서 통계 수집
    let mut total_allocated: u64 = 0;
    let mut total_freed: u64 = 0;
    let mut reuse_count: u64 = 0;
    let mut pool_details = Vec::with_capacity(pools.len());
    
    for (_, pool) in pools.iter() {
        let pool_guard = pool.read();
        
        // 개별 풀 통계 수집
        let pool_alloc = pool_guard.total_allocated.load(Ordering::Relaxed);
        let pool_freed = pool_guard.total_freed.load(Ordering::Relaxed);
        let pool_reuse = pool_guard.reuse_count.load(Ordering::Relaxed);
        
        total_allocated += pool_alloc;
        total_freed += pool_freed;
        reuse_count += pool_reuse;
        
        // 풀 세부 정보 추가
        pool_details.push(pool_guard.get_stats());
    }
    
    // 캐시 히트율 계산 (재사용된 버퍼 / 모든 요청)
    let allocations = POOL_ALLOCATIONS.load(Ordering::Relaxed);
    let cache_hit_rate = if allocations > 0 {
        (reuse_count as f64 / allocations as f64) * 100.0
    } else {
        0.0
    };
    
    let stats = MemoryPoolStats {
        total_allocated,
        total_freed,
        current_usage: total_allocated.saturating_sub(total_freed),
        pool_count: pools.len(),
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        reuse_count,
        cache_hit_rate,
        pools: pool_details,
    };
    
    Ok(stats)
}

/// 메모리 풀 초기화 (완전 초기화)
pub fn reset_memory_pools() -> Result<(), Error> {
    warn!("메모리 풀 완전 초기화 중");
    
    // 기존 풀 정리
    let _ = cleanup_memory_pools();
    
    // 모든 풀 삭제
    {
        let mut pools = MEMORY_POOLS.write();
        pools.clear();
    }
    
    // 카운터 초기화
    POOL_ALLOCATIONS.store(0, Ordering::SeqCst);
    POOL_REUSES.store(0, Ordering::SeqCst);
    
    // 새 풀 초기화
    initialize_memory_pools()?;
    
    info!("메모리 풀 완전 초기화 완료");
    Ok(())
}

/// 메모리 풀 이름 목록 가져오기
pub fn get_pool_names() -> Result<Vec<String>, Error> {
    let pools = MEMORY_POOLS.read();
    let names: Vec<String> = pools.keys().cloned().collect();
    Ok(names)
}

/// 메모리 풀 사용 추천 (최적의 풀 이름과 크기 추천)
pub fn recommend_pool(expected_size: usize, usage_hint: &str) -> (String, usize) {
    // 사용 힌트에 따른 특수 풀 추천
    if usage_hint.contains("str") || usage_hint.contains("string") {
        if expected_size <= 1024 {
            return ("str_buffer".to_string(), 1024);
        }
    } else if usage_hint.contains("json") {
        return ("json_buffer".to_string(), 16 * 1024);
    } else if usage_hint.contains("xml") {
        return ("xml_buffer".to_string(), 32 * 1024);
    } else if usage_hint.contains("blob") || usage_hint.contains("binary") {
        return ("blob_buffer".to_string(), 128 * 1024);
    }
    
    // 크기에 따른 표준 풀 추천
    let (pool_name, size) = if expected_size <= TINY_BUFFER_SIZE {
        ("tiny_buffer", TINY_BUFFER_SIZE)
    } else if expected_size <= EXTRA_SMALL_BUFFER_SIZE {
        ("extra_small_buffer", EXTRA_SMALL_BUFFER_SIZE)
    } else if expected_size <= SMALL_BUFFER_SIZE {
        ("small_buffer", SMALL_BUFFER_SIZE)
    } else if expected_size <= MEDIUM_SMALL_BUFFER_SIZE {
        ("medium_small_buffer", MEDIUM_SMALL_BUFFER_SIZE)
    } else if expected_size <= MEDIUM_BUFFER_SIZE {
        ("medium_buffer", MEDIUM_BUFFER_SIZE)
    } else if expected_size <= MEDIUM_LARGE_BUFFER_SIZE {
        ("medium_large_buffer", MEDIUM_LARGE_BUFFER_SIZE)
    } else if expected_size <= LARGE_BUFFER_SIZE {
        ("large_buffer", LARGE_BUFFER_SIZE)
    } else if expected_size <= EXTRA_LARGE_BUFFER_SIZE {
        ("extra_large_buffer", EXTRA_LARGE_BUFFER_SIZE)
    } else {
        ("huge_buffer", HUGE_BUFFER_SIZE)
    };
    
    (pool_name.to_string(), size)
}

/// 메모리 사용량 예측 (여러 풀의 현재 사용량을 기반으로)
pub fn estimate_memory_usage() -> Result<u64, Error> {
    let pools = MEMORY_POOLS.read();
    let mut active_memory: u64 = 0;
    let mut pooled_memory: u64 = 0;
    
    // 모든 풀에서 메모리 사용량 계산
    for (_, pool) in pools.iter() {
        let pool_guard = pool.read();
        
        // 활성 메모리 (현재 사용 중인 버퍼)
        let active_count = pool_guard.active_count.load(Ordering::Relaxed);
        active_memory += (active_count as u64) * (pool_guard.item_size as u64);
        
        // 풀링된 메모리 (재사용 대기 중인 버퍼)
        pooled_memory += (pool_guard.available_items.len() as u64) * (pool_guard.item_size as u64);
    }
    
    // 총 메모리 사용량 반환
    Ok(active_memory + pooled_memory)
}
