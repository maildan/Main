use napi::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Once;
use std::collections::HashMap;
use log::{debug, warn, info};
use serde_json::json;
use std::sync::RwLock;
use once_cell::sync::Lazy;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::gpu::types::{GpuDeviceInfo, GpuCapabilities as TypesGpuCapabilities};
use crate::gpu::Result;
use serde::{Serialize, Deserialize};

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
    pub driver_version: String,
    pub features: HashMap<String, bool>,
    pub limits: HashMap<String, u64>,
    pub is_discrete: bool,
    pub compute_supported: bool,
    pub timestamp: u64,
    pub profile_name: String,
    pub performance_class: u8, // 1-저성능, 2-중간, 3-고성능
}

// 기본 GPU 컨텍스트 구현
impl Default for GpuContext {
    fn default() -> Self {
        let mut features = HashMap::new();
        features.insert("compute_shader".to_string(), false);
        features.insert("storage_buffer".to_string(), false);
        features.insert("tessellation".to_string(), false);
        features.insert("float64".to_string(), false);
        
        let mut limits = HashMap::new();
        limits.insert("max_buffer_size".to_string(), 128 * 1024 * 1024); // 128MB
        limits.insert("max_compute_workgroups".to_string(), 65535);
        limits.insert("max_uniform_buffer_binding_size".to_string(), 16384);
        
        Self {
            backend_type: GpuBackendType::Uninitialized,
            vendor_name: "Unknown".to_string(),
            device_name: "Software Renderer".to_string(),
            driver_version: "1.0".to_string(),
            features,
            limits,
            is_discrete: false,
            compute_supported: false,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            profile_name: "basic".to_string(),
            performance_class: 1,
        }
    }
}

// GpuContext 메서드 구현 추가
impl GpuContext {
    // 백엔드 타입에 따른 프로필 선택
    pub fn select_profile(&mut self) {
        // GPU 성능과 특성에 따라 프로필 선택
        let is_high_performance = self.is_discrete && 
            (self.vendor_name.contains("NVIDIA") || 
             self.vendor_name.contains("AMD") || 
             self.device_name.contains("RTX") || 
             self.device_name.contains("Radeon"));
        
        let is_medium_performance = 
            (!self.is_discrete && self.vendor_name.contains("Intel")) || 
            (self.is_discrete && !is_high_performance);
        
        if is_high_performance {
            self.profile_name = "high_performance".to_string();
            self.performance_class = 3;
        } else if is_medium_performance {
            self.profile_name = "balanced".to_string();
            self.performance_class = 2;
        } else {
            self.profile_name = "power_saving".to_string();
            self.performance_class = 1;
        }
    }
    
    // JSON 형태로 변환
    pub fn to_json(&self) -> String {
        let features_json = self.features.iter()
            .map(|(k, v)| (k.clone(), json!(v)))
            .collect::<HashMap<_, _>>();
            
        let limits_json = self.limits.iter()
            .map(|(k, v)| (k.clone(), json!(v)))
            .collect::<HashMap<_, _>>();
        
        json!({
            "backend": format!("{:?}", self.backend_type),
            "vendor": self.vendor_name,
            "device": self.device_name,
            "driver": self.driver_version,
            "is_discrete": self.is_discrete,
            "compute_supported": self.compute_supported,
            "features": features_json,
            "limits": limits_json,
            "timestamp": self.timestamp,
            "profile": self.profile_name,
            "performance_class": self.performance_class
        }).to_string()
    }
    
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
/// Chrome의 다중 백엔드 접근 방식과 유사하게, 가용한 최고의 GPU 백엔드를 선택합니다.
pub fn initialize_gpu_context() -> Result<bool> {
    let mut success = false;
    
    // 이미 초기화된 경우 즉시 반환
    if GPU_INITIALIZED.load(Ordering::SeqCst) {
        return Ok(true);
    }
    
    // 한 번만 초기화 시도
    INITIALIZATION_COMPLETE.call_once(|| {
        info!("GPU 컨텍스트 초기화 시작");
        
        // 최적의 GPU 백엔드 탐색
        match detect_best_gpu_backend() {
            Ok(backend_info) => {
                debug!("감지된 GPU 백엔드: {:?}", backend_info.backend_type);
                
                // 컨텍스트 설정
                let mut context = GpuContext {
                    backend_type: backend_info.backend_type,
                    vendor_name: backend_info.vendor,
                    device_name: backend_info.device,
                    driver_version: backend_info.driver,
                    compute_supported: backend_info.compute_supported,
                    is_discrete: backend_info.backend_type != GpuBackendType::Software,
                    ..GpuContext::default()
                };
                
                // 특성과 한계 복사
                for (key, value) in backend_info.features {
                    context.features.insert(key, value);
                }
                
                for (key, value) in backend_info.limits {
                    context.limits.insert(key, value as u64);
                }
                
                // 프로필 선택
                context.select_profile();
                
                // 전역 상태 업데이트
                if let Ok(mut ctx_guard) = GPU_CONTEXT.write() {
                    *ctx_guard = Some(context);
                }
                
                // 초기화 완료 표시
                GPU_INITIALIZED.store(true, Ordering::SeqCst);
                GPU_AVAILABLE.store(true, Ordering::SeqCst);
                info!("GPU 컨텍스트 초기화 성공");
                success = true;
            },
            Err(e) => {
                warn!("GPU 백엔드 감지 실패: {}", e);
                
                // 소프트웨어 폄백 컨텍스트 생성
                let fallback_context = GpuContext {
                    backend_type: GpuBackendType::Software,
                    device_name: "Software Renderer".to_string(),
                    vendor_name: "Software".to_string(),
                    ..GpuContext::default()
                };
                
                // 전역 상태 업데이트
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
/// Chrome과 유사하게 여러 백엔드를 시도하고 최적의 것을 선택
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
    
    // 모든 백엔드 시도 실패 시 오류 반환
    Err(Error::from_reason("모든 GPU 백엔드 초기화 실패"))
}

// 더미 함수 (실제로는 백엔드별 구현 필요)
fn try_initialize_vulkan() -> Result<BackendInfo> {
    debug!("Vulkan 백엔드 초기화 시도");
    
    // wgpu를 통한 Vulkan 초기화 시도 (실제 구현에서는 확장)
    // 이 예제에서는 단순히 정보 구성
    let mut features = HashMap::new();
    features.insert("compute_shader".to_string(), true);
    features.insert("storage_buffer".to_string(), true);
    features.insert("tessellation".to_string(), true);
    
    let mut limits = HashMap::new();
    limits.insert("max_buffer_size".to_string(), 512 * 1024 * 1024); // 512MB
    limits.insert("max_compute_workgroups".to_string(), 65535);
    
    Ok(BackendInfo {
        backend_type: GpuBackendType::Vulkan,
        vendor: "Generic Vulkan Device".to_string(),
        device: "Vulkan Compatible GPU".to_string(),
        driver: "Unknown".to_string(),
        compute_supported: true,
        features,
        limits,
    })
}

#[cfg(target_os = "windows")]
fn try_initialize_directx() -> Result<BackendInfo> {
    debug!("DirectX 백엔드 초기화 시도");
    
    // Windows 특화 DirectX 초기화
    let mut features = HashMap::new();
    features.insert("compute_shader".to_string(), true);
    features.insert("tessellation".to_string(), true);
    
    let mut limits = HashMap::new();
    limits.insert("max_buffer_size".to_string(), 256 * 1024 * 1024); // 256MB
    
    Ok(BackendInfo {
        backend_type: GpuBackendType::DirectX,
        vendor: "DirectX Compatible Device".to_string(),
        device: "Windows GPU".to_string(),
        driver: "System Driver".to_string(),
        compute_supported: true,
        features,
        limits,
    })
}

#[cfg(target_os = "macos")]
fn try_initialize_metal() -> Result<BackendInfo> {
    debug!("Metal 백엔드 초기화 시도");
    
    // macOS 특화 Metal 초기화
    let mut features = HashMap::new();
    features.insert("compute_shader".to_string(), true);
    
    let mut limits = HashMap::new();
    limits.insert("max_buffer_size".to_string(), 256 * 1024 * 1024); // 256MB
    
    Ok(BackendInfo {
        backend_type: GpuBackendType::Metal,
        vendor: "Apple".to_string(),
        device: "Metal Compatible GPU".to_string(),
        driver: "System Driver".to_string(),
        compute_supported: true,
        features,
        limits,
    })
}

fn try_initialize_opengl() -> Result<BackendInfo> {
    debug!("OpenGL 백엔드 초기화 시도");
    
    // 폴백용 OpenGL 초기화
    let mut features = HashMap::new();
    features.insert("compute_shader".to_string(), false);
    
    let mut limits = HashMap::new();
    limits.insert("max_buffer_size".to_string(), 128 * 1024 * 1024); // 128MB
    
    Ok(BackendInfo {
        backend_type: GpuBackendType::OpenGL,
        vendor: "OpenGL Compatible Device".to_string(),
        device: "Generic GPU".to_string(),
        driver: "OpenGL Driver".to_string(),
        compute_supported: false,
        features,
        limits,
    })
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
    // 초기화 확인
    if !is_gpu_initialized() {
        initialize_gpu_context()?;
    }
    
    // GPU 컨텍스트 읽기
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            Ok(ctx.to_json())
        } else {
            Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않음"))
        }
    } else {
        Err(Error::from_reason("GPU 컨텍스트를 읽을 수 없음"))
    }
}

/// GPU 장치 정보 가져오기
pub fn get_device_info() -> Result<GpuDeviceInfo> {
    // 초기화 확인
    if !is_gpu_initialized() {
        initialize_gpu_context()?;
    }
    
    // GPU 컨텍스트 읽기
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            // 자체 정의한 DeviceType 사용
            let device_type = if ctx.is_discrete {
                DeviceType::DiscreteGpu
            } else {
                DeviceType::IntegratedGpu
            };
            
            // 자체 정의한 Backend 사용
            let backend = match ctx.backend_type {
                GpuBackendType::Vulkan => Backend::Vulkan,
                GpuBackendType::Metal => Backend::Metal, 
                GpuBackendType::DirectX => Backend::Dx12,  // 오타 수정됨
                GpuBackendType::OpenGL => Backend::Gl,
                GpuBackendType::WebGPU => Backend::BrowserWebGpu,
                _ => Backend::Empty,
            };
            
            // Convert local types to wgpu types
            let wgpu_device_type = match device_type {
                DeviceType::IntegratedGpu => wgpu::DeviceType::IntegratedGpu,
                DeviceType::DiscreteGpu => wgpu::DeviceType::DiscreteGpu,
                DeviceType::SoftwareRendering => wgpu::DeviceType::Other,
                DeviceType::Cpu => wgpu::DeviceType::Cpu,
                DeviceType::Other => wgpu::DeviceType::Other,
                DeviceType::Unknown => wgpu::DeviceType::Other,
            };
            
            let wgpu_backend = match backend {
                Backend::Empty => wgpu::Backend::Empty,
                Backend::Vulkan => wgpu::Backend::Vulkan,
                Backend::Metal => wgpu::Backend::Metal,
                Backend::Dx12 => wgpu::Backend::Dx12,
                Backend::Dx11 => wgpu::Backend::Dx11,
                Backend::Gl => wgpu::Backend::Gl,
                Backend::BrowserWebGpu => wgpu::Backend::BrowserWebGpu,
                Backend::Software => wgpu::Backend::Empty,
            };
            
            Ok(GpuDeviceInfo {
                name: ctx.device_name.clone(),
                vendor: ctx.vendor_name.clone(),
                driver_info: ctx.driver_version.clone(),
                device_type: wgpu_device_type,
                backend: wgpu_backend,
                timestamp: ctx.timestamp,
            })
        } else {
            Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않음"))
        }
    } else {
        Err(Error::from_reason("GPU 컨텍스트를 읽을 수 없음"))
    }
}

// 임시 DeviceType 및 Backend 열거형 정의 (wgpu 의존성 제거)
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DeviceType {
    IntegratedGpu,
    DiscreteGpu,
    SoftwareRendering,
    Cpu,
    Other,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Backend {
    Empty,
    Vulkan,
    Metal,
    Dx12,
    Dx11,
    Gl,
    BrowserWebGpu,
    Software,
}

impl From<wgpu::DeviceType> for DeviceType {
    fn from(device_type: wgpu::DeviceType) -> Self {
        match device_type {
            wgpu::DeviceType::IntegratedGpu => DeviceType::IntegratedGpu,
            wgpu::DeviceType::DiscreteGpu => DeviceType::DiscreteGpu,
            wgpu::DeviceType::Cpu => DeviceType::Cpu,
            wgpu::DeviceType::Other => DeviceType::Other,
            _ => DeviceType::Unknown,
        }
    }
}

impl From<wgpu::Backend> for Backend {
    fn from(backend: wgpu::Backend) -> Self {
        match backend {
            wgpu::Backend::Empty => Backend::Empty,
            wgpu::Backend::Vulkan => Backend::Vulkan,
            wgpu::Backend::Metal => Backend::Metal,
            wgpu::Backend::Dx12 => Backend::Dx12,
            wgpu::Backend::Dx11 => Backend::Dx11,
            wgpu::Backend::Gl => Backend::Gl,
            wgpu::Backend::BrowserWebGpu => Backend::BrowserWebGpu,
        }
    }
}

/// GPU 성능 정보 가져오기
pub fn get_capabilities() -> Result<TypesGpuCapabilities> {
    // 초기화 확인
    if !is_gpu_initialized() {
        initialize_gpu_context()?;
    }
    
    // GPU 컨텍스트 읽기
    if let Ok(ctx_guard) = GPU_CONTEXT.read() {
        if let Some(ctx) = &*ctx_guard {
            let max_buffer_size = ctx.limits.get("max_buffer_size").unwrap_or(&(128 * 1024 * 1024)).clone() as usize;
            let max_compute_workgroups = ctx.limits.get("max_compute_workgroups").unwrap_or(&65535).clone() as u32;
            
            Ok(TypesGpuCapabilities {
                max_buffer_size,
                max_compute_workgroups: [max_compute_workgroups, max_compute_workgroups, max_compute_workgroups],
                max_invocations: 1024,
                supports_timestamp_query: ctx.features.get("timestamp_query").unwrap_or(&false).clone(),
                supports_pipeline_statistics_query: ctx.features.get("pipeline_statistics_query").unwrap_or(&false).clone(),
                compute_supported: ctx.compute_supported,
                shading_supported: true,
            })
        } else {
            Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않음"))
        }
    } else {
        Err(Error::from_reason("GPU 컨텍스트를 읽을 수 없음"))
    }
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

#[derive(Debug, Serialize, Deserialize)]
pub struct GpuCapabilities {
    pub compute_supported: bool,
    pub shading_supported: bool,
    pub max_compute_size: usize,
    pub max_memory_size: usize,
    pub device_name: String,
    pub device_type: String,
    pub backend_type: String,
}

impl Default for GpuCapabilities {
    fn default() -> Self {
        Self {
            compute_supported: false,
            shading_supported: false,
            max_compute_size: 0,
            max_memory_size: 0,
            device_name: String::from("Unknown"),
            device_type: String::from("Unknown"),
            backend_type: String::from("None"),
        }
    }
}

// Create compute context
pub fn create_compute_context() -> Result<()> {
    // Initialize compute context based on detected capabilities
    log::info!("Creating GPU compute context");
    Ok(())
}

// Create rendering context
pub fn create_rendering_context() -> Result<()> {
    // Initialize rendering context
    log::info!("Creating GPU rendering context");
    Ok(())
}

// Destroy contexts
pub fn destroy_contexts() -> Result<()> {
    // Clean up contexts
    log::info!("Destroying GPU contexts");
    Ok(())
}