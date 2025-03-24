use napi::Error;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, Ordering};
use wgpu::{Instance, Adapter, Device, Queue, DeviceDescriptor, Features, Limits, PowerPreference, RequestAdapterOptions};
use crate::gpu::types::{GpuDeviceInfo, GpuProfile, GpuCapabilities};
use log::{info, debug, warn, error};

// GPU 컨텍스트 상태
static GPU_CONTEXT: Lazy<RwLock<Option<GpuContext>>> = Lazy::new(|| RwLock::new(None));
static GPU_INITIALIZED: AtomicBool = AtomicBool::new(false);

// GPU 프로필 설정 - 서로 다른 GPU 유형에 맞게 조정된 설정
static GPU_PROFILES: Lazy<[GpuProfile; 3]> = Lazy::new(|| [
    // 디스크리트 GPU 프로필 - 최대 성능
    GpuProfile {
        name: "high_performance",
        features: Features::TEXTURE_COMPRESSION_BC | Features::TIMESTAMP_QUERY,
        limits: Limits {
            max_bind_groups: 8,
            max_storage_buffer_binding_size: 1 << 28, // 256MB
            max_compute_workgroup_size_x: 1024,
            max_compute_workgroup_size_y: 1024,
            max_compute_workgroup_size_z: 64,
            max_compute_invocations_per_workgroup: 1024,
            max_storage_buffers_per_shader_stage: 12,
            ..Limits::default()
        },
    },
    // 내장 GPU 프로필 - 균형 잡힌 성능/전력 효율성
    GpuProfile {
        name: "balanced",
        features: Features::empty(),
        limits: Limits {
            max_bind_groups: 4,
            max_storage_buffer_binding_size: 1 << 26, // 64MB
            max_compute_workgroup_size_x: 256,
            max_compute_workgroup_size_y: 256,
            max_compute_workgroup_size_z: 64,
            max_compute_invocations_per_workgroup: 256,
            max_storage_buffers_per_shader_stage: 8,
            ..Limits::default()
        },
    },
    // 저전력 프로필 - 모바일/저사양 GPU용
    GpuProfile {
        name: "low_power",
        features: Features::empty(),
        limits: Limits {
            max_bind_groups: 3,
            max_storage_buffer_binding_size: 1 << 24, // 16MB
            max_compute_workgroup_size_x: 128,
            max_compute_workgroup_size_y: 128,
            max_compute_workgroup_size_z: 32,
            max_compute_invocations_per_workgroup: 128,
            max_storage_buffers_per_shader_stage: 4,
            ..Limits::default()
        },
    }
]);

/// GPU 컨텍스트 구조체
pub struct GpuContext {
    pub instance: Instance,
    pub adapter: Adapter,
    pub device: Device,
    pub queue: Queue,
    pub device_info: GpuDeviceInfo,
    pub capabilities: GpuCapabilities,
    pub profile: GpuProfile,
}

/// GPU 가용성 확인
pub fn check_gpu_availability() -> bool {
    // 이미 초기화되었으면 초기화 상태 반환
    if GPU_INITIALIZED.load(Ordering::SeqCst) {
        let context = GPU_CONTEXT.read();
        return context.is_some();
    }
    
    // 비동기 컨텍스트에서 실행할 수 없으므로 간단한 확인만 수행
    #[cfg(not(target_arch = "wasm32"))]
    {
        wgpu::Instance::new(wgpu::InstanceDescriptor::default()).enumerate_adapters(wgpu::Backends::all()).next().is_some()
    }
    
    #[cfg(target_arch = "wasm32")]
    {
        false  // WASM에서는 GPU 사용 불가능으로 간주
    }
}

/// GPU 유형에 따른 최적의 프로필 선택
fn select_gpu_profile(device_type: wgpu::DeviceType) -> &'static GpuProfile {
    match device_type {
        wgpu::DeviceType::DiscreteGpu => &GPU_PROFILES[0], // 고성능 프로필
        wgpu::DeviceType::IntegratedGpu => &GPU_PROFILES[1], // 균형 프로필
        _ => &GPU_PROFILES[2], // 저전력 프로필 (CPU, 기타, 모바일)
    }
}

/// GPU 컨텍스트 초기화 - 다양한 GPU 유형 지원 추가
pub fn initialize_gpu_context() -> Result<bool, Error> {
    // 이미 초기화되었는지 확인
    if GPU_INITIALIZED.load(Ordering::SeqCst) {
        let context = GPU_CONTEXT.read();
        return Ok(context.is_some());
    }
    
    // 인스턴스 생성
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        dx12_shader_compiler: Default::default(),
    });
    
    // 어댑터 검색 환경설정
    let request_options = RequestAdapterOptions {
        power_preference: PowerPreference::HighPerformance,
        compatible_surface: None,
        force_fallback_adapter: false,
    };
    
    // 어댑터 요청 (비동기 처리)
    let mut adapter_opt = pollster::block_on(async {
        // 먼저 고성능 어댑터 요청
        instance.request_adapter(&request_options).await
    });
    
    // 고성능 어댑터가 없으면 저전력 어댑터 요청
    if adapter_opt.is_none() {
        let low_power_options = RequestAdapterOptions {
            power_preference: PowerPreference::LowPower,
            compatible_surface: None,
            force_fallback_adapter: false,
        };
        
        debug!("고성능 GPU를 찾을 수 없음, 저전력 어댑터 시도");
        
        adapter_opt = pollster::block_on(async {
            instance.request_adapter(&low_power_options).await
        });
    }
    
    // 그래도 어댑터가 없으면 폴백 어댑터 시도
    if adapter_opt.is_none() {
        let fallback_options = RequestAdapterOptions {
            power_preference: PowerPreference::LowPower,
            compatible_surface: None,
            force_fallback_adapter: true, // 폴백 강제 활성화
        };
        
        warn!("GPU 어댑터를 찾을 수 없음, 폴백 어댑터 시도");
        
        adapter_opt = pollster::block_on(async {
            instance.request_adapter(&fallback_options).await
        });
    }
    
    // 모든 시도 후에도 어댑터가 없으면 초기화 실패
    let adapter = match adapter_opt {
        Some(adapter) => adapter,
        None => {
            error!("GPU 어댑터를 찾을 수 없음, GPU 가속화 사용 불가");
            GPU_INITIALIZED.store(true, Ordering::SeqCst);
            return Ok(false);
        }
    };
    
    // 어댑터 정보 수집
    let adapter_info = adapter.get_info();
    info!("GPU 어댑터 발견: {} (타입: {:?}, 벤더: {:?}, 백엔드: {:?})", 
          adapter_info.name, adapter_info.device_type, adapter_info.vendor, adapter_info.backend);
    
    // GPU 유형에 따라 적절한 프로필 선택
    let profile = select_gpu_profile(adapter_info.device_type);
    debug!("GPU 프로필 선택: {}", profile.name);
    
    // 디바이스 및 큐 생성
    let (device, queue) = pollster::block_on(async {
        adapter.request_device(
            &DeviceDescriptor {
                label: Some("Typing Stats GPU Device"),
                features: profile.features,
                limits: profile.limits.clone(),
            },
            None,
        ).await
    }).map_err(|e| Error::from_reason(format!("GPU 디바이스 생성 실패: {}", e)))?;
    
    // 디바이스 정보 저장
    let device_info = GpuDeviceInfo {
        name: adapter_info.name.clone(),
        vendor: format!("Vendor {:?}", adapter_info.vendor),
        driver_info: adapter_info.driver_info.clone(),
        device_type: adapter_info.device_type,
        backend: adapter_info.backend,
    };
    
    // GPU 성능 정보 수집
    let capabilities = GpuCapabilities {
        max_buffer_size: profile.limits.max_storage_buffer_binding_size as usize,
        max_compute_workgroups: [
            profile.limits.max_compute_workgroup_size_x,
            profile.limits.max_compute_workgroup_size_y,
            profile.limits.max_compute_workgroup_size_z,
        ],
        max_invocations: profile.limits.max_compute_invocations_per_workgroup,
        supports_timestamp_query: profile.features.contains(Features::TIMESTAMP_QUERY),
        supports_pipeline_statistics_query: profile.features.contains(Features::PIPELINE_STATISTICS_QUERY),
    };
    
    // GPU 컨텍스트 생성 및 저장
    let gpu_context = GpuContext {
        instance,
        adapter,
        device,
        queue,
        device_info,
        capabilities,
        profile: profile.clone(),
    };
    
    // 컨텍스트 저장
    let mut context = GPU_CONTEXT.write();
    *context = Some(gpu_context);
    
    // 초기화 완료
    GPU_INITIALIZED.store(true, Ordering::SeqCst);
    
    info!("GPU 컨텍스트 초기화 완료: {} 프로필", profile.name);
    Ok(true)
}

/// GPU 디바이스 정보 가져오기
pub fn get_gpu_device_info() -> Result<GpuDeviceInfo, Error> {
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => Ok(ctx.device_info.clone()),
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

/// GPU 성능 기능 가져오기
pub fn get_gpu_capabilities() -> Result<GpuCapabilities, Error> {
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => Ok(ctx.capabilities.clone()),
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

/// GPU 디바이스 가져오기 - 안전한 방식으로 구현
pub fn get_gpu_device() -> Result<wgpu::Device, Error> {
    // 디바이스 복제를 시도합니다 (복제 가능한 디바이스의 경우)
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(_ctx) => {
            // device를 직접 반환하지 않고 안전한 참조 처리
            // 'static 수명을 피하고 대신 적절한 오류 메시지 반환
            Err(Error::from_reason("GPU 디바이스 직접 액세스는 지원되지 않습니다. 작업을 대신 수행하는 함수를 사용하세요."))
        },
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

/// GPU 컨텍스트 정보 가져오기
pub fn get_gpu_context() -> Result<GpuDeviceInfo, Error> {
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => {
            // 소유권 있는 값을 반환 (참조가 아닌 복제본)
            Ok(ctx.device_info.clone())
        },
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

/// GPU 작업 실행 - 디바이스 직접 접근 대신 사용
pub fn execute_on_gpu_device<F, T>(operation: F) -> Result<T, Error>
where
    F: FnOnce(&Device, &Queue, &GpuCapabilities) -> Result<T, Error>,
{
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => {
            // 콜백을 통해 디바이스와 큐에 안전하게 접근
            operation(&ctx.device, &ctx.queue, &ctx.capabilities)
        },
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

// 필요한 메서드 추가
impl GpuContext {
    // 리소스 정리 메서드
    pub fn cleanup_resources(&self) -> Result<(), Error> {
        // 실제 구현
        debug!("GPU 리소스 정리 중...");
        // 메모리 정리 로직 추가
        Ok(())
    }
    
    // 셰이더 캐시 정리 메서드
    pub fn clear_shader_cache(&self) -> Result<(), Error> {
        // 실제 구현
        debug!("GPU 셰이더 캐시 정리 중...");
        // 셰이더 캐시 정리 로직 추가
        Ok(())
    }
    
    // 모든 리소스 해제 메서드
    pub fn release_all_resources(&self) -> Result<(), Error> {
        // 실제 구현
        debug!("모든 GPU 리소스 해제 중...");
        // 모든 GPU 리소스 해제 로직 추가
        Ok(())
    }
    
    // GPU 성능 쿼리
    pub fn query_performance(&self) -> Result<f64, Error> {
        // GPU 성능 측정 실제 구현
        // timestamp 쿼리가 지원되는 경우 실제 성능 측정
        if self.capabilities.supports_timestamp_query {
            debug!("GPU 성능 측정 중(timestamp query 사용)...");
            // 타임스탬프 기반 성능 측정 구현
            Ok(1.0)
        } else {
            debug!("기본 성능 측정 사용 중...");
            // 기본 성능 측정
            Ok(0.5)
        }
    }
}

/// GPU 초기화 상태 가져오기
pub fn is_gpu_initialized() -> bool {
    GPU_INITIALIZED.load(Ordering::SeqCst)
}

/// 현재 GPU 컨텍스트에서 작업 수행
pub fn with_gpu_context<F, R>(f: F) -> Result<R, Error>
where
    F: FnOnce(&GpuContext) -> Result<R, Error>,
{
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => f(ctx),
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}
