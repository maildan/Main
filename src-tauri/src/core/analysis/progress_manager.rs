use std::sync::{Arc, Mutex};
use crate::shared::types::AnalysisProgress;

#[derive(Debug, Clone)]
pub enum DynamicAnalysisStep {
    RegistryAnalysis,
    MemoryPatternSearch,
    ProcessMemoryAnalysis,
    KeyValidation,
    FileDecryption,
}

#[allow(dead_code)]
pub struct ProgressManager {
    progress: Arc<Mutex<AnalysisProgress>>,
    steps: Vec<DynamicAnalysisStep>,
    current_step: usize,
}

impl ProgressManager {
    pub fn new() -> Self {
        let steps = vec![
            DynamicAnalysisStep::RegistryAnalysis,
            DynamicAnalysisStep::MemoryPatternSearch,
            DynamicAnalysisStep::ProcessMemoryAnalysis,
            DynamicAnalysisStep::KeyValidation,
            DynamicAnalysisStep::FileDecryption,
        ];
        
        Self {
            progress: Arc::new(Mutex::new(AnalysisProgress {
                static_progress: 0.0,
                dynamic_progress: 0.0,
                total_progress: 0.0,
                current_task: "분석 준비 중...".to_string(),
                is_running: false,
                keys_candidates_found: 0,
            })),
            steps,
            current_step: 0,
        }
    }
    
    pub fn update_progress(&mut self, step: &str, percent: u8, message: &str) {
        if let Ok(mut progress) = self.progress.lock() {
            progress.current_task = format!("{}: {}", step, message);
            progress.total_progress = percent as f32;
            progress.is_running = percent < 100;
        }
    }
    
    pub fn get_progress(&self) -> AnalysisProgress {
        if let Ok(progress) = self.progress.lock() {
            progress.clone()
        } else {
            AnalysisProgress {
                static_progress: 0.0,
                dynamic_progress: 0.0,
                total_progress: 0.0,
                current_task: "오류".to_string(),
                is_running: false,
                keys_candidates_found: 0,
            }
        }
    }
      #[allow(dead_code)]
    pub fn next_step(&mut self) {
        if self.current_step < self.steps.len() - 1 {
            self.current_step += 1;
        }
        
        let step_name = match &self.steps[self.current_step] {
            DynamicAnalysisStep::RegistryAnalysis => "레지스트리 분석",
            DynamicAnalysisStep::MemoryPatternSearch => "메모리 패턴 검색",
            DynamicAnalysisStep::ProcessMemoryAnalysis => "프로세스 메모리 분석",
            DynamicAnalysisStep::KeyValidation => "키 검증",
            DynamicAnalysisStep::FileDecryption => "파일 복호화",
        };
        
        let percent = ((self.current_step + 1) * 100 / self.steps.len()) as u8;
        self.update_progress(step_name, percent, &format!("{} 진행 중...", step_name));
    }
    
    #[allow(dead_code)]
    pub fn update_keys_found(&mut self, count: u32) {
        if let Ok(mut progress) = self.progress.lock() {
            progress.keys_candidates_found = count;
        }
    }
}

// 전역 프로그레스 매니저
lazy_static::lazy_static! {
    pub static ref PROGRESS_MANAGER: Arc<Mutex<ProgressManager>> = 
        Arc::new(Mutex::new(ProgressManager::new()));
}

pub fn init_progress_manager() {
    // 이미 lazy_static으로 초기화됨
}

#[allow(dead_code)]
#[tauri::command]
pub fn get_analysis_progress() -> AnalysisProgress {
    if let Ok(manager) = PROGRESS_MANAGER.lock() {
        manager.get_progress()
    } else {
        AnalysisProgress {
            static_progress: 0.0,
            dynamic_progress: 0.0,
            total_progress: 0.0,
            current_task: "오류".to_string(),
            is_running: false,
            keys_candidates_found: 0,
        }
    }
}
