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
    F: FnOnce(&Device, &Queue) -> Result<T, Error>,
{
    let context = GPU_CONTEXT.read();
    
    match &*context {
        Some(ctx) => {
            // 콜백을 통해 디바이스와 큐에 안전하게 접근
            operation(&ctx.device, &ctx.queue)
        },
        None => Err(Error::from_reason("GPU 컨텍스트가 초기화되지 않았습니다"))
    }
}

// 필요한 메서드 추가
impl GpuContext {
    // 리소스 정리 메서드
    pub fn cleanup_resources(&self) -> Result<(), Error> {
        // 실제 구현
        // 메모리 정리 로직 추가
        Ok(())
    }
    
    // 셰이더 캐시 정리 메서드
    pub fn clear_shader_cache(&self) -> Result<(), Error> {
        // 실제 구현
        // 셰이더 캐시 정리 로직 추가
        Ok(())
    }
    
    // 모든 리소스 해제 메서드
    pub fn release_all_resources(&self) -> Result<(), Error> {
        // 실제 구현
        // 모든 GPU 리소스 해제 로직 추가
        Ok(())
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
