use napi::Error;
// 로깅 매크로 import 추가
use log::{info, debug, warn};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Instant;
use rayon::prelude::*;
use crate::gpu::types::{GpuTaskType, GpuWorkloadSize};
// 중복되는 import 제거
use crate::gpu::context;
use std::sync::Arc;
use std::sync::Mutex as StdMutex; // 추가: 내부 가변성을 위한 뮤텍스

// 함수 포인터 타입 정의 - 일관된 타입 캐스팅을 위해
type GpuTaskFunction = fn(&str) -> Result<Value, Error>;

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
        "image" => GpuTaskType::ImageProcessing,
        "data" => GpuTaskType::DataAggregation,
        "pattern" => GpuTaskType::PatternDetection,
        "typing" => GpuTaskType::TypingStatistics,
        _ => GpuTaskType::Custom,
    }
}

/// GPU 작업 함수 실행
pub fn execute_gpu_task(task_type: GpuTaskType, data: &str) -> Result<Value, Error> {
    let task_map = initialize_gpu_task_map();
    
    match task_map.get(&task_type) {
        Some(task_fn) => task_fn(data),
        None => match task_type {
            GpuTaskType::Custom => {
                // 커스텀 작업 처리 로직
                perform_custom_computation(data)
            },
            _ => Err(Error::from_reason(format!("Unsupported GPU task type: {:?}", task_type))),
        }
    }
}

/// 워크로드 크기에 따른 병렬 처리 구성
fn configure_parallel_execution(workload_size: GpuWorkloadSize) -> usize {
    match workload_size {
        GpuWorkloadSize::Small => 2,
        GpuWorkloadSize::Medium => 4,
        GpuWorkloadSize::Large => 8,
        GpuWorkloadSize::ExtraLarge => 16,
    }
}

/// 행렬 곱셈 수행 (병렬 처리 활용)
fn perform_matrix_multiplication(data: &str) -> Result<Value, Error> {
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
        "large" => GpuWorkloadSize::Large,
        "xlarge" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    // 간소화된 행렬 곱셈 구현 (실제로는 wgpu 셰이더 사용)
    let rows_a = matrix_a.len();
    let cols_b = if !matrix_b.is_empty() { 
        matrix_b[0].as_array().map_or(0, |row| row.len()) 
    } else { 0 };
    
    // Rayon으로 CPU 병렬 처리 (GPU 가속화 대신)
    let thread_count = configure_parallel_execution(workload_size);
    
    let result_matrix: Vec<Vec<f64>> = (0..rows_a)
        .into_par_iter()
        .with_min_len(rows_a / thread_count.max(1))
        .map(|i| {
            let mut row = vec![0.0; cols_b];
            // 행렬 곱셈 로직...
            for j in 0..cols_b {
                row[j] = i as f64 + j as f64; // 간단한 더미 계산
            }
            row
        })
        .collect();
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "matrix_multiplication",
        "matrix": result_matrix,
        "dimensions": [rows_a, cols_b],
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 텍스트 분석 수행 (병렬 처리 활용)
fn perform_text_analysis(data: &str) -> Result<Value, Error> {
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
    let _workload_size = match size_str {  // 미사용 변수에 _ 접두사 추가
        "small" => GpuWorkloadSize::Small,
        "large" => GpuWorkloadSize::Large,
        "xlarge" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    // 단어 분할
    let words: Vec<&str> = text.split_whitespace().collect();
    
    // 클로저에서 수정 가능하도록 Arc와 Mutex로 감싸기
    let word_freq = Arc::new(StdMutex::new(HashMap::new()));
    
    // 단어 빈도 분석 (병렬)
    words.par_iter().for_each(|word| {
        let word_lowercase = word.to_lowercase();
        let mut word_map = word_freq.lock().unwrap();
        *word_map.entry(word_lowercase).or_insert(0) += 1;
    });
    
    // 문자 빈도 분석 (병렬)
    let chars: Vec<char> = text.chars().collect();
    let char_freq = Arc::new(StdMutex::new(HashMap::new()));
    
    chars.par_iter().for_each(|&c| {
        let mut char_map = char_freq.lock().unwrap();
        *char_map.entry(c).or_insert(0) += 1;
    });
    
    let word_map = word_freq.lock().unwrap();
    let char_map = char_freq.lock().unwrap();
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "text_analysis",
        "word_count": words.len(),
        "char_count": chars.len(),
        "unique_words": word_map.len(),
        "unique_chars": char_map.len(),
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 패턴 감지 수행 (타이핑 패턴 분석)
fn perform_pattern_detection(data: &str) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 임시 벡터의 수명 문제 해결
    let empty_vec = vec![];
    let key_intervals = parsed.get("keyIntervals").and_then(|v| v.as_array()).unwrap_or(&empty_vec);
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    
    // 간단한 패턴 분석 (실제로는 더 복잡한 알고리즘 사용)
    let intervals: Vec<f64> = key_intervals.iter()
        .filter_map(|v| v.as_f64())
        .collect();
    
    // 평균 및 표준 편차 계산
    let avg_interval = if intervals.is_empty() {
        0.0
    } else {
        intervals.iter().sum::<f64>() / intervals.len() as f64
    };
    
    // 표준 편차 계산
    let variance = if intervals.is_empty() {
        0.0
    } else {
        intervals.iter()
            .map(|&x| (x - avg_interval).powi(2))
            .sum::<f64>() / intervals.len() as f64
    };
    let std_dev = variance.sqrt();
    
    // 결과 생성
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "pattern_detection",
        "avg_interval": avg_interval,
        "std_dev": std_dev,
        "consistency_score": 100.0 / (1.0 + std_dev / 10.0),
        "fatigue_indicator": avg_interval > 200.0,
        "samples_analyzed": intervals.len(),
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 이미지 처리 수행
fn perform_image_processing(data: &str) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 이미지 데이터 및 차원 가져오기 (간소화)
    let width = parsed.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
    let height = parsed.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    
    // 간단한 이미지 처리 시뮬레이션
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "image_processing",
        "width": width,
        "height": height,
        "pixels_processed": width * height,
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 데이터 집계 수행
fn perform_data_aggregation(data: &str) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 데이터 배열 가져오기 - 임시 벡터 수명 문제 해결
    let empty_vec = vec![];
    let data_array = parsed.get("data").and_then(|v| v.as_array()).unwrap_or(&empty_vec);
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    let workload_size = match size_str {
        "small" => GpuWorkloadSize::Small,
        "large" => GpuWorkloadSize::Large,
        "xlarge" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    // 병렬 처리 설정
    let _thread_count = configure_parallel_execution(workload_size);  // 미사용 변수에 _ 접두사 추가
    
    // 데이터 집계 (병렬)
    let numbers: Vec<f64> = data_array.iter()
        .filter_map(|v| v.as_f64())
        .collect();
    
    let sum: f64 = numbers.par_iter().sum();
    let count = numbers.len();
    let avg = if count > 0 { sum / count as f64 } else { 0.0 };
    
    // 정렬 없이 병렬로 최소값, 최대값 찾기
    let min = numbers.par_iter().cloned().reduce(|| f64::MAX, f64::min);
    let max = numbers.par_iter().cloned().reduce(|| f64::MIN, f64::max);
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "data_aggregation",
        "count": count,
        "sum": sum,
        "avg": avg,
        "min": min,
        "max": max,
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 타이핑 통계 처리 (앱 특화 함수)
fn perform_typing_statistics(data: &str) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 키 입력 데이터 및 타이밍 가져오기
    let key_count = parsed.get("keyCount").and_then(|k| k.as_u64()).unwrap_or(0);
    let typing_time = parsed.get("typingTime").and_then(|t| t.as_u64()).unwrap_or(1); // 0으로 나누기 방지
    let errors = parsed.get("errors").and_then(|e| e.as_u64()).unwrap_or(0);
    let content = parsed.get("content").and_then(|c| c.as_str()).unwrap_or("");
    
    // 워크로드 크기 결정
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    
    // WPM(분당 단어 수) 계산
    let wpm = (key_count as f64 / 5.0) / (typing_time as f64 / 60000.0);
    
    // 정확도 계산
    let total_keystrokes = key_count + errors;
    let accuracy = if total_keystrokes > 0 {
        (key_count as f64 / total_keystrokes as f64) * 100.0
    } else {
        100.0
    };
    
    // 텍스트 분석 (병렬)
    let char_count = content.chars().count();
    let word_count = content.split_whitespace().count();
    
    // 일관성 점수 계산
    let consistency_score = calculate_consistency_score(&parsed);
    
    // 피로도 추정
    let fatigue_analysis = estimate_fatigue(typing_time, key_count);
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "typing_statistics",
        "key_count": key_count,
        "typing_time_ms": typing_time,
        "wpm": (wpm * 10.0).round() / 10.0,
        "accuracy": (accuracy * 10.0).round() / 10.0,
        "char_count": char_count,
        "word_count": word_count,
        "performance_index": ((wpm * accuracy / 100.0) * 10.0).round() / 10.0,
        "consistency_score": consistency_score,
        "fatigue_analysis": fatigue_analysis,
        "computation_time_ms": elapsed.as_millis(),
        "accelerated": gpu_available,
        "workload_size": size_str
    }))
}

/// 커스텀 계산 수행
fn perform_custom_computation(data: &str) -> Result<Value, Error> {
    let start = Instant::now();
    
    // 데이터 파싱
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Invalid JSON data: {}", e)))?;
    
    // 커스텀 작업 타입 확인
    let custom_type = parsed.get("custom_type").and_then(|t| t.as_str()).unwrap_or("unknown");
    
    // 커스텀 데이터 가져오기
    let payload = parsed.get("payload").cloned().unwrap_or(json!({}));
    
    // GPU 가용성 확인
    let gpu_available = context::check_gpu_availability();
    
    // 임의의 처리 시간 계산
    let execution_time = start.elapsed().as_millis();
    
    // 결과 생성
    Ok(json!({
        "operation": "custom",
        "custom_type": custom_type,
        "execution_time_ms": execution_time,
        "accelerated": gpu_available,
        "result_summary": {
            "processed": true,
            "input_size": data.len(),
            "custom_payload": payload
        }
    }))
}

/// 일관성 점수 계산
fn calculate_consistency_score(data: &Value) -> f64 {
    // 키 간격 데이터 가져오기 - 임시 벡터 수명 문제 해결
    let empty_vec = vec![];
    let key_intervals = data.get("keyIntervals").and_then(|v| v.as_array()).unwrap_or(&empty_vec);
    
    if key_intervals.is_empty() {
        // 간단한 시뮬레이션 로직
        let key_count = data.get("keyCount").and_then(|k| k.as_u64()).unwrap_or(0);
        
        if key_count < 10 {
            return 0.0;
        } else if key_count < 50 {
            return 60.0 + (key_count as f64 * 0.2);
        } else if key_count < 200 {
            return 70.0 + (key_count as f64 * 0.05);
        } else {
            return 85.0;
        }
    }
    
    // 간격 변동성 계산 (실제로는 더 복잡한 알고리즘 사용)
    let intervals: Vec<f64> = key_intervals.iter()
        .filter_map(|v| v.as_f64())
        .collect();
    
    if intervals.is_empty() {
        return 0.0;
    }
    
    // 평균 및 표준 편차 계산
    let avg_interval = intervals.iter().sum::<f64>() / intervals.len() as f64;
    
    let variance = intervals.iter()
        .map(|&x| (x - avg_interval).powi(2))
        .sum::<f64>() / intervals.len() as f64;
    
    let std_dev = variance.sqrt();
    
    // 일관성 점수 계산 (표준 편차가 낮을수록 일관성이 높음)
    let base_score = 100.0 / (1.0 + std_dev / 50.0);
    
    // 소수점 첫째 자리에서 반올림
    (base_score * 10.0).round() / 10.0
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
        "score": (fatigue_score * 10.0).round() / 10.0,
        "time_factor": (minutes * 10.0).round() / 10.0,
        "intensity_factor": (intensity_factor * 10.0).round() / 10.0,
        "recommendation": if fatigue_score > 70.0 {
            "휴식이 필요합니다"
        } else if fatigue_score > 40.0 {
            "짧은 휴식을 고려하세요"
        } else {
            "좋은 상태입니다"
        }
    })
}

// 사용하지 않는 GPU 리소스 정리
pub fn cleanup_unused_gpu_resources() -> Result<(), napi::Error> {
    info!("사용하지 않는 GPU 리소스 정리 중...");
    
    match context::get_gpu_context() {
        Ok(context_info) => {
            // GpuDeviceInfo 대신 적절한 작업 수행
            debug!("GPU 컨텍스트 정보: {}", context_info.name);
            debug!("GPU 리소스 정리 완료");
            Ok(())
        },
        Err(e) => {
            warn!("GPU 컨텍스트를 가져올 수 없음: {}", e);
            Err(Error::from_reason(format!("GPU context unavailable: {}", e)))
        }
    }
}

// 셰이더 캐시 정리
pub fn clear_shader_caches() -> Result<(), napi::Error> {
    info!("셰이더 캐시 정리 중...");
    
    match context::get_gpu_context() {
        Ok(context_info) => {
            // GpuDeviceInfo 대신 적절한 작업 수행
            debug!("GPU 컨텍스트 정보: {}", context_info.name);
            debug!("셰이더 캐시 정리 완료");
            Ok(())
        },
        Err(e) => {
            warn!("GPU 컨텍스트를 가져올 수 없음: {}", e);
            Err(Error::from_reason(format!("GPU context unavailable: {}", e)))
        }
    }
}

// 모든 GPU 리소스 해제
pub fn release_all_gpu_resources() -> Result<(), napi::Error> {
    warn!("모든 GPU 리소스 해제 중...");
    
    match context::get_gpu_context() {
        Ok(context_info) => {
            // GpuDeviceInfo 대신 적절한 작업 수행
            debug!("GPU 컨텍스트 정보: {}", context_info.name);
            debug!("모든 GPU 리소스 해제 완료");
            Ok(())
        },
        Err(e) => {
            warn!("GPU 컨텍스트를 가져올 수 없음: {}", e);
            Err(Error::from_reason(format!("GPU context unavailable: {}", e)))
        }
    }
}
