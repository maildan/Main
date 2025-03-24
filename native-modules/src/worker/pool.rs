use napi::Error;
use serde::{Serialize, Deserialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use parking_lot::{RwLock, Mutex};
use once_cell::sync::{Lazy, OnceCell};
use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};

// 워커 풀 상태 구조체
struct WorkerPoolState {
    initialized: bool,
    thread_count: u32,
    active_tasks: u64,
    completed_tasks: u64,
}

// 워커 풀 상태
static WORKER_POOL: Lazy<RwLock<WorkerPoolState>> = Lazy::new(|| {
    RwLock::new(WorkerPoolState {
        initialized: false,
        thread_count: 0,
        active_tasks: 0,
        completed_tasks: 0,
    })
});

// 활성 작업 카운터
static ACTIVE_TASKS: AtomicU64 = AtomicU64::new(0);
static COMPLETED_TASKS: AtomicU64 = AtomicU64::new(0);
static POOL_RUNNING: AtomicBool = AtomicBool::new(false);

// 작업 핸들러 맵 (작업 유형 -> 핸들러 함수)
static TASK_HANDLERS: Lazy<RwLock<HashMap<String, fn(&str) -> Result<String, Error>>>> = 
    Lazy::new(|| RwLock::new(HashMap::new()));

/// 워커 풀 통계 구조체
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkerPoolStats {
    pub thread_count: u32,
    pub active_tasks: u64,
    pub completed_tasks: u64,
    pub active_workers: u32,
    pub idle_workers: u32,
    pub pending_tasks: u64,
    pub failed_tasks: u64,
    pub total_tasks: u64,
    pub uptime_ms: u64,
    pub timestamp: u64,
}

// 워커 풀 구조체 정의 (추가됨)
#[derive(Debug)]
pub struct WorkerPool {
    workers: Vec<Worker>,
    max_workers: usize,
    task_queue: VecDeque<Task>,
    active: bool,
    task_handlers: HashMap<String, fn(&str) -> Result<String, Error>>,
    stats: WorkerPoolStats,
}

// 워커 구조체 정의 (추가됨)
#[derive(Debug)]
struct Worker {
    id: usize,
    active: bool,
    task_count: u64,
}

// 작업 구조체 정의 (추가됨)
#[derive(Debug)]
struct Task {
    id: String,
    task_type: String,
    data: String,
    timestamp: u64,
}

// WorkerPool 싱글톤 인스턴스
static WORKER_POOL_INSTANCE: OnceCell<Mutex<WorkerPool>> = OnceCell::new();

/// 워커 풀 초기화
pub fn initialize_worker_pool(thread_count: u32) -> Result<bool, Error> {
    // 이미 초기화되었는지 확인
    {
        let pool = WORKER_POOL.read();
        if (pool.initialized) {
            return Ok(true);
        }
    }
    
    // 스레드 수 결정 (0이면 자동)
    let threads = if thread_count == 0 {
        let cpus = num_cpus::get() as u32;
        if cpus > 1 { cpus - 1 } else { 1 }
    } else {
        thread_count
    };
    
    // 워커 풀 상태 업데이트
    {
        let mut pool = WORKER_POOL.write();
        pool.initialized = true;
        pool.thread_count = threads;
        pool.active_tasks = 0;
        pool.completed_tasks = 0;
    }
    
    POOL_RUNNING.store(true, Ordering::SeqCst);
    
    // 워커 풀 인스턴스 초기화
    let worker_pool = WorkerPool {
        workers: Vec::new(),
        max_workers: threads as usize,
        task_queue: VecDeque::new(),
        active: true,
        task_handlers: HashMap::new(),
        stats: WorkerPoolStats {
            thread_count: threads,
            active_tasks: 0,
            completed_tasks: 0,
            active_workers: 0,
            idle_workers: threads,
            pending_tasks: 0,
            failed_tasks: 0,
            total_tasks: 0,
            uptime_ms: 0,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        },
    };
    
    // 싱글톤 인스턴스 설정
    let _ = WORKER_POOL_INSTANCE.set(Mutex::new(worker_pool));
    
    // 기본 작업 핸들러 등록
    register_default_task_handlers();
    
    Ok(true)
}

/// 워커 풀 종료
pub fn shutdown_worker_pool() -> Result<bool, Error> {
    // 초기화되지 않았으면 무시
    {
        let pool = WORKER_POOL.read();
        if !pool.initialized {
            return Ok(true);
        }
    }
    
    // 워커 풀 상태 업데이트
    {
        let mut pool = WORKER_POOL.write();
        pool.initialized = false;
    }
    
    POOL_RUNNING.store(false, Ordering::SeqCst);
    
    // 작업 핸들러 정리
    let mut handlers = TASK_HANDLERS.write();
    handlers.clear();
    
    // 워커 풀 인스턴스에도 변경 적용
    if let Some(pool_mutex) = WORKER_POOL_INSTANCE.get() {
        let mut pool = pool_mutex.lock();
        pool.active = false;
        pool.task_queue.clear();
        pool.workers.clear();
    }
    
    Ok(true)
}

/// 워커 풀 통계 가져오기
pub fn get_worker_pool_stats() -> Result<WorkerPoolStats, Error> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // 워커 풀 인스턴스가 있으면 해당 통계 반환
    if let Some(pool_mutex) = WORKER_POOL_INSTANCE.get() {
        let pool = pool_mutex.lock();
        let mut stats = pool.stats.clone();
        stats.timestamp = now;
        return Ok(stats);
    }
    
    // 없으면 기본 상태에서 통계 생성
    let pool = WORKER_POOL.read();
    
    Ok(WorkerPoolStats {
        thread_count: pool.thread_count,
        active_tasks: ACTIVE_TASKS.load(Ordering::SeqCst),
        completed_tasks: COMPLETED_TASKS.load(Ordering::SeqCst),
        active_workers: 0,
        idle_workers: pool.thread_count,
        pending_tasks: 0,
        failed_tasks: 0,
        total_tasks: COMPLETED_TASKS.load(Ordering::SeqCst),
        uptime_ms: 0, // 실제 구현에서는 시작 시간부터 계산
        timestamp: now,
    })
}

/// 워커 풀 가져오기
pub fn get_worker_pool() -> Option<&'static Mutex<WorkerPool>> {
    WORKER_POOL_INSTANCE.get()
}

/// 작업 제출
pub fn submit_task(task_type: &str, data: &str) -> Result<String, Error> {
    // 워커 풀 초기화 확인
    if !POOL_RUNNING.load(Ordering::SeqCst) {
        return Err(Error::from_reason("Worker pool is not initialized"));
    }
    
    // 활성 작업 카운터 증가
    ACTIVE_TASKS.fetch_add(1, Ordering::SeqCst);
    
    // 작업 처리 시작 시간
    let start = std::time::Instant::now();
    
    // 작업 핸들러 찾기 및 실행
    let handlers = TASK_HANDLERS.read();
    let handler = handlers.get(task_type).ok_or_else(|| {
        // 활성 작업 카운터 감소 (오류 발생 시)
        ACTIVE_TASKS.fetch_sub(1, Ordering::SeqCst);
        Error::from_reason(format!("Unknown task type: {}", task_type))
    })?;
    
    // 작업 실행
    let result = handler(data);
    
    // 처리 시간 계산
    let execution_time = start.elapsed().as_millis() as u64;
    
    // 활성 작업 카운터 감소, 완료 작업 카운터 증가
    ACTIVE_TASKS.fetch_sub(1, Ordering::SeqCst);
    COMPLETED_TASKS.fetch_add(1, Ordering::SeqCst);
    
    // 결과 반환
    match result {
        Ok(result_json) => {
            // 결과 JSON에 실행 시간 추가
            let mut parsed: serde_json::Value = serde_json::from_str(&result_json)
                .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
            
            if let serde_json::Value::Object(ref mut obj) = parsed {
                obj.insert("execution_time_ms".to_string(), serde_json::json!(execution_time));
                obj.insert("timestamp".to_string(), serde_json::json!(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64
                ));
            }
            
            Ok(serde_json::to_string(&parsed).unwrap_or_default())
        },
        Err(e) => {
            // 오류 발생 시 오류 정보를 담은 JSON 반환
            let error_json = serde_json::json!({
                "success": false,
                "task_type": task_type,
                "execution_time_ms": execution_time,
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
                "error": e.to_string()
            });
            
            Ok(serde_json::to_string(&error_json).unwrap_or_default())
        }
    }
}

/// 기본 작업 핸들러 등록
fn register_default_task_handlers() {
    let mut handlers = TASK_HANDLERS.write();
    
    // 메모리 최적화 작업
    handlers.insert("optimize_memory".to_string(), |data| {
        let parsed: serde_json::Value = serde_json::from_str(data)
            .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
        let level = parsed.get("level")
            .and_then(|v| v.as_u64())
            .unwrap_or(2) as u8;
        
        let emergency = parsed.get("emergency")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        
        let result = crate::memory::optimize_memory(level, emergency)?;
        Ok(result)
    });
    
    // GPU 계산 작업
    handlers.insert("gpu_computation".to_string(), |data| {
        let parsed: serde_json::Value = serde_json::from_str(data)
            .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
        let computation_type = parsed.get("computation_type")
            .and_then(|v| v.as_str())
            .unwrap_or("matrix");
        
        let computation_data = parsed.get("data")
            .map(|v| serde_json::to_string(v).unwrap_or_default())
            .unwrap_or_else(|| "{}".to_string());
        
        let result = crate::gpu::perform_gpu_computation_sync(computation_data, computation_type.to_string())?;
        Ok(result)
    });
    
    // 기타 작업 핸들러 등록
    handlers.insert("echo".to_string(), |data| {
        Ok(format!("{{\"success\":true,\"message\":\"Echo: {}\"}}", data))
    });
}

/// 작업 유형 목록 가져오기
pub fn get_available_task_types() -> Result<Vec<String>, Error> {
    let handlers = TASK_HANDLERS.read();
    let task_types = handlers.keys().cloned().collect();
    Ok(task_types)
}
