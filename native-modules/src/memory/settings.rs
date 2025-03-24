use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};
use log::{debug, error};
use napi::Error;

// 메모리 최적화 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySettings {
    // 기본 설정
    pub enable_automatic_optimization: bool,
    pub optimization_threshold: f64, // MB 단위
    pub optimization_interval: u64, // ms 단위
    
    // 고급 설정
    pub aggressive_gc: bool,
    pub enable_logging: bool,
    pub enable_performance_metrics: bool,
    
    // GPU 관련 설정
    pub use_hardware_acceleration: bool,
    pub processing_mode: String, // "auto", "normal", "cpu-intensive", "gpu-intensive"
    
    // 메모리 풀 설정
    pub use_memory_pool: bool,
    pub pool_cleanup_interval: u64, // ms 단위
}

impl Default for MemorySettings {
    fn default() -> Self {
        Self {
            enable_automatic_optimization: true,
            optimization_threshold: 100.0, // 100MB
            optimization_interval: 60000, // 1분
            
            aggressive_gc: false,
            enable_logging: true,
            enable_performance_metrics: true,
            
            use_hardware_acceleration: false,
            processing_mode: "auto".to_string(),
            
            use_memory_pool: true,
            pool_cleanup_interval: 300000, // 5분
        }
    }
}

// 전역 설정 객체
static MEMORY_SETTINGS: Lazy<RwLock<MemorySettings>> = Lazy::new(|| RwLock::new(MemorySettings::default()));
static SETTINGS_INITIALIZED: AtomicBool = AtomicBool::new(false);

/// 메모리 설정 초기화
pub fn initialize_memory_settings(settings_json: &str) -> Result<bool, Error> {
    debug!("메모리 설정 초기화: {}", settings_json);
    
    if SETTINGS_INITIALIZED.load(Ordering::SeqCst) {
        debug!("메모리 설정이 이미 초기화되어 있습니다");
        return Ok(true);
    }
    
    // 설정 파싱
    let parsed_settings: Result<MemorySettings, _> = serde_json::from_str(settings_json);
    
    match parsed_settings {
        Ok(settings) => {
            // 설정 업데이트
            let mut current_settings = MEMORY_SETTINGS.write();
            *current_settings = settings;
            
            SETTINGS_INITIALIZED.store(true, Ordering::SeqCst);
            debug!("메모리 설정이 성공적으로 초기화되었습니다");
            Ok(true)
        },
        Err(e) => {
            error!("메모리 설정 파싱 오류: {}", e);
            
            // 기본값으로 초기화
            let mut current_settings = MEMORY_SETTINGS.write();
            *current_settings = MemorySettings::default();
            
            SETTINGS_INITIALIZED.store(true, Ordering::SeqCst);
            Err(Error::from_reason(format!("메모리 설정 파싱 실패: {}", e)))
        }
    }
}

/// 현재 메모리 설정 가져오기
pub fn get_memory_settings() -> MemorySettings {
    MEMORY_SETTINGS.read().clone()
}

/// 메모리 설정 업데이트
pub fn update_memory_settings(settings_json: &str) -> Result<bool, Error> {
    debug!("메모리 설정 업데이트: {}", settings_json);
    
    // 설정 파싱
    let parsed_settings: Result<MemorySettings, _> = serde_json::from_str(settings_json);
    
    match parsed_settings {
        Ok(settings) => {
            // 설정 업데이트
            let mut current_settings = MEMORY_SETTINGS.write();
            *current_settings = settings;
            
            debug!("메모리 설정이 성공적으로 업데이트되었습니다");
            Ok(true)
        },
        Err(e) => {
            error!("메모리 설정 업데이트 오류: {}", e);
            Err(Error::from_reason(format!("메모리 설정 파싱 실패: {}", e)))
        }
    }
}

/// 자동 최적화가 활성화되어 있는지 확인
pub fn is_automatic_optimization_enabled() -> bool {
    MEMORY_SETTINGS.read().enable_automatic_optimization
}

/// 최적화 임계값 가져오기 (MB)
pub fn get_optimization_threshold() -> f64 {
    MEMORY_SETTINGS.read().optimization_threshold
}

/// 하드웨어 가속 사용 여부 확인
pub fn is_hardware_acceleration_enabled() -> bool {
    MEMORY_SETTINGS.read().use_hardware_acceleration
}

/// 처리 모드 가져오기
pub fn get_processing_mode() -> String {
    MEMORY_SETTINGS.read().processing_mode.clone()
}

/// 설정 JSON 문자열로 가져오기
pub fn get_settings_json() -> Result<String, Error> {
    match serde_json::to_string(&*MEMORY_SETTINGS.read()) {
        Ok(json) => Ok(json),
        Err(e) => Err(Error::from_reason(format!("설정 직렬화 실패: {}", e)))
    }
}

/// 메모리 풀 사용 여부 확인
pub fn is_memory_pool_enabled() -> bool {
    MEMORY_SETTINGS.read().use_memory_pool
}

/// 성능 메트릭 수집 활성화 여부 확인
pub fn is_performance_metrics_enabled() -> bool {
    MEMORY_SETTINGS.read().enable_performance_metrics
}

/// 공격적인 GC 사용 여부 확인
pub fn is_aggressive_gc_enabled() -> bool {
    MEMORY_SETTINGS.read().aggressive_gc
}
