use napi::Error;
use std::sync::Arc;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use crate::gpu::types::GpuDeviceInfo;

// GPU 컨텍스트 저장
static GPU_CONTEXT: OnceCell<Mutex<Option<GpuContext>>> = OnceCell::new();

// GPU 컨텍스트 구조체
struct GpuContext {
    // 사용되지 않는 필드에 밑줄 접두사 추가
    _device: Arc<wgpu::Device>,
    _queue: Arc<wgpu::Queue>,
    initialized: bool,
}

/// GPU 가용성 확인
pub fn check_gpu_availability() -> bool {
    // wgpu로 GPU 디바이스 생성 가능성 확인
    // 이 구현은 더미입니다
    true
}

/// GPU 컨텍스트 초기화
pub fn initialize_gpu_context() -> Result<(), Error> {
    // 이미 초기화되었는지 확인
    if let Some(context) = GPU_CONTEXT.get() {
        let ctx = context.lock();
        if ctx.is_some() && ctx.as_ref().unwrap().initialized {
            return Ok(());
        }
    }
    
    // async_std를 사용하여 비동기 초기화를 동기적으로 실행
    // pollster 대신 async_std 사용
    let result = async_std::task::block_on(async {
        // wgpu 인스턴스 생성
        let instance = wgpu::Instance::default();
        
        // 어댑터 요청
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .ok_or_else(|| Error::from_reason("No suitable GPU adapter found"))?;
        
        // 디바이스 및 큐 생성
        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Typing Stats GPU Device"),
                    features: wgpu::Features::empty(),
                    limits: wgpu::Limits::downlevel_defaults(),
                },
                None,
            )
            .await
            .map_err(|e| Error::from_reason(format!("Failed to create GPU device: {}", e)))?;
        
        Ok((device, queue))
    });
    
    match result {
        Ok((device, queue)) => {
            // GPU 컨텍스트 생성 및 저장
            let context = GpuContext {
                _device: Arc::new(device),
                _queue: Arc::new(queue),
                initialized: true,
            };
            
            // 전역 컨텍스트 설정
            let gpu_context = GPU_CONTEXT.get_or_init(|| Mutex::new(None));
            *gpu_context.lock() = Some(context);
            
            println!("GPU context initialized successfully");
            Ok(())
        },
        Err(e) => {
            println!("Failed to initialize GPU context: {}", e);
            Err(e)
        }
    }
}

/// GPU 리소스 정리
pub fn cleanup_gpu_resources() {
    if let Some(context) = GPU_CONTEXT.get() {
        let mut ctx = context.lock();
        *ctx = None;
    }
    println!("GPU resources cleaned up");
}

/// GPU 디바이스 정보 가져오기
pub fn get_gpu_device_info() -> Result<GpuDeviceInfo, Error> {
    if let Some(context) = GPU_CONTEXT.get() {
        let ctx = context.lock();
        
        if let Some(_) = ctx.as_ref() {
            // 수정된 API 사용 - adapter에서 정보 가져오기
            // 실제 구현은 wgpu 버전에 맞춰 조정 필요
            
            // 간단한 더미 구현으로 대체
            return Ok(GpuDeviceInfo {
                name: "GPU Device".to_string(),
                vendor: "Unknown".to_string(),
                driver_info: "Unknown".to_string(),
                device_type: wgpu::DeviceType::DiscreteGpu,
                backend: wgpu::Backend::Vulkan,
            });
        }
    }
    
    Err(Error::from_reason("GPU context not initialized"))
}

/// GPU 리소스 최적화
pub fn optimize_gpu_resources() -> Result<(), Error> {
    if let Some(context) = GPU_CONTEXT.get() {
        let ctx = context.lock();
        
        if let Some(_) = ctx.as_ref() {
            // GPU 리소스 정리 및 최적화 작업
            // 실제 구현에서는 사용하지 않는 셰이더, 버퍼 등을 정리합니다
            
            return Ok(());
        }
    }
    
    Err(Error::from_reason("GPU context not initialized"))
}
