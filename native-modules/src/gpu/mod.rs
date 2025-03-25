use napi::Error;
use napi_derive::napi;
use log::{info, debug, error, warn};
use serde_json::json;

// 모듈 선언
pub mod shader;
pub mod context;
pub mod types;
pub mod accelerator;
pub mod computation;

// Result 타입 정의
pub type Result<T> = std::result::Result<T, Error>;

// GPU 작업 유형 열거형
#[napi]
#[derive(Debug)]
pub enum GpuTaskType {
    TextAnalysis = 0,
    PatternDetection = 1,
    ImageProcessing = 2,
    DataAggregation = 3,
    TypingStatistics = 4,
}

// GPU 유형 열거형
#[napi]
pub enum GPUType {
    Integrated = 0,
    Discrete = 1,
    Software = 2,
    Unknown = 3,
}

/// GPU 작업 실행 함수
/// 
/// 지정된 작업 유형에 따라 GPU 작업을 실행합니다.
#[napi]
pub fn execute_gpu_task(task_type: GpuTaskType, data: String) -> napi::Result<String> {
    debug!("GPU 작업 실행: {:?}", task_type);
    
    // GPU 기능 확인
    let capabilities = match context::get_capabilities() {
        Ok(caps) => Some(caps),
        Err(e) => {
            warn!("GPU 기능 정보를 가져올 수 없음: {}", e);
            None
        }
    };
    
    // 작업 유형에 따른 처리 함수 선택
    let result = match task_type {
        GpuTaskType::TextAnalysis => {
            computation::text::perform_text_analysis(&data, capabilities.as_ref())
        },
        GpuTaskType::PatternDetection => {
            computation::pattern::perform_pattern_detection(&data, capabilities.as_ref())
        },
        GpuTaskType::ImageProcessing => {
            computation::image::perform_image_processing(&data, capabilities.as_ref())
        },
        GpuTaskType::DataAggregation => {
            computation::data::perform_data_aggregation(&data, capabilities.as_ref())
        },
        GpuTaskType::TypingStatistics => {
            computation::typing::perform_typing_statistics(&data, capabilities.as_ref())
        },
    };
    
    // 결과 처리
    match result {
        Ok(result) => {
            let json_result = json!({
                "success": true,
                "result": result,
                "task_type": task_type as i32,
                "timestamp": get_timestamp()
            });
            
            Ok(json_result.to_string())
        },
        Err(e) => {
            error!("GPU 작업 실행 실패: {}", e);
            let error_json = json!({
                "success": false,
                "error": e.to_string(),
                "task_type": task_type as i32,
                "timestamp": get_timestamp()
            });
            
            Ok(error_json.to_string())
        }
    }
}

/// GPU 정보 가져오기
#[napi]
pub fn get_gpu_info() -> napi::Result<String> {
    let is_initialized = accelerator::is_gpu_initialized();
    
    let info = json!({
        "available": is_initialized,
        "acceleration_enabled": is_initialized && accelerator::is_acceleration_enabled(),
        "driver_version": accelerator::get_driver_version(),
        "device_name": accelerator::get_device_name(),
        "device_type": match accelerator::get_device_type() {
            0 => "Integrated",
            1 => "Discrete",
            2 => "Software",
            _ => "Unknown"
        },
        "vendor": accelerator::get_vendor_name(),
        "timestamp": get_timestamp()
    });
    
    Ok(info.to_string())
}

/// GPU 초기화
#[napi]
pub fn initialize_gpu_module() -> napi::Result<bool> {
    info!("GPU 모듈 초기화 시작");
    
    // 이미 초기화되었는지 확인
    if accelerator::is_gpu_initialized() {
        debug!("GPU 모듈이 이미 초기화됨");
        return Ok(true);
    }
    
    // GPU 가속화 초기화
    match accelerator::initialize_gpu() {
        Ok(result) => {
            info!("GPU 초기화 완료: {}", result);
            Ok(result)
        },
        Err(e) => {
            error!("GPU 초기화 실패: {}", e);
            Err(Error::from_reason(format!("GPU 초기화 실패: {}", e)))
        }
    }
}

/// 셰이더 컴파일 함수
#[napi]
pub fn compile_shader_code(source: String, shader_type: String) -> napi::Result<String> {
    info!("셰이더 컴파일 요청: {}", shader_type);
    
    // GPU 모듈이 초기화되었는지 확인
    if !accelerator::is_gpu_initialized() {
        return Err(Error::from_reason("GPU 모듈이 초기화되지 않음"));
    }
    
    // 셰이더 타입 문자열을 enum으로 변환
    let shader_type_enum = match shader_type.as_str() {
        "compute" => shader::ShaderType::Compute,
        "vertex" => shader::ShaderType::Vertex,
        "fragment" => shader::ShaderType::Fragment,
        "geometry" => shader::ShaderType::Geometry,
        _ => return Err(Error::from_reason(format!("지원되지 않는 셰이더 타입: {}", shader_type)))
    };
    
    // ShaderSource 구조체 생성
    let shader_source = shader::ShaderSource {
        code: source.clone(),
        language: shader::ShaderLanguage::GLSL, // 기본값으로 GLSL 사용, 필요시 변경
        entry_point: "main".to_string(), // 기본 진입점, 필요시 변경
    };
    
    // 셰이더 이름 생성 (타임스탬프 + 타입)
    let shader_name = format!("shader_{}_{}", get_timestamp(), shader_type);
    
    // 셰이더 컴파일 함수 호출 - 3개 인자 전달
    match shader::compile_shader(&shader_name, &shader_source, shader_type_enum) {
        Ok(compiled) => {
            let result = json!({
                "success": true,
                "compiled": true,
                "shader_type": shader_type,
                "shader_name": shader_name,
                "compile_time_ms": compiled.compile_time_ms,
                "timestamp": get_timestamp()
            });
            
            Ok(result.to_string())
        },
        Err(e) => {
            error!("셰이더 컴파일 실패: {}", e);
            let error_json = json!({
                "success": false,
                "error": e.to_string(),
                "shader_type": shader_type,
                "timestamp": get_timestamp()
            });
            
            Ok(error_json.to_string())
        }
    }
}

// 현재 타임스탬프 가져오기
fn get_timestamp() -> u64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}
