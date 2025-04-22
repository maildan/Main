use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use chrono::Local;
use tauri::AppHandle;
use std::sync::atomic::{AtomicBool, Ordering};
use lazy_static::lazy_static;

// 브라우저 감지 모듈 추가
pub mod browser_detector;

// 키보드 트래킹 활성화 상태를 저장하는 전역 변수
lazy_static! {
    static ref TRACKING_ENABLED: AtomicBool = AtomicBool::new(false);
}

// 로그 저장 경로 상수 정의
const LOG_DIRECTORY: &str = "c:\\Loop\\logs";

#[derive(Serialize, Deserialize)]
struct TypingData {
    timestamp: String,
    key: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 데이터 저장 경로를 가져오는 함수
fn get_data_file_path(_app_handle: &AppHandle) -> PathBuf {
    // Tauri 2.0에서는 path_resolver() 대신 다른 방법을 사용해야 함
    // 임시 디렉토리에 저장
    let mut path = std::env::temp_dir();
    path.push("typing_app");
    
    // 디렉토리가 없다면 생성
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create app data directory");
    }
    
    path.push("typing_data.json");
    path
}

// 로그 디렉토리 경로를 가져오는 함수
fn get_log_directory() -> PathBuf {
    let path = PathBuf::from(LOG_DIRECTORY);
    
    // 디렉토리가 없다면 생성
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create log directory");
    }
    
    path
}

// 키보드 트래킹 활성화/비활성화
#[tauri::command]
fn set_tracking_enabled(enabled: bool) -> Result<bool, String> {
    TRACKING_ENABLED.store(enabled, Ordering::SeqCst);
    println!("트래킹 상태: {}", if enabled { "활성화" } else { "비활성화" });
    Ok(enabled)
}

// 현재 트래킹 상태 확인
#[tauri::command]
fn get_tracking_status() -> bool {
    TRACKING_ENABLED.load(Ordering::SeqCst)
}

// 현재 활성화된 브라우저 감지
#[tauri::command]
fn detect_active_browsers() -> Result<Vec<browser_detector::BrowserInfo>, String> {
    let browsers = browser_detector::detect_active_browsers();
    Ok(browsers)
}

// 모든 브라우저 창 찾기
#[tauri::command]
fn find_all_browser_windows() -> Result<Vec<browser_detector::BrowserInfo>, String> {
    let browsers = browser_detector::find_all_browser_windows();
    Ok(browsers)
}

// 모든 애플리케이션 찾기
#[tauri::command]
fn find_all_applications() -> Result<Vec<browser_detector::BrowserInfo>, String> {
    let applications = browser_detector::find_all_applications();
    Ok(applications)
}

// 브라우저와 현재 URL 정보 로깅
#[tauri::command]
fn log_browser_activity(_app_handle: AppHandle) -> Result<(), String> {
    // 트래킹이 비활성화되어 있으면 저장하지 않음
    if !TRACKING_ENABLED.load(Ordering::SeqCst) {
        return Ok(());
    }

    let browsers = browser_detector::detect_active_browsers();
    if !browsers.is_empty() {
        // 첫 번째 감지된 브라우저 정보 사용
        let browser = &browsers[0];
        
        // 브라우저 활동 로그 저장
        let data = serde_json::json!({
            "timestamp": Local::now().to_rfc3339(),
            "browser_name": browser.name,
            "window_title": browser.window_title,
        });
        
        let mut log_path = get_log_directory();
        log_path.push("browser_activity_logs.json");

        // 기존 로그 파일이 있다면 읽기
        let mut logs = Vec::new();
        if log_path.exists() {
            let mut file = OpenOptions::new()
                .read(true)
                .open(&log_path)
                .map_err(|e| e.to_string())?;
            let mut contents = String::new();
            file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
            if !contents.is_empty() {
                logs = serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new());
            }
        }
        
        // 새 로그 추가
        logs.push(data);
        
        // 로그를 파일에 저장
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&log_path)
            .map_err(|e| e.to_string())?;
        
        let json_string = serde_json::to_string_pretty(&logs).map_err(|e| e.to_string())?;
        file.write_all(json_string.as_bytes()).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
fn save_typing_data(app_handle: AppHandle, key: &str) -> Result<(), String> {
    // 트래킹이 비활성화되어 있으면 저장하지 않음
    if !TRACKING_ENABLED.load(Ordering::SeqCst) {
        return Ok(());
    }

    // 터미널에 로그 출력
    println!("Key pressed: {}", key);
    
    let data = TypingData {
        timestamp: Local::now().to_rfc3339(),
        key: key.to_string(),
    };

    let file_path = get_data_file_path(&app_handle);
    let mut existing_data = Vec::new();

    if file_path.exists() {
        if let Ok(mut file) = OpenOptions::new().read(true).open(&file_path) {
            let mut contents = String::new();
            file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
            existing_data = serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new());
        }
    }

    existing_data.push(data);

    let json = serde_json::to_string(&existing_data).map_err(|e| e.to_string())?;
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    file.write_all(json.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn log_sentence(sentence: &str) -> Result<(), String> {
    // 트래킹이 비활성화되어 있으면 저장하지 않음
    if !TRACKING_ENABLED.load(Ordering::SeqCst) {
        return Ok(());
    }
    
    // 로그 파일 경로 설정
    let mut log_path = get_log_directory();
    log_path.push("sentence_logs.json");
    
    // 로그 데이터 생성
    let log_entry = serde_json::json!({
        "timestamp": Local::now().to_rfc3339(),
        "sentence": sentence
    });
    
    // 기존 로그 파일이 있다면 읽기
    let mut logs = Vec::new();
    if log_path.exists() {
        let mut file = OpenOptions::new()
            .read(true)
            .open(&log_path)
            .map_err(|e| e.to_string())?;
        let mut contents = String::new();
        file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
        if !contents.is_empty() {
            logs = serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new());
        }
    }
    
    // 새 로그 추가
    logs.push(log_entry);
    
    // 로그를 파일에 저장
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    
    let json_string = serde_json::to_string_pretty(&logs).map_err(|e| e.to_string())?;
    file.write_all(json_string.as_bytes()).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 프로그램 실행 함수
#[tauri::command]
fn launch_program(program_name: &str) -> Result<String, String> {
    // 프로그램별 실행 정보 매핑
    let program_info = match program_name {
        "구글 문서" => ("browser", "https://docs.google.com"),
        "구글 스프레드시트" => ("browser", "https://sheets.google.com"),
        "구글 프레젠테이션" => ("browser", "https://slides.google.com"),
        "Notion" => ("browser", "notion://"),
        "인스타그램" => ("browser", "https://instagram.com"),
        
        "워드" => ("native", "WINWORD.EXE"),
        "엑셀" => ("native", "EXCEL.EXE"), 
        "파워포인트" => ("native", "POWERPNT.EXE"),
        "원노트" => ("native", "ONENOTE.EXE"),
        
        "VS Code" => ("native", "code.exe"),
        "Inteliji" => ("native", "idea64.exe"),
        "Eclipse" => ("native", "eclipse.exe"),
        
        "카카오톡" => ("native", "KakaoTalk.exe"),
        "디스코드" => ("native", "Discord.exe"),
        
        _ => return Err(format!("알 수 없는 프로그램: {}", program_name)),
    };

    match program_info.0 {
        // 웹 URL은 브라우저로 열기
        "browser" => {
            if let Err(e) = open::that(program_info.1) {
                return Err(format!("프로그램을 실행하지 못했습니다: {}", e));
            }
            return Ok(format!("{}를 웹 브라우저에서 열었습니다.", program_name));
        },
        // 네이티브 프로그램 실행
        "native" => {
            // 프로그램 설치 여부 및 전체 경로 확인
            match find_program_path(program_info.1) {
                Some(full_path) => {
                    // 실행 파일이 있는 경우, 직접 실행
                    match Command::new(full_path.clone()).spawn() {
                        Ok(_) => Ok(format!("{}를 실행했습니다.", program_name)),
                        Err(e) => {
                            // 직접 실행 실패 시 cmd로 시도
                            match Command::new("cmd").args(&["/C", "start", "", &full_path]).spawn() {
                                Ok(_) => Ok(format!("{}를 실행했습니다.", program_name)),
                                Err(_) => Err(format!("프로그램 실행 중 오류가 발생했습니다: {}", e)),
                            }
                        }
                    }
                },
                None => Err(format!("{}가 설치되어 있지 않습니다.", program_name)),
            }
        },
        _ => Err(format!("프로그램 유형 오류: {}", program_name)),
    }
}

// 프로그램 전체 경로 찾기 함수
fn find_program_path(program_name: &str) -> Option<String> {
    // 1. where 명령어로 위치 찾기
    if let Ok(output) = Command::new("cmd").args(&["/C", &format!("where {}", program_name)]).output() {
        if output.status.success() {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                let lines: Vec<&str> = stdout.lines().collect();
                if !lines.is_empty() {
                    return Some(lines[0].trim().to_string());
                }
            }
        }
    }
    
    // 2. 일반적인 경로에서 검색
    let common_paths = match program_name.to_lowercase().as_str() {
        "code.exe" => vec![
            "C:\\Program Files\\Microsoft VS Code\\bin\\code.exe",
            "C:\\Program Files\\Microsoft VS Code\\Code.exe",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.exe"
        ],
        "kakaotalk.exe" => vec![
            "C:\\Program Files (x86)\\Kakao\\KakaoTalk\\KakaoTalk.exe",
            "C:\\Program Files\\Kakao\\KakaoTalk\\KakaoTalk.exe",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Kakao\\KakaoTalk\\KakaoTalk.exe"
        ],
        "discord.exe" => vec![
            "C:\\Program Files\\Discord\\Discord.exe",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Discord\\app-*\\Discord.exe",
            "C:\\Users\\%USERNAME%\\AppData\\Local\\Discord\\Update.exe"
        ],
        "winword.exe" => vec![
            "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
            "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
            "C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE"
        ],
        "excel.exe" => vec![
            "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE",
            "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\EXCEL.EXE",
            "C:\\Program Files\\Microsoft Office\\Office16\\EXCEL.EXE"
        ],
        "powerpnt.exe" => vec![
            "C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE",
            "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE",
            "C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE"
        ],
        "onenote.exe" => vec![
            "C:\\Program Files\\Microsoft Office\\root\\Office16\\ONENOTE.EXE",
            "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\ONENOTE.EXE",
            "C:\\Program Files\\Microsoft Office\\Office16\\ONENOTE.EXE"
        ],
        "idea64.exe" => vec![
            "C:\\Program Files\\JetBrains\\IntelliJ IDEA*\\bin\\idea64.exe"
        ],
        "eclipse.exe" => vec![
            "C:\\Eclipse\\eclipse.exe",
            "C:\\Program Files\\Eclipse\\eclipse.exe"
        ],
        _ => Vec::new(),
    };

    // USERNAME 환경 변수 가져오기
    if let Ok(username) = std::env::var("USERNAME") {
        for path_template in common_paths {
            let path_str = path_template.replace("%USERNAME%", &username);
            
            // 와일드카드가 포함된 경로 처리
            if path_str.contains('*') {
                let parts: Vec<&str> = path_str.split('*').collect();
                let prefix = parts[0];
                let prefix_dir = std::path::Path::new(prefix);
                
                if !prefix_dir.exists() || !prefix_dir.is_dir() {
                    continue;
                }
                
                if let Ok(entries) = std::fs::read_dir(prefix_dir) {
                    for entry in entries.filter_map(Result::ok) {
                        if entry.path().is_dir() {
                            let potential_path = if parts.len() > 1 {
                                entry.path().join(parts[1])
                            } else {
                                entry.path()
                            };
                            
                            if potential_path.exists() {
                                return Some(potential_path.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            } else if std::path::Path::new(&path_str).exists() {
                return Some(path_str);
            }
        }
    }
    
    // 3. PATH 환경 변수에서 검색
    if let Ok(path_var) = std::env::var("PATH") {
        for path in std::env::split_paths(&path_var) {
            let full_path = path.join(program_name);
            if full_path.exists() {
                return Some(full_path.to_string_lossy().to_string());
            }
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            save_typing_data, 
            log_sentence,
            set_tracking_enabled,
            get_tracking_status,
            // 브라우저 감지 관련 함수들 추가
            detect_active_browsers,
            find_all_browser_windows,
            log_browser_activity,
            // 프로그램 실행 관련 함수 추가
            launch_program,
            // 모든 애플리케이션 찾기 함수 추가
            find_all_applications
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}