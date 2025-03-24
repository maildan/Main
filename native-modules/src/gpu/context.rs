use napi::Error;
use parking_lot::RwLock;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicBool, Ordering};
use wgpu::{Instance, Adapter, Device, Queue, DeviceDescriptor, Features, Limits};
use crate::gpu::types::GpuDeviceInfo;

// GPU 컨텍스트 상태
static GPU_CONTEXT: Lazy<RwLock<Option<GpuContext>>> = Lazy::new(|| RwLock::new(None));
static GPU_INITIALIZED: AtomicBool = AtomicBool::new(false);

/// GPU 컨텍스트 구조체
pub struct GpuContext {
    pub instance: Instance,
    pub adapter: Adapter,
    pub device: Device,
    pub queue: Queue,
    pub device_info: GpuDeviceInfo,
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

/// GPU 컨텍스트 초기화
pub fn initialize_gpu_context() -> Result<bool, Error> {
    // 이미 초기화되었는지 확인
    if GPU_INITIALIZED.load(Ordering::SeqCst) {
        let context = GPU_CONTEXT.read();
        return Ok(context.is_some());
    }
    
    // 비동기 GPU 초기화는 여기서 처리하기 어려움
    // pollster를 사용한 간단한 구현
    
    // 인스턴스 생성
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::default());
    
    // 어댑터 찾기
    let adapter_opt = pollster::block_on(async {
        instance.request_adapter(
            &wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            },
        ).await
    });
    
    let adapter = match adapter_opt {
        Some(adapter) => adapter,
        None => {
            GPU_INITIALIZED.store(true, Ordering::SeqCst);
            return Ok(false);
        }
    };
    
    // 디바이스 및 큐 생성
    let (device, queue) = pollster::block_on(async {
        adapter.request_device(
            &DeviceDescriptor {
                label: Some("Typing Stats GPU Device"),
                features: Features::empty(),
                limits: Limits::default(),
            },
            None,
        ).await
    }).map_err(|e| Error::from_reason(format!("GPU 디바이스 생성 실패: {}", e)))?;
    
    // 디바이스 정보 저장
    let adapter_info = adapter.get_info();
    let device_info = GpuDeviceInfo {
        name: adapter_info.name,
        vendor: format!("Vendor {:?}", adapter_info.vendor),
        driver_info: adapter_info.driver_info,
        device_type: adapter_info.device_type,
        backend: adapter_info.backend,
    };
    
    // GPU 컨텍스트 생성 및 저장
    let gpu_context = GpuContext {
        instance,
        adapter,
        device,
        queue,
        device_info,
    };
    
    // 컨텍스트 저장
    let mut context = GPU_CONTEXT.write();
    *context = Some(gpu_context);
    
    // 초기화 완료
    GPU_INITIALIZED.store(true, Ordering::SeqCst);
    
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

/// GPU 디바이스 가져오기
pub fn get_gpu_device() -> Result<(&'static Device, &'static Queue), Error> {
    // 스태틱 참조를 사용하기 위해 Box::leak을 사용
    let context_guard = GPU_CONTEXT.read();
    
    match &*context_guard {
        Some(ctx) => {
            // 참조를 스태틱 수명으로 변환 (누수를 발생시키지만, 싱글톤이므로 괜찮음)
            let device_ref: &'static Device = unsafe { std::mem::transmute(&ctx.device) };
            let queue_ref: &'static Queue = unsafe { std::mem::transmute(&ctx.queue) };
            
            Ok((device_ref, queue_ref))
        },
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

/// GPU 초기화 상태 가져오기
pub fn is_gpu_initialized() -> bool {
    GPU_INITIALIZED.load(Ordering::SeqCst)
}
