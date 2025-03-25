use napi::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Once;
use std::collections::HashMap;
use log::{debug, warn};
use serde_json::json;
use std::sync::RwLock;
use once_cell::sync::Lazy;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::gpu::types::{GpuDeviceInfo, GpuCapabilities as TypesGpuCapabilities};
use crate::gpu::Result;

// GPU 초기화 상태 추적
static GPU_INITIALIZED: AtomicBool = AtomicBool::new(false);
static INITIALIZATION_COMPLETE: Once = Once::new();
static GPU_AVAILABLE: AtomicBool = AtomicBool::new(false);

// GPU 백엔드 타입 (벤더 및 기능에 따라 나뉨)
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GpuBackendType {
    Uninitialized,
    Vulkan,  
    Metal,   // macOS 및 iOS
    DirectX, // Windows
    OpenGL,  // 크로스 플랫폼 폄백
    WebGPU,  // 브라우저 환경
    Software // 하드웨어 가속 불가능 환경
}

// GPU 상태 및 기능 정보
pub struct GpuContext {
    pub backend_type: GpuBackendType,
    pub vendor_name: String,
    pub device_name: String,
    pub driver_info: String,
    pub compute_supported: bool,
    pub features: HashMap<String, bool>,
    pub adapter_limits: HashMap<String, u32>,
}

// GpuContext 메서드 구현 추가
impl GpuContext {
    /// GPU 리소스 정리
    pub fn cleanup_resources(&self) -> Result<()> {
        debug!("GPU 리소스 정리 중...");
        // 실제 구현은 백엔드별로 달라질 수 있음
        Ok(())
    }
    
    /// 셰이더 캐시 정리
    pub fn clear_shader_cache(&self) -> Result<()> {
        debug!("GPU 셰이더 캐시 정리 중...");
        // 실제 구현은 백엔드별로 달라질 수 있음
        Ok(())
    }
    
    /// 모든 GPU 리소스 해제
    pub fn release_all_resources(&self) -> Result<()> {
        debug!("모든 GPU 리소스 해제 중...");
        // 실제 구현은 백엔드별로 달라질 수 있음
        Ok(())
    }
}

// 전역 GPU 컨텍스트
pub static GPU_CONTEXT: Lazy<RwLock<Option<GpuContext>>> = Lazy::new(|| RwLock::new(None));

/// GPU 컨텍스트 초기화
/// 
/// 이 함수는 시스템의 GPU 하드웨어를 감지하고 초기화합니다.
pub fn initialize_gpu_context() -> Result<bool> {
    // 이미 초기화되었는지 확인 (중복 초기화 방지)
    if is_gpu_initialized() {
        debug!("GPU 컨텍스트가 이미 초기화되었습니다");
        return Ok(true);
    }
    
    // 초기화 시작
    let mut success = false;
    
    // 한 번만 실행되도록 보장
    INITIALIZATION_COMPLETE.call_once(|| {
        debug!("GPU 컨텍스트 초기화 시작");
        
        // 백엔드 감지 시도 (여러 백엔드 시도)
        match detect_best_gpu_backend() {
            Ok(backend_info) => {
                // 컨텍스트 생성
                let context = GpuContext {
                    backend_type: backend_info.backend_type,
                    vendor_name: backend_info.vendor,
                    device_name: backend_info.device,
                    driver_info: backend_info.driver,
                    compute_supported: backend_info.compute_supported,
                    features: backend_info.features,
                    adapter_limits: backend_info.limits,
                };
                
                // 전역 컨텍스트 저장
                if let Ok(mut ctx_guard) = GPU_CONTEXT.write() {
                    *ctx_guard = Some(context);
                    GPU_INITIALIZED.store(true, Ordering::SeqCst);
                    GPU_AVAILABLE.store(true, Ordering::SeqCst);
                    debug!("GPU 컨텍스트 초기화 성공: {:?} 백엔드", backend_info.backend_type);
                    success = true;
                }
            },
            Err(e) => {
                // 초기화 실패 - 소프트웨어 렌더링으로 폄백
                warn!("GPU 컨텍스트 초기화 실패: {}", e);
                
                // 소프트웨어 폄백 컨텍스트 생성
                let fallback_context = GpuContext {
                    backend_type: GpuBackendType::Software,
                    vendor_name: "CPU Fallback".to_string(),
                    device_name: "Software Renderer".to_string(),
                    driver_info: "N/A".to_string(),
                    compute_supported: false,
                    features: HashMap::new(),
                    adapter_limits: HashMap::new(),
                };
                
                // 폄백 컨텍스트 저장
                if let Ok(mut ctx_guard) = GPU_CONTEXT.write() {
                    *ctx_guard = Some(fallback_context);
                    GPU_INITIALIZED.store(true, Ordering::SeqCst);
                    GPU_AVAILABLE.store(false, Ordering::SeqCst); // 하드웨어 가속 불가능
                    debug!("소프트웨어 폄백 렌더러로 초기화됨");
                    success = true; // 초기화는 성공했지만 하드웨어 가속은 불가능
                }
            }
        }
    });
    
    Ok(success)
}

// 백엔드 정보 구조체
struct BackendInfo {
    backend_type: GpuBackendType,
    vendor: String,
    device: String,
    driver: String,
    compute_supported: bool,
    features: HashMap<String, bool>,
    limits: HashMap<String, u32>,
}

/// 최적의 GPU 백엔드 감지
fn detect_best_gpu_backend() -> Result<BackendInfo> {
    #[cfg(target_os = "windows")]
    {
        // DirectX 백엔드 시도 (Windows)
        if let Ok(backend) = try_initialize_directx() {
            return Ok(backend);
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // Metal 백엔드 시도 (macOS)
        if let Ok(backend) = try_initialize_metal() {
            return Ok(backend);
        }
    }
    
    // Vulkan 백엔드 시도 (크로스 플랫폼)
    if let Ok(backend) = try_initialize_vulkan() {
        return Ok(backend);
    }
    
    // OpenGL 백엔드 시도 (폴백)
    if let Ok(backend) = try_initialize_opengl() {
        return Ok(backend);
    }
    
    // 모든 백엔드 초기화 실패
    Err(Error::from_reason("지원되는 GPU 백엔드를 찾을 수 없습니다"))
}

// 더미 함수 (실제로는 백엔드별 구현 필요)
fn try_initialize_vulkan() -> Result<BackendInfo> {
    // wgpu 또는 ash 등의 Vulkan 라이브러리 사용 (실제 구현 필요)
    let mut features = HashMap::new();
    features.insert("compute".to_string(), true);
    features.insert("storage".to_string(), true);
    
    let mut limits = HashMap::new();
    limits.insert("max_compute_workgroups".to_string(), 65535);
    
    Ok(BackendInfo {
        backend_type: GpuBackendType::Vulkan,
        vendor: "NVIDIA".to_string(), // 실제 구현에서는 동적으로 가져옴
        device: "GeForce RTX".to_string(),
        driver: "Vulkan 1.3".to_string(),
        compute_supported: true,
        features,
        limits,
    })
}

#[cfg(target_os = "windows")]
fn try_initialize_directx() -> Result<BackendInfo> {
    // DirectX 구현 (Windows 전용) - 실제 구현 필요
    Err(Error::from_reason("DirectX 백엔드 아직 구현되지 않음"))
}

#[cfg(target_os = "macos")]
fn try_initialize_metal() -> Result<BackendInfo> {
    // Metal 구현 (macOS 전용) - 실제 구현 필요
    Err(Error::from_reason("Metal 백엔드 아직 구현되지 않음"))
}

fn try_initialize_opengl() -> Result<BackendInfo> {
    // OpenGL 구현 (크로스 플랫폼 폄백) - 실제 구현 필요
    Err(Error::from_reason("OpenGL 백엔드 아직 구현되지 않음"))
}

/// GPU 가용성 확인
pub fn check_gpu_availability() -> bool {
    GPU_AVAILABLE.load(Ordering::SeqCst)
}

/// GPU 초기화 여부 확인
pub fn is_gpu_initialized() -> bool {
    GPU_INITIALIZED.load(Ordering::SeqCst)
}

/// GPU 정보 가져오기
pub fn get_gpu_info() -> Result<String> {
    // GPU 컨텍스트 읽기
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        let info = match &*ctx_guard {
            Some(ctx) => {
                json!({
                    "available": GPU_AVAILABLE.load(Ordering::SeqCst),
                    "acceleration_enabled": GPU_INITIALIZED.load(Ordering::SeqCst),
                    "name": ctx.device_name,
                    "vendor": ctx.vendor_name,
                    "driver_info": ctx.driver_info,
                    "device_type": format!("{:?}", ctx.backend_type),
                    "backend": format!("{:?}", ctx.backend_type),
                    "compute_supported": ctx.compute_supported,
                    "timestamp": SystemTime::now()
                        .duration_since(SystemTime::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                })
            },
            None => {
                json!({
                    "available": false,
                    "acceleration_enabled": false,
                    "name": "Unknown",
                    "vendor": "Unknown",
                    "driver_info": "Not available",
                    "device_type": "None",
                    "backend": "None",
                    "compute_supported": false,
                    "timestamp": SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                })
            }
        };
        
        return Ok(info.to_string());
    }
    
    // GPU 컨텍스트에 접근할 수 없는 경우
    Err(Error::from_reason("GPU 컨텍스트에 접근할 수 없습니다"))
}

/// GPU 장치 정보 가져오기
pub fn get_device_info() -> Result<GpuDeviceInfo> {
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            let device_info = GpuDeviceInfo {
                name: ctx.device_name.clone(),
                vendor: ctx.vendor_name.clone(),
                driver_info: ctx.driver_info.clone(),
                device_type: wgpu::DeviceType::Other, // 실제 구현에서는 적절한 값 설정
                backend: wgpu::Backend::Gl, // 실제 구현에서는 적절한 값 설정
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            };
            return Ok(device_info);
        }
    }
    
    Err(Error::from_reason("GPU 장치 정보를 찾을 수 없습니다"))
}

/// GPU 기능 정보 가져오기
pub fn get_capabilities() -> Result<TypesGpuCapabilities> {
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            let caps = TypesGpuCapabilities {
                max_buffer_size: 16777216, // 16MB
                max_compute_workgroups: [65535, 65535, 65535], // x, y, z dimensions
                max_invocations: 1024,
                supports_timestamp_query: false,
                supports_pipeline_statistics_query: false,
                compute_supported: ctx.compute_supported,
                shading_supported: true,
            };
            return Ok(caps);
        }
    }
    
    Err(Error::from_reason("GPU 기능 정보를 찾을 수 없습니다"))
}

/// GPU 컨텍스트에서 특정 작업 수행
pub fn with_gpu_context<F, T>(operation: F) -> Result<T>
where
    F: FnOnce(&GpuContext) -> Result<T>,
{
    // GPU 컨텍스트 가져오기
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            // 작업 실행
            return operation(ctx);
        }
    }
    
    Err(Error::from_reason("GPU 컨텍스트를 찾을 수 없습니다"))
}

// GPU 컨텍스트 정리 (종료 시 호출됨)
pub fn cleanup_gpu_context() -> Result<()> {
    if is_gpu_initialized() {
        debug!("GPU 컨텍스트 정리 중...");
        
        // 구체적인 정리 작업 (백엔드별로 다름)
        if let Ok(mut ctx_guard) = GPU_CONTEXT.write() {
            // 리소스 해제
            *ctx_guard = None;
            GPU_INITIALIZED.store(false, Ordering::SeqCst);
            GPU_AVAILABLE.store(false, Ordering::SeqCst);
            
            debug!("GPU 컨텍스트 정리 완료");
        }
    }
    
    Ok(())
}
