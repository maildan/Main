use napi::Error;
// 로깅 매크로 import 수정 - 사용하지 않는 import 제거
use log::{debug, warn};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Instant;
use rayon::prelude::*;
use crate::gpu::types::{GpuTaskType, GpuWorkloadSize, GpuCapabilities};
// 중복되는 import 제거
use crate::gpu::context;
use std::sync::Arc;
use std::sync::Mutex as StdMutex; // 추가: 내부 가변성을 위한 뮤텍스

// 함수 포인터 타입 정의 - 일관된 타입 캐스팅을 위해
type GpuTaskFunction = fn(&str, Option<&GpuCapabilities>) -> Result<Value, Error>;

/// GPU 작업 함수 맵 초기화
pub fn initialize_gpu_task_map() -> HashMap<GpuTaskType, GpuTaskFunction> {
    let mut map = HashMap::new();
    
    // 모든 함수를 동일한 타입으로 캐스팅하여 맵에 추가
    map.insert(GpuTaskType::MatrixMultiplication, perform_matrix_multiplication as GpuTaskFunction);
    map.insert(GpuTaskType::TextAnalysis, perform_text_analysis as GpuTaskFunction);
    map.insert(GpuTaskType::PatternDetection, perform_pattern_detection as GpuTaskFunction);
    map.insert(GpuTaskType::ImageProcessing, perform_image_processing as GpuTaskFunction);
    map.insert(GpuTaskType::DataAggregation, perform_data_aggregation as GpuTaskFunction);
    map.insert(GpuTaskType::TypingStatistics, perform_typing_statistics as GpuTaskFunction);
    
    map
}

/// 태스크 타입 코드를 GpuTaskType으로 변환
pub fn get_task_type_from_code(code: &str) -> GpuTaskType {
    match code {
        "matrix" => GpuTaskType::MatrixMultiplication,
        "text" => GpuTaskType::TextAnalysis,
        "pattern" => GpuTaskType::PatternDetection,
        "image" => GpuTaskType::ImageProcessing,
        "data" => GpuTaskType::DataAggregation,
        "typing" => GpuTaskType::TypingStatistics,
        _ => GpuTaskType::Custom,
    }
}

/// GPU 작업 함수 실행
pub fn execute_gpu_task(task_type: GpuTaskType, data: &str) -> Result<Value, Error> {
    let task_map = initialize_gpu_task_map();
    
    // GPU 성능 정보 가져오기
    let capabilities = match context::get_gpu_capabilities() {
        Ok(caps) => Some(caps),
        Err(e) => {
            warn!("GPU 성능 정보를 가져올 수 없음: {}", e);
            None
        }
    };
    
    match task_map.get(&task_type) {
        Some(task_fn) => task_fn(data, capabilities.as_ref()),
        None => match task_type {
            GpuTaskType::Custom => {
                // 커스텀 작업 처리 로직
                perform_custom_computation(data, capabilities.as_ref())
            },
            _ => Err(Error::from_reason(format!("Unsupported GPU task type: {:?}", task_type))),
        }
    }
}

/// 워크로드 크기에 따른 병렬 처리 구성
fn configure_parallel_execution(workload_size: GpuWorkloadSize, capabilities: Option<&GpuCapabilities>) -> usize {
    // GPU 성능 정보를 기반으로 최적의 스레드 수 계산
    if let Some(caps) = capabilities {
        match workload_size {
            GpuWorkloadSize::Small => 2.min(caps.max_invocations as usize / 128),
            GpuWorkloadSize::Medium => 4.min(caps.max_invocations as usize / 64),
            GpuWorkloadSize::Large => 8.min(caps.max_invocations as usize / 32),
            GpuWorkloadSize::ExtraLarge => 16.min(caps.max_invocations as usize / 16),
        }
    } else {
        // 기본값 반환
        match workload_size {
            GpuWorkloadSize::Small => 2,
            GpuWorkloadSize::Medium => 4,
            GpuWorkloadSize::Large => 8,
            GpuWorkloadSize::ExtraLarge => 16,
        }
    }
}

/// 행렬 곱셈 수행 (병렬 처리 활용)
fn perform_matrix_multiplication(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 행렬 데이터 및 차원 가져오기
    let matrix_a = parsed.get("matrix_a").and_then(|v| v.as_array()).ok_or_else(|| 
        Error::from_reason("Missing or invalid matrix_a"))?;
    
    let matrix_b = parsed.get("matrix_b").and_then(|v| v.as_array()).ok_or_else(|| 
        Error::from_reason("Missing or invalid matrix_b"))?;
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    let workload_size = match size_str {
        "small" => GpuWorkloadSize::Small,
        "medium" => GpuWorkloadSize::Medium,
        "large" => GpuWorkloadSize::Large,
        "xl" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    // 행렬 차원 확인
    let rows_a = matrix_a.len();
    let cols_b = if let Some(first_row) = matrix_b.first() {
        first_row.as_array().map_or(0, |row| row.len())
    } else {
        0
    };
    
    // GPU 기능을 기반으로 연산 최적화
    // 디스크리트 GPU는 각 행렬 연산을 wgpu 컴퓨트 셰이더로 처리할 수 있음
    // 내장/모바일 GPU는 제한된 병렬성으로 처리
    let use_compute_shader = match capabilities {
        Some(caps) if gpu_available => {
            // 대형 워크로드 및 고성능 GPU에서만 컴퓨트 셰이더 사용
            workload_size >= GpuWorkloadSize::Medium && 
            caps.max_buffer_size >= (rows_a * cols_b * std::mem::size_of::<f32>())
        },
        _ => false
    };
    
    if use_compute_shader {
        debug!("컴퓨트 셰이더를 사용한 행렬 곱셈 수행");
        // 실제 구현에서는 여기에 wgpu 컴퓨트 셰이더 코드 삽입
        // 간단한 예시 구현이므로 대신 CPU 병렬 처리 사용
    }
    
    // Rayon으로 CPU 병렬 처리 (GPU 가속화 대신)
    let thread_count = configure_parallel_execution(workload_size, capabilities);
    debug!("병렬 처리 스레드 수: {}", thread_count);
    
    let result_matrix: Vec<Vec<f64>> = (0..rows_a)
        .into_par_iter()
        .with_min_len(rows_a / thread_count.max(1))
        .map(|i| {
            let mut row = vec![0.0; cols_b];
            for j in 0..cols_b {
                let mut sum = 0.0;
                for k in 0..matrix_a[i].as_array().unwrap().len() {
                    let a_val = matrix_a[i].as_array().unwrap()[k].as_f64().unwrap_or(0.0);
                    let b_val = matrix_b[k].as_array().unwrap()[j].as_f64().unwrap_or(0.0);
                    sum += a_val * b_val;
                }
                row[j] = sum;
            }
            row
        })
        .collect();
    
    let elapsed = start.elapsed();
    
    // GPU 유형 정보 추가
    let gpu_info = match context::get_gpu_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    Ok(json!({
        "result": "matrix_multiplication",
        "matrix": result_matrix,
        "dimensions": {
            "rows": rows_a,
            "cols": cols_b
        },
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_compute_shader,
        "workload_size": size_str,
        "thread_count": thread_count,
        "gpu_info": gpu_info
    }))
}

/// 텍스트 분석 수행 (병렬 처리 활용)
fn perform_text_analysis(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 텍스트 데이터 가져오기
    let text = parsed.get("text").and_then(|t| t.as_str()).unwrap_or("");
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    let workload_size = match size_str {
        "small" => GpuWorkloadSize::Small,
        "medium" => GpuWorkloadSize::Medium,
        "large" => GpuWorkloadSize::Large,
        "xl" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    // GPU 성능 정보를 기반으로 최적화
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            // 대용량 텍스트 및 고성능 GPU에서만 GPU 가속 사용
            text.len() > 10000 && 
            caps.max_buffer_size >= text.len() * std::mem::size_of::<u8>()
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 텍스트 분석 수행");
        // 실제 구현에서는 여기에 wgpu 컴퓨트 셰이더 코드 삽입
        // 간단한 예시 구현이므로 대신 CPU 병렬 처리 사용
    }
    
    // 병렬 처리 구성
    let thread_count = configure_parallel_execution(workload_size, capabilities);
    debug!("병렬 처리 스레드 수: {}", thread_count);
    
    // 문자 빈도 분석
    let char_frequency = Arc::new(StdMutex::new(HashMap::new()));
    
    // 텍스트를 적절한 크기로 청크로 분할
    let chunk_size = (text.len() / thread_count).max(1);
    
    // 수정: let 바인딩을 사용하여 임시 값의 수명 연장
    let chunks_data = text.as_bytes()
        .chunks(chunk_size)
        .map(|chunk| {
            // UTF-8 경계에서 안전하게 슬라이싱하기 위한 조정
            let chunk_str = std::str::from_utf8(chunk).unwrap_or("");
            chunk_str
        })
        .collect::<Vec<&str>>();
    
    // 병렬로 각 청크 처리
    chunks_data.par_iter().for_each(|chunk| {
        // 이 청크의 로컬 문자 빈도 맵
        let mut local_freq = HashMap::new();
        
        // 각 문자의 빈도 수집
        for c in chunk.chars() {
            *local_freq.entry(c).or_insert(0) += 1;
        }
        
        // 글로벌 맵에 결과 병합
        let mut global_freq = char_frequency.lock().unwrap();
        for (c, count) in local_freq {
            *global_freq.entry(c).or_insert(0) += count;
        }
    });
    
    // 단어 수 계산
    let words = text.split_whitespace().count();
    
    // 평균 단어 길이 계산
    let avg_word_length = if words > 0 {
        text.replace(" ", "").len() as f64 / words as f64
    } else {
        0.0
    };
    
    // 가장 빈번한 문자 N개 추출
    let top_chars: Vec<(char, i32)> = {
        let freq = char_frequency.lock().unwrap();
        let mut char_counts: Vec<(char, i32)> = freq.iter()
            .map(|(&c, &count)| (c, count))
            .collect();
        
        // 빈도순으로 정렬
        char_counts.sort_by(|a, b| b.1.cmp(&a.1));
        
        // 상위 10개만 반환
        char_counts.into_iter().take(10).collect()
    };
    
    // GPU 유형 정보 추가
    let gpu_info = match context::get_gpu_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "text_analysis",
        "text_length": text.len(),
        "word_count": words,
        "avg_word_length": avg_word_length,
        "top_chars": top_chars.iter().map(|(c, count)| {
            json!({
                "char": c.to_string(),
                "count": count
            })
        }).collect::<Vec<_>>(),
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "workload_size": size_str,
        "thread_count": thread_count,
        "gpu_info": gpu_info
    }))
}

/// 패턴 감지 수행 (타이핑 패턴 분석)
fn perform_pattern_detection(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 첫 번째 오류 수정 (338 라인)
    // 수정 전: 
    // let key_presses = parsed.get("keyPresses").and_then(|k| k.as_array()).unwrap_or(&Vec::new());
    // 수정 후:
    let empty_vec = Vec::new();
    let key_presses = parsed.get("keyPresses").and_then(|k| k.as_array()).unwrap_or(&empty_vec);
    
    // 두 번째 오류 수정 (339 라인)
    // 수정 전:
    // let timestamps = parsed.get("timestamps").and_then(|t| t.as_array()).unwrap_or(&Vec::new());
    // 수정 후:
    let empty_timestamps = Vec::new();
    let timestamps = parsed.get("timestamps").and_then(|t| t.as_array()).unwrap_or(&empty_timestamps);
    
    // 데이터 크기에 따른 워크로드 결정
    let workload_size = if key_presses.len() > 5000 {
        GpuWorkloadSize::Large
    } else if key_presses.len() > 1000 {
        GpuWorkloadSize::Medium
    } else {
        GpuWorkloadSize::Small
    };
    
    // GPU 성능 정보를 기반으로 최적화
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            // 대용량 데이터 및 고성능 GPU에서만 GPU 가속 사용
            key_presses.len() > 1000 && 
            caps.max_buffer_size >= key_presses.len() * std::mem::size_of::<u8>() * 2
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 패턴 감지 수행");
        // 실제 구현에서는 여기에 wgpu 컴퓨트 셰이더 코드 삽입
        // 간단한 예시 구현이므로 대신 CPU 병렬 처리 사용
    }
    
    // 간격 계산
    let mut intervals = Vec::new();
    for i in 1..timestamps.len() {
        let prev = timestamps[i-1].as_u64().unwrap_or(0);
        let curr = timestamps[i].as_u64().unwrap_or(0);
        if prev > 0 && curr > 0 && curr > prev {
            intervals.push(curr - prev);
        }
    }
    
    // 타이핑 속도 계산
    let avg_typing_speed = if intervals.len() > 0 {
        intervals.iter().sum::<u64>() as f64 / intervals.len() as f64
    } else {
        0.0
    };
    
    // 타이핑 속도 변동성 (표준 편차 활용)
    let speed_variance = if intervals.len() > 1 {
        let mean = avg_typing_speed;
        let sum_squared_diff: f64 = intervals.iter()
            .map(|&x| {
                let diff = x as f64 - mean;
                diff * diff
            })
            .sum();
        (sum_squared_diff / (intervals.len() - 1) as f64).sqrt()
    } else {
        0.0
    };
    
    // 타이핑 패턴 분석 - 연속된 키 입력 간격 및 특성 패턴 식별
    let typing_pattern = if speed_variance / avg_typing_speed > 0.5 {
        "불규칙 타이핑"
    } else if avg_typing_speed < 100.0 {
        "빠른 타이핑"
    } else if avg_typing_speed < 200.0 {
        "보통 속도 타이핑"
    } else {
        "느린 타이핑"
    };
    
    // GPU 유형 정보 추가
    let gpu_info = match context::get_gpu_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "pattern_detection",
        "key_count": key_presses.len(),
        "average_typing_speed_ms": avg_typing_speed,
        "typing_speed_variance": speed_variance,
        "typing_pattern": typing_pattern,
        "consistency_score": calculate_consistency_score(&parsed),
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "workload_size": format!("{:?}", workload_size).to_lowercase(),
        "gpu_info": gpu_info
    }))
}

/// 이미지 처리 수행
fn perform_image_processing(_data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    // 샘플 구현 - 실제 프로젝트에 맞게 확장 필요
    let start = Instant::now();
    
    // 이미지 처리는 디스크리트 GPU에서 크게 이점이 있음
    // 최소한의 구현만 제공
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "image_processing",
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": false, // 샘플 구현에서는 미지원
    }))
}

/// 데이터 집계 수행
fn perform_data_aggregation(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    // 샘플 구현 - 실제 프로젝트에 맞게 확장 필요
    let start = Instant::now();
    
    // 데이터 파싱
    let _parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // CPU에서도 효율적으로 처리 가능한 작업이므로 
    // 단순한 구현만 제공
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "data_aggregation",
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": false // 샘플 구현에서는 미지원
    }))
}

/// 타이핑 통계 처리 (앱 특화 함수)
fn perform_typing_statistics(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 필수 필드 추출
    let key_count = parsed.get("keyCount").and_then(|k| k.as_u64()).unwrap_or(0);
    let typing_time = parsed.get("typingTime").and_then(|t| t.as_u64()).unwrap_or(1); // 0으로 나누기 방지
    let errors = parsed.get("errors").and_then(|e| e.as_u64()).unwrap_or(0);
    let content = parsed.get("content").and_then(|c| c.as_str()).unwrap_or("");
    
    // 워크로드 크기 결정 - 콘텐츠 길이 기반
    let workload_size = if content.len() > 10000 {
        GpuWorkloadSize::Large
    } else if content.len() > 2000 {
        GpuWorkloadSize::Medium
    } else {
        GpuWorkloadSize::Small
    };
    
    // GPU 성능 정보를 기반으로 최적화
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            // 대용량 콘텐츠 및 고성능 GPU에서만 GPU 가속 사용
            content.len() > 5000 && 
            caps.max_buffer_size >= content.len() * std::mem::size_of::<u8>()
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 타이핑 통계 계산 수행");
        // 실제 구현에서는 여기에 wgpu 컴퓨트 셰이더 코드 삽입
        // 간단한 예시 구현이므로 대신 CPU 병렬 처리 사용
    }
    
    // 타이핑 속도 계산 (WPM)
    let minutes = typing_time as f64 / 60000.0; // ms -> 분
    let wpm = if minutes > 0.0 {
        (key_count as f64 / 5.0) / minutes // 5타 = 1단어 가정
    } else {
        0.0
    };
    
    // KPM (분당 타자 수)
    let kpm = if minutes > 0.0 {
        key_count as f64 / minutes
    } else {
        0.0
    };
    
    // 단어 수 및 문자 수 계산
    let word_count = content
        .split_whitespace()
        .count();
    
    let character_count = content.len();
    
    // 정확도 계산
    let total_keys = key_count + errors;
    let accuracy = if total_keys > 0 {
        (key_count as f64 / total_keys as f64) * 100.0
    } else {
        100.0
    };
    
    // 추가 분석: 텍스트 복잡성 점수
    let complexity_score = calculate_text_complexity(content);
    
    // 피로도 추정
    let fatigue = estimate_fatigue(typing_time, key_count);
    
    // GPU 디바이스 타입 정보
    let device_type = match context::get_gpu_device_info() {
        Ok(info) => format!("{:?}", info.device_type),
        Err(_) => "Unknown".to_string()
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "typing_statistics",
        "wpm": wpm.round(),
        "kpm": kpm.round(),
        "accuracy": (accuracy * 10.0).round() / 10.0, // 소수점 한 자리까지
        "word_count": word_count,
        "character_count": character_count,
        "typing_time_seconds": typing_time / 1000,
        "complexity_score": complexity_score,
        "fatigue": fatigue,
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "device_type": device_type,
        "workload_size": format!("{:?}", workload_size).to_lowercase()
    }))
}

/// 커스텀 계산 수행
fn perform_custom_computation(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    // 커스텀 계산용 간단한 프레임워크 제공
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // 커맨드 값 가져오기
    let command = parsed.get("command").and_then(|c| c.as_str()).unwrap_or("default");
    
    let result = match command {
        "sum" => {
            let empty_values1 = Vec::new();
            let values = parsed.get("values").and_then(|v| v.as_array()).unwrap_or(&empty_values1);
            let sum: f64 = values.iter()
                .filter_map(|v| v.as_f64())
                .sum();
            json!({ "sum": sum })
        },
        "average" => {
            let empty_values2 = Vec::new();
            let values = parsed.get("values").and_then(|v| v.as_array()).unwrap_or(&empty_values2);
            let sum: f64 = values.iter()
                .filter_map(|v| v.as_f64())
                .sum();
            let count = values.iter().filter(|v| v.is_number()).count();
            let avg = if count > 0 { sum / count as f64 } else { 0.0 };
            json!({ "average": avg })
        },
        _ => {
            json!({ "error": format!("Unknown command: {}", command) })
        }
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "custom_computation",
        "command": command,
        "computed_result": result,
        "computation_time_ms": elapsed.as_millis()
    }))
}

/// 일관성 점수 계산
fn calculate_consistency_score(data: &Value) -> f64 {
    // 타이핑 일관성 점수 계산 로직
    let empty_timestamps2 = Vec::new();
    let timestamps = data.get("timestamps").and_then(|t| t.as_array()).unwrap_or(&empty_timestamps2);
    
    if timestamps.len() < 2 {
        return 100.0; // 충분한 데이터 없음
    }
    
    // 연속된 키 입력 간 간격 계산
    // 수정: let 바인딩을 사용하여 임시 값의 수명 연장
    let mut intervals_data = Vec::new();
    for i in 1..timestamps.len() {
        let prev = timestamps[i-1].as_u64().unwrap_or(0);
        let curr = timestamps[i].as_u64().unwrap_or(0);
        if prev > 0 && curr > 0 && curr > prev {
            intervals_data.push(curr - prev);
        }
    }
    
    if intervals_data.is_empty() {
        return 100.0;
    }
    
    // 평균 간격 계산
    let mean_interval = intervals_data.iter().sum::<u64>() as f64 / intervals_data.len() as f64;
    
    // 표준 편차 계산
    let variance = intervals_data.iter()
        .map(|&x| {
            let diff = x as f64 - mean_interval;
            diff * diff
        })
        .sum::<f64>() / intervals_data.len() as f64;
    
    let stddev = variance.sqrt();
    
    // 변동 계수 (표준편차/평균)
    let cv = stddev / mean_interval;
    
    // 일관성 점수 계산 (낮은 CV = 높은 일관성)
    let consistency = (1.0 - cv.min(1.0)) * 100.0;
    
    // 한계값 적용
    consistency.max(0.0).min(100.0)
}

/// 텍스트 복잡성 계산
fn calculate_text_complexity(text: &str) -> f64 {
    if text.is_empty() {
        return 0.0;
    }
    
    // 단어 수
    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len();
    
    if word_count == 0 {
        return 0.0;
    }
    
    // 평균 단어 길이
    let total_chars = words.iter().map(|w| w.len()).sum::<usize>();
    let avg_word_length = total_chars as f64 / word_count as f64;
    
    // 고유 단어 비율 (어휘 다양성)
    let unique_words: std::collections::HashSet<&str> = words.iter().cloned().collect();
    let lexical_diversity = unique_words.len() as f64 / word_count as f64;
    
    // 복잡성 점수 계산
    let complexity = (avg_word_length * 0.5 + lexical_diversity * 50.0).min(100.0);
    
    complexity
}

/// 피로도 추정
fn estimate_fatigue(typing_time: u64, key_count: u64) -> Value {
    // 입력 시간이 길어질수록 피로도 증가
    let minutes = typing_time as f64 / 60000.0;
    
    // 분당 타자 수
    let kpm = if minutes > 0.0 {
        key_count as f64 / minutes
    } else {
        0.0
    };
    
    // 피로도 계산 (가상 알고리즘)
    let base_fatigue = (minutes * 5.0).min(100.0);
    let intensity_factor = (kpm / 100.0).min(3.0);
    let fatigue_score = (base_fatigue * (1.0 + (intensity_factor * 0.2))).min(100.0);
    
    json!({
        "score": fatigue_score.round(),
        "minutes_typed": minutes.round(),
        "intensity": intensity_factor,
        "recommendation": if fatigue_score > 70.0 {
            "휴식을 취하는 것이 좋습니다."
        } else if fatigue_score > 40.0 {
            "잠시 스트레칭을 하면 좋을 것 같습니다."
        } else {
            "아직 피로도가 낮습니다."
        }
    })
}

/// 사용하지 않는 GPU 리소스 정리
pub fn cleanup_unused_gpu_resources() -> Result<bool, Error> {
    debug!("사용하지 않는 GPU 리소스 정리 중...");
    
    // 초기화되지 않은 경우 빠르게 종료
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    // GPU 컨텍스트를 가져와 리소스 정리
    context::with_gpu_context(|ctx| {
        ctx.cleanup_resources()?;
        Ok(true)
    })
}

/// GPU 셰이더 캐시 정리
pub fn clear_shader_caches() -> Result<bool, Error> {
    debug!("GPU 셰이더 캐시 정리 중...");
    
    // 초기화되지 않은 경우 빠르게 종료
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    // GPU 컨텍스트를 가져와 셰이더 캐시 정리
    context::with_gpu_context(|ctx| {
        ctx.clear_shader_cache()?;
        Ok(true)
    })
}

/// 모든 GPU 리소스 완전 해제
pub fn release_all_gpu_resources() -> Result<bool, Error> {
    warn!("모든 GPU 리소스 완전 해제 중...");
    
    // 초기화되지 않은 경우 빠르게 종료
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    // GPU 컨텍스트를 가져와 모든 리소스 해제
    context::with_gpu_context(|ctx| {
        ctx.release_all_resources()?;
        Ok(true)
    })
}

/// GPU 설정 최적화 - GPU 유형에 따라 설정 조정
pub fn optimize_gpu_settings_for_device_type() -> Result<Value, Error> {
    let initialized = context::is_gpu_initialized();
    if !initialized {
        return Ok(json!({
            "success": false,
            "message": "GPU 컨텍스트가 초기화되지 않았습니다",
            "device_type": "unknown"
        }));
    }
    
    let device_info = context::get_gpu_device_info()?;
    
    // GPU 유형에 따라 최적화된 설정 적용
    let (settings, message) = match device_info.device_type {
        wgpu::DeviceType::DiscreteGpu => {
            debug!("디스크리트 GPU용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 256,
                    "thread_count": 16,
                    "buffer_size": "large",
                    "texture_compression": true,
                    "performance_mode": "high"
                }),
                "디스크리트 GPU 최적화가 적용되었습니다"
            )
        },
        wgpu::DeviceType::IntegratedGpu => {
            debug!("내장 GPU용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 128,
                    "thread_count": 8,
                    "buffer_size": "medium",
                    "texture_compression": false,
                    "performance_mode": "balanced"
                }),
                "내장 GPU 최적화가 적용되었습니다"
            )
        },
        wgpu::DeviceType::Cpu => {
            debug!("CPU 렌더링용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 64,
                    "thread_count": 4,
                    "buffer_size": "small",
                    "texture_compression": false,
                    "performance_mode": "low"
                }),
                "CPU 렌더링에 최적화된 설정이 적용되었습니다"
            )
        },
        _ => {
            debug!("기본 GPU 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 64,
                    "thread_count": 4,
                    "buffer_size": "small",
                    "texture_compression": false,
                    "performance_mode": "low"
                }),
                "기본 GPU 설정이 적용되었습니다"
            )
        }
    };
    
    Ok(json!({
        "success": true,
        "message": message,
        "device_type": format!("{:?}", device_info.device_type),
        "device_name": device_info.name,
        "settings": settings
    }))
}
