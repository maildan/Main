//! GPU 설정 모듈
//! 
//! 이 모듈은 GPU 하드웨어 가속 및 계산 관련 설정을 관리합니다.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::RwLock;
use once_cell::sync::Lazy;
use serde::{Serialize, Deserialize};
use log::{debug, info};

// 설정 기본값
const DEFAULT_HARDWARE_ACCELERATION_ENABLED: bool = true;
const DEFAULT_SHADER_CACHE_ENABLED: bool = true;
const DEFAULT_COMPUTE_MODE: &str = "auto";
const DEFAULT_POWER_PREFERENCE: &str = "high-performance";
const DEFAULT_MAX_RESOURCE_SIZE: usize = 256 * 1024 * 1024; // 256MB

// GPU 설정 상태 추적
static HARDWARE_ACCELERATION_ENABLED: AtomicBool = AtomicBool::new(DEFAULT_HARDWARE_ACCELERATION_ENABLED);
static SHADER_CACHE_ENABLED: AtomicBool = AtomicBool::new(DEFAULT_SHADER_CACHE_ENABLED);

// 글로벌 설정 객체
static SETTINGS: Lazy<RwLock<GpuSettings>> = Lazy::new(|| {
    RwLock::new(GpuSettings::default())
});

/// GPU 설정 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuSettings {
    /// 하드웨어 가속 활성화 여부
    pub hardware_acceleration_enabled: bool,
    
    /// 셰이더 캐시 활성화 여부
    pub shader_cache_enabled: bool,
    
    /// 컴퓨팅 모드 (auto, performance, power-save)
    pub compute_mode: String,
    
    /// 전력 설정 (default, high-performance, low-power)
    pub power_preference: String,
    
    /// 최대 GPU 리소스 크기 (바이트)
    pub max_resource_size: usize,
    
    /// 디버그 모드 활성화 여부
    pub debug_mode: bool,
    
    /// 성능 프로필 이름
    pub profile_name: String,
}

impl Default for GpuSettings {
    fn default() -> Self {
        Self {
            hardware_acceleration_enabled: DEFAULT_HARDWARE_ACCELERATION_ENABLED,
            shader_cache_enabled: DEFAULT_SHADER_CACHE_ENABLED,
            compute_mode: DEFAULT_COMPUTE_MODE.to_string(),
            power_preference: DEFAULT_POWER_PREFERENCE.to_string(),
            max_resource_size: DEFAULT_MAX_RESOURCE_SIZE,
            debug_mode: false,
            profile_name: "standard".to_string(),
        }
    }
}

/// 하드웨어 가속 활성화 여부 확인
pub fn is_hardware_acceleration_enabled() -> bool {
    HARDWARE_ACCELERATION_ENABLED.load(Ordering::Relaxed)
}

/// 하드웨어 가속 활성화 설정
pub fn set_hardware_acceleration_enabled(enabled: bool) {
    HARDWARE_ACCELERATION_ENABLED.store(enabled, Ordering::Relaxed);
    
    // 설정 객체도 업데이트
    if let Ok(mut settings) = SETTINGS.write() {
        settings.hardware_acceleration_enabled = enabled;
    }
    
    info!("하드웨어 가속 설정이 {}로 변경되었습니다", if enabled { "활성화" } else { "비활성화" });
}

/// 셰이더 캐시 활성화 여부 확인
pub fn is_shader_cache_enabled() -> bool {
    SHADER_CACHE_ENABLED.load(Ordering::Relaxed)
}

/// 셰이더 캐시 활성화 설정
pub fn set_shader_cache_enabled(enabled: bool) {
    SHADER_CACHE_ENABLED.store(enabled, Ordering::Relaxed);
    
    // 설정 객체도 업데이트
    if let Ok(mut settings) = SETTINGS.write() {
        settings.shader_cache_enabled = enabled;
    }
    
    debug!("셰이더 캐시가 {}로 설정되었습니다", if enabled { "활성화" } else { "비활성화" });
}

/// 컴퓨팅 모드 가져오기
pub fn get_compute_mode() -> String {
    SETTINGS.read().expect("설정 읽기 실패").compute_mode.clone()
}

/// 처리 모드 가져오기 (JS 연동용 - auto, cpu-intensive, gpu-intensive)
pub fn get_processing_mode() -> String {
    // 설정의 compute_mode 기반으로 처리 모드 결정
    let compute_mode = get_compute_mode();
    match compute_mode.as_str() {
        "performance" => "gpu-intensive".to_string(),
        "power-save" => "cpu-intensive".to_string(),
        _ => "auto".to_string()
    }
}

/// 컴퓨팅 모드 설정
pub fn set_compute_mode(mode: &str) {
    if let Ok(mut settings) = SETTINGS.write() {
        settings.compute_mode = mode.to_string();
        debug!("컴퓨팅 모드가 '{}'로 설정되었습니다", mode);
    }
}

/// 전력 설정 가져오기
pub fn get_power_preference() -> String {
    SETTINGS.read().expect("설정 읽기 실패").power_preference.clone()
}

/// 전력 설정 업데이트
pub fn set_power_preference(preference: &str) {
    if let Ok(mut settings) = SETTINGS.write() {
        settings.power_preference = preference.to_string();
        debug!("전력 설정이 '{}'로 변경되었습니다", preference);
    }
}

/// 최대 리소스 크기 가져오기
pub fn get_max_resource_size() -> usize {
    SETTINGS.read().expect("설정 읽기 실패").max_resource_size
}

/// 최대 리소스 크기 설정
pub fn set_max_resource_size(size: usize) {
    if let Ok(mut settings) = SETTINGS.write() {
        settings.max_resource_size = size;
        debug!("최대 리소스 크기가 {} 바이트로 설정되었습니다", size);
    }
}

/// 전체 설정 가져오기
pub fn get_settings() -> GpuSettings {
    SETTINGS.read().expect("설정 읽기 실패").clone()
}

/// 전체 설정 업데이트
pub fn update_settings(new_settings: GpuSettings) {
    // 주요 설정 동기화
    HARDWARE_ACCELERATION_ENABLED.store(new_settings.hardware_acceleration_enabled, Ordering::Relaxed);
    SHADER_CACHE_ENABLED.store(new_settings.shader_cache_enabled, Ordering::Relaxed);
    
    // 설정 객체 업데이트
    if let Ok(mut settings) = SETTINGS.write() {
        *settings = new_settings;
        info!("GPU 설정이 업데이트되었습니다");
    }
}

/// 설정을 JSON 형식으로 가져오기
pub fn get_settings_json() -> Result<String, String> {
    let settings = get_settings();
    match serde_json::to_string(&settings) {
        Ok(json) => Ok(json),
        Err(e) => Err(format!("설정 직렬화 오류: {}", e))
    }
}

/// JSON에서 설정 업데이트
pub fn update_settings_from_json(json: &str) -> Result<(), String> {
    match serde_json::from_str::<GpuSettings>(json) {
        Ok(new_settings) => {
            update_settings(new_settings);
            Ok(())
        },
        Err(e) => {
            Err(format!("설정 파싱 오류: {}", e))
        }
    }
}

/// 성능 프로필 설정
pub fn set_performance_profile(profile_name: &str) {
    if let Ok(mut settings) = SETTINGS.write() {
        settings.profile_name = profile_name.to_string();
        
        // 프로필에 따른 설정 업데이트
        match profile_name {
            "high-performance" => {
                settings.power_preference = "high-performance".to_string();
                settings.compute_mode = "performance".to_string();
                settings.shader_cache_enabled = true;
                SHADER_CACHE_ENABLED.store(true, Ordering::Relaxed);
            },
            "balanced" => {
                settings.power_preference = "default".to_string();
                settings.compute_mode = "auto".to_string();
                settings.shader_cache_enabled = true;
                SHADER_CACHE_ENABLED.store(true, Ordering::Relaxed);
            },
            "power-save" => {
                settings.power_preference = "low-power".to_string();
                settings.compute_mode = "power-save".to_string();
                settings.shader_cache_enabled = true;
                SHADER_CACHE_ENABLED.store(true, Ordering::Relaxed);
            },
            _ => {
                debug!("알 수 없는 프로필: {}, 기본 설정 사용", profile_name);
            }
        }
        
        info!("성능 프로필이 '{}'로 설정되었습니다", profile_name);
    }
}
