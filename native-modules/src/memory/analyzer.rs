use napi::Error;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::memory::types::{MemoryInfo, OptimizationLevel};

/// 프로세스 메모리 정보 가져오기
/// types::MemoryInfo 구조체를 직접 반환하도록 수정
pub fn get_process_memory_info() -> Result<MemoryInfo, Error> {
    // 플랫폼별 메모리 정보 구현
    #[cfg(target_os = "windows")]
    return get_windows_memory_info();
    
    #[cfg(target_os = "linux")]
    return get_linux_memory_info();
    
    #[cfg(target_os = "macos")]
    return get_macos_memory_info();
    
    // 기본 구현
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return get_fallback_memory_info();
}

/// Windows 메모리 정보 가져오기
#[cfg(target_os = "windows")]
fn get_windows_memory_info() -> Result<MemoryInfo, Error> {
    // 실제 winapi 구현 추가
    #[cfg(feature = "use-winapi")]
    {
        use winapi::um::processthreadsapi::GetCurrentProcess;
        use winapi::um::psapi::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS_EX};
        use std::mem::size_of;
        
        let mut pmc = PROCESS_MEMORY_COUNTERS_EX {
            cb: size_of::<PROCESS_MEMORY_COUNTERS_EX>() as u32,
            PageFaultCount: 0,
            PeakWorkingSetSize: 0,
            WorkingSetSize: 0,
            QuotaPeakPagedPoolUsage: 0,
            QuotaPagedPoolUsage: 0,
            QuotaPeakNonPagedPoolUsage: 0,
            QuotaNonPagedPoolUsage: 0,
            PagefileUsage: 0,
            PeakPagefileUsage: 0,
            PrivateUsage: 0,
        };
        
        unsafe {
            let handle = GetCurrentProcess();
            if GetProcessMemoryInfo(
                handle,
                &mut pmc as *mut PROCESS_MEMORY_COUNTERS_EX as *mut _,
                size_of::<PROCESS_MEMORY_COUNTERS_EX>() as u32,
            ) == 0 {
                return Err(Error::from_reason("Failed to get process memory info"));
            }
        }
        
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        
        let heap_used = pmc.PrivateUsage;
        let heap_total = pmc.PeakPagefileUsage;
        
        return Ok(MemoryInfo {
            heap_used,
            heap_total,
            heap_limit: Some(2 * heap_total), // 추정값
            rss: pmc.WorkingSetSize,
            external: Some(pmc.QuotaPagedPoolUsage),
            heap_used_mb: heap_used as f64 / (1024.0 * 1024.0),
            rss_mb: pmc.WorkingSetSize as f64 / (1024.0 * 1024.0),
            percent_used: (heap_used as f64 / heap_total as f64) * 100.0,
            timestamp: now,
        });
    }
    
    // winapi 기능이 비활성화된 경우 폴백 구현
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    let heap_used = 100 * 1024 * 1024; // 100MB
    let heap_total = 200 * 1024 * 1024; // 200MB
    
    Ok(MemoryInfo {
        heap_used,
        heap_total,
        heap_limit: Some(1024 * 1024 * 1024), // 1GB
        rss: 150 * 1024 * 1024, // 150MB
        external: Some(10 * 1024 * 1024), // 10MB
        heap_used_mb: heap_used as f64 / (1024.0 * 1024.0),
        rss_mb: 150.0,
        percent_used: (heap_used as f64 / heap_total as f64) * 100.0,
        timestamp: now,
    })
}

/// Linux 메모리 정보 가져오기
#[cfg(target_os = "linux")]
fn get_linux_memory_info() -> Result<MemoryInfo, Error> {
    // 실제 구현은 procfs 사용... (간략화)
    
    // 더미 구현과 동일
    get_fallback_memory_info()
}

/// macOS 메모리 정보 가져오기
#[cfg(target_os = "macos")]
fn get_macos_memory_info() -> Result<MemoryInfo, Error> {
    // 실제 구현은 libc 사용... (간략화)
    
    // 더미 구현과 동일
    get_fallback_memory_info()
}

/// 폴백 메모리 정보 가져오기 - 미사용 경고 제거를 위한 속성 추가
#[allow(dead_code)]
fn get_fallback_memory_info() -> Result<MemoryInfo, Error> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    let heap_used = 100 * 1024 * 1024; // 100MB
    let heap_total = 200 * 1024 * 1024; // 200MB
    
    Ok(MemoryInfo {
        heap_used,
        heap_total,
        heap_limit: Some(1024 * 1024 * 1024), // 1GB
        rss: 150 * 1024 * 1024, // 150MB
        external: Some(10 * 1024 * 1024), // 10MB
        heap_used_mb: heap_used as f64 / (1024.0 * 1024.0),
        rss_mb: 150.0,
        percent_used: (heap_used as f64 / heap_total as f64) * 100.0,
        timestamp: now,
    })
}

/// 메모리 최적화 수준 결정 - 함수 이름 수정
pub fn determine_memory_optimization_level() -> Result<u8, Error> {
    let memory_info = get_process_memory_info()?;
    
    // 메모리 사용률에 따라 최적화 수준 결정
    let level = if memory_info.percent_used > 90.0 {
        OptimizationLevel::Critical
    } else if memory_info.percent_used > 80.0 {
        OptimizationLevel::High
    } else if memory_info.percent_used > 70.0 {
        OptimizationLevel::Medium
    } else if memory_info.percent_used > 50.0 {
        OptimizationLevel::Low
    } else {
        OptimizationLevel::Normal
    };
    
    Ok(level as u8)
}

/// 메모리 사용량 심각도 분석
pub fn analyze_memory_usage_severity() -> Result<(OptimizationLevel, String), Error> {
    let memory_info = get_process_memory_info()?;
    
    // 메모리 사용량 비율에 따라 심각도 및 권장 조치 결정
    let (level, description) = match memory_info.percent_used {
        p if p < 50.0 => (
            OptimizationLevel::Normal,
            "메모리 사용량이 정상입니다.".to_string()
        ),
        p if p < 70.0 => (
            OptimizationLevel::Low,
            "메모리 사용량이 증가하고 있습니다. 불필요한 리소스를 정리하는 것이 좋습니다.".to_string()
        ),
        p if p < 85.0 => (
            OptimizationLevel::Medium,
            "메모리 사용량이 높습니다. 사용하지 않는 기능을 비활성화하세요.".to_string()
        ),
        p if p < 95.0 => (
            OptimizationLevel::High,
            "메모리 사용량이 매우 높습니다. 즉시 메모리 최적화가 필요합니다.".to_string()
        ),
        _ => (
            OptimizationLevel::Critical,
            "메모리 사용량이 위험 수준입니다. 즉시 작업을 저장하고 앱을 재시작하세요.".to_string()
        ),
    };
    
    Ok((level, description))
}
