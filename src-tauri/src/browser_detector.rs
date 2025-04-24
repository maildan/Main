use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use windows::{
    core::PWSTR,
    Win32::Foundation::*,
    Win32::System::Threading::*,
    Win32::UI::WindowsAndMessaging::*,
};
use serde::Serialize;

// 프로세스 정보 캐시 - 성능 향상을 위해 한번 조회한 프로세스 정보를 저장
static PROCESS_CACHE: Lazy<Mutex<HashMap<u32, ProcessInfo>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

// 마지막으로 감지된 애플리케이션 정보를 저장하는 전역 변수
static LAST_DETECTED_APP: Lazy<Mutex<Option<BrowserInfo>>> = Lazy::new(|| {
    Mutex::new(None)
});

// 캐시를 주기적으로 초기화 (오래된 프로세스 정보 제거)
#[allow(dead_code)]
fn maybe_clear_cache() {
    static COUNTER: Lazy<Mutex<u32>> = Lazy::new(|| Mutex::new(0));
    
    let mut counter = COUNTER.lock().unwrap();
    *counter += 1;
    
    // 100회 호출마다 캐시 초기화 (임의 값이며 필요에 따라 조정 가능)
    if *counter >= 100 {
        *counter = 0;
        PROCESS_CACHE.lock().unwrap().clear();
    }
}

// 애플리케이션 유형을 나타내는 열거형 (웹앱 + 바로가기 앱 모두 포함)
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum AppType {
    // 웹 애플리케이션
    GoogleDocs,
    GoogleSheets,
    GoogleSlides,
    Notion,
    Trello,
    GitHub,
    Gmail,
    YouTube,
    Instagram,
    
    // 오피스 애플리케이션
    MicrosoftWord,
    MicrosoftExcel,
    MicrosoftPowerPoint,
    MicrosoftOneNote,
    
    // 코딩 애플리케이션
    VSCode,
    IntelliJ,
    Eclipse,
    AndroidStudio,
    
    // SNS 애플리케이션
    KakaoTalk,
    Discord,

    // 문서 애플리케이션
    Notepad,
    
    // 기타
    Other,
    None,
}

// 문자열을 AppType으로 변환하는 구현
impl From<&str> for AppType {
    fn from(s: &str) -> Self {
        match s {
            // 웹 애플리케이션
            "GoogleDocs" => AppType::GoogleDocs,
            "GoogleSheets" => AppType::GoogleSheets,
            "GoogleSlides" => AppType::GoogleSlides,
            "Notion" => AppType::Notion,
            "Trello" => AppType::Trello,
            "GitHub" => AppType::GitHub,
            "Gmail" => AppType::Gmail,
            "YouTube" => AppType::YouTube,
            
            // 오피스 애플리케이션
            "Word" | "WINWORD" => AppType::MicrosoftWord,
            "Excel" | "EXCEL" => AppType::MicrosoftExcel,
            "PowerPoint" | "POWERPNT" => AppType::MicrosoftPowerPoint,
            "OneNote" | "ONENOTE" => AppType::MicrosoftOneNote,
            
            // 코딩 애플리케이션
            "VSCode" | "Code" => AppType::VSCode,
            "IntelliJ" | "idea64" => AppType::IntelliJ,
            "Eclipse" => AppType::Eclipse,
            "Android Studio" => AppType::AndroidStudio,
            
            // SNS 애플리케이션
            "KakaoTalk" => AppType::KakaoTalk,
            "Discord" => AppType::Discord,
            
            // 문서 애플리케이션
            "Notepad" | "notepad" => AppType::Notepad,
            
            _ => AppType::Other,
        }
    }
}

// 문자열로 변환하는 Display 구현
impl std::fmt::Display for AppType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            AppType::GoogleDocs => "Google Docs",
            AppType::GoogleSheets => "Google Sheets",
            AppType::GoogleSlides => "Google Slides",
            AppType::Notion => "Notion",
            AppType::Trello => "Trello",
            AppType::GitHub => "GitHub",
            AppType::Gmail => "Gmail",
            AppType::YouTube => "YouTube",
            AppType::Instagram => "Instagram",
            AppType::MicrosoftWord => "Microsoft Word",
            AppType::MicrosoftExcel => "Microsoft Excel",
            AppType::MicrosoftPowerPoint => "Microsoft PowerPoint",
            AppType::MicrosoftOneNote => "Microsoft OneNote",
            AppType::VSCode => "VSCode",
            AppType::IntelliJ => "IntelliJ",
            AppType::Eclipse => "Eclipse",
            AppType::AndroidStudio => "Android Studio",
            AppType::KakaoTalk => "KakaoTalk",
            AppType::Discord => "Discord",
            AppType::Notepad => "메모장",
            AppType::Other => "Other",
            AppType::None => "None",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct BrowserInfo {
    pub name: String,
    pub process_id: u32,
    pub window_title: String,
    pub web_app: AppType, // 변경된 필드: 애플리케이션 유형
}

// 알려진 브라우저 프로세스 이름 목록
const BROWSER_PROCESSES: [&str; 6] = [
    "chrome.exe",
    "firefox.exe", 
    "msedge.exe",
    "iexplore.exe", 
    "brave.exe",
    "opera.exe",
];

// 웹 애플리케이션 패턴 (창 제목 기반)
const WEB_APP_PATTERNS: [(AppType, &[&str]); 9] = [
    (AppType::GoogleDocs, &["Google Docs", "docs.google.com"]),
    (AppType::GoogleSheets, &["Google Sheets", "sheets.google.com"]),
    (AppType::GoogleSlides, &["Google Slides", "slides.google.com"]),
    (AppType::Notion, &["Notion", "notion.so"]),
    (AppType::Trello, &["Trello", "trello.com"]),
    (AppType::GitHub, &["GitHub", "github.com"]),
    (AppType::Gmail, &["Gmail", "mail.google.com"]),
    (AppType::YouTube, &["YouTube", "youtube.com"]),
    (AppType::Instagram, &["Instagram", "instagram.com", "인스타그램"]),
];

// 알려진 애플리케이션 프로세스 목록 (브라우저 외의 앱도 포함)
const APP_PROCESSES: [(&str, AppType); 15] = [
    // 브라우저
    ("chrome.exe", AppType::Other),
    ("firefox.exe", AppType::Other),
    ("msedge.exe", AppType::Other),
    ("brave.exe", AppType::Other),
    ("opera.exe", AppType::Other),
    
    // 오피스 애플리케이션 
    ("winword.exe", AppType::MicrosoftWord),
    ("excel.exe", AppType::MicrosoftExcel),
    ("powerpnt.exe", AppType::MicrosoftPowerPoint),
    ("onenote.exe", AppType::MicrosoftOneNote),
    
    // 코딩 애플리케이션
    ("code.exe", AppType::VSCode),
    ("idea64.exe", AppType::IntelliJ),
    ("eclipse.exe", AppType::Eclipse),
    
    // SNS 애플리케이션
    ("kakaotalk.exe", AppType::KakaoTalk),
    ("discord.exe", AppType::Discord),
    
    // 문서 애플리케이션
    ("notepad.exe", AppType::Notepad),
];

// 창 제목에서 애플리케이션 유형 감지 함수
fn detect_web_app_from_title(window_title: &str) -> AppType {
    let lower_title = window_title.to_lowercase();
    
    for (app_type, patterns) in WEB_APP_PATTERNS.iter() {
        for pattern in patterns.iter() {
            if lower_title.contains(&pattern.to_lowercase()) {
                return app_type.clone();
            }
        }
    }
    
    AppType::None
}

// 외부에서 호출할 메인 함수
pub fn detect_active_browsers() -> Vec<BrowserInfo> {
    let mut active_browsers = Vec::new();
    
    // 현재 포그라운드(foreground) 창의 핸들 가져오기
    let foreground_window = unsafe { GetForegroundWindow() };
    
    // 활성화된 창의 프로세스 ID 가져오기
    let mut process_id = 0;
    unsafe { GetWindowThreadProcessId(foreground_window, Some(&mut process_id)) };
    
    if process_id > 0 {
        // 프로세스 정보 가져오기
        if let Some(process_info) = get_process_info(process_id) {
            // 프로세스 이름 확인
            if let Some(process_name) = process_info.name.to_lowercase().split('\\').last() {
                // 브라우저인지 확인
                if BROWSER_PROCESSES.iter().any(|&browser| process_name.contains(browser)) {
                    // 창 제목 가져오기
                    let window_title = get_window_title(foreground_window);
                    
                    // 브라우저 이름 결정
                    let browser_name = match process_name {
                        name if name.contains("chrome") => "Google Chrome",
                        name if name.contains("firefox") => "Mozilla Firefox",
                        name if name.contains("msedge") => "Microsoft Edge",
                        name if name.contains("iexplore") => "Internet Explorer",
                        name if name.contains("brave") => "Brave Browser",
                        name if name.contains("opera") => "Opera Browser",
                        _ => "Unknown Browser",
                    };
                    
                    // 애플리케이션 유형 감지
                    let web_app = detect_web_app_from_title(&window_title);
                    
                    active_browsers.push(BrowserInfo {
                        name: browser_name.to_string(),
                        process_id,
                        window_title,
                        web_app,
                    });
                }
            }
        }
    }
    
    active_browsers
}

// 프로세스 정보를 가져오는 함수
#[derive(Debug, Clone)]
struct ProcessInfo {
    name: String,
}

fn get_process_info(process_id: u32) -> Option<ProcessInfo> {
    // 주기적으로 캐시 초기화 확인
    maybe_clear_cache();
    
    // 캐시에서 프로세스 정보 조회
    {
        let cache = PROCESS_CACHE.lock().unwrap();
        if let Some(info) = cache.get(&process_id) {
            return Some(info.clone());
        }
    }
    
    unsafe {
        // 프로세스 핸들 열기
        let process_handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, process_id);
        if let Ok(process_handle) = process_handle {
            let mut buffer = [0u16; MAX_PATH as usize];
            let mut size = buffer.len() as u32;
            
            // 프로세스 경로 가져오기
            if QueryFullProcessImageNameW(process_handle, PROCESS_NAME_FORMAT(0), PWSTR(buffer.as_mut_ptr()), &mut size).as_bool() {
                // UTF-16 버퍼를 문자열로 변환
                let path = String::from_utf16_lossy(&buffer[..size as usize]);
                
                let info = ProcessInfo { name: path };
                
                // 캐시에 프로세스 정보 저장
                PROCESS_CACHE.lock().unwrap().insert(process_id, info.clone());
                
                CloseHandle(process_handle);
                return Some(info);
            }
            CloseHandle(process_handle);
        }
    }
    None
}

// 창 제목을 가져오는 함수
fn get_window_title(window_handle: HWND) -> String {
    let mut title = [0u16; 512];
    let len = unsafe { GetWindowTextW(window_handle, &mut title) };
    if len > 0 {
        return String::from_utf16_lossy(&title[..len as usize]);
    }
    "Unknown".to_string()
}

// 열려 있는 모든 브라우저 창을 찾는다
pub fn find_all_browser_windows() -> Vec<BrowserInfo> {
    let mut browser_windows = Vec::new();
    
    let mut enum_data = Vec::new();
    
    unsafe {
        EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut enum_data as *mut _ as isize),
        );
    }
    
    for browser_info in enum_data {
        browser_windows.push(browser_info);
    }
    
    browser_windows
}

// EnumWindows 콜백 함수
unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let enum_data = &mut *(lparam.0 as *mut Vec<BrowserInfo>);
    
    // 창이 보이는지 확인
    if IsWindowVisible(hwnd).as_bool() {
        // 창의 프로세스 ID 가져오기
        let mut process_id = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        
        if process_id > 0 {
            // 프로세스 정보 가져오기
            if let Some(process_info) = get_process_info(process_id) {
                // 프로세스 이름 확인
                if let Some(process_name) = process_info.name.to_lowercase().split('\\').last() {
                    // 브라우저인지 확인
                    if BROWSER_PROCESSES.iter().any(|&browser| process_name.contains(browser)) {
                        // 창 제목 가져오기
                        let window_title = get_window_title(hwnd);
                        
                        // 창 제목이 비어있지 않고 유효한 경우만 추가
                        if !window_title.is_empty() && window_title != "Unknown" {
                            // 브라우저 이름 결정
                            let browser_name = match process_name {
                                name if name.contains("chrome") => "Google Chrome",
                                name if name.contains("firefox") => "Mozilla Firefox",
                                name if name.contains("msedge") => "Microsoft Edge",
                                name if name.contains("iexplore") => "Internet Explorer",
                                name if name.contains("brave") => "Brave Browser",
                                name if name.contains("opera") => "Opera Browser",
                                _ => "Unknown Browser",
                            };
                            
                            // 애플리케이션 유형 감지
                            let web_app = detect_web_app_from_title(&window_title);
                            
                            enum_data.push(BrowserInfo {
                                name: browser_name.to_string(),
                                process_id,
                                window_title,
                                web_app,
                            });
                        }
                    }
                }
            }
        }
    }
    
    TRUE // 열거 계속
}

// 모든 실행 중인 애플리케이션을 감지하는 함수 (브라우저 + 바로가기 앱)
pub fn find_all_applications() -> Vec<BrowserInfo> {
    let mut all_applications = Vec::new();
    
    let mut enum_data = Vec::new();
    
    unsafe {
        EnumWindows(
            Some(enum_all_apps_proc),
            LPARAM(&mut enum_data as *mut _ as isize),
        );
    }
    
    for app_info in enum_data {
        all_applications.push(app_info);
    }
    
    all_applications
}

// 모든 애플리케이션 창을 열거하는 콜백 함수
unsafe extern "system" fn enum_all_apps_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let enum_data = &mut *(lparam.0 as *mut Vec<BrowserInfo>);
    
    // 창이 보이는지 확인
    if IsWindowVisible(hwnd).as_bool() {
        // 창의 프로세스 ID 가져오기
        let mut process_id = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        
        if process_id > 0 {
            // 프로세스 정보 가져오기
            if let Some(process_info) = get_process_info(process_id) {
                // 프로세스 이름 확인
                if let Some(process_name) = process_info.name.to_lowercase().split('\\').last() {
                    // 창 제목 가져오기
                    let window_title = get_window_title(hwnd);
                    
                    // 창 제목이 비어있지 않고 유효한 경우만 추가
                    if !window_title.is_empty() && window_title != "Unknown" {
                        // 애플리케이션 유형 감지
                        let mut app_type = AppType::Other;
                        let mut app_name = "Unknown Application";
                        
                        // 알려진 애플리케이션인지 확인
                        for (app_process, app_type_enum) in APP_PROCESSES.iter() {
                            if process_name.contains(app_process) {
                                app_type = app_type_enum.clone();
                                
                                // 앱 이름 설정
                                app_name = match app_type {
                                    AppType::MicrosoftWord => "Microsoft Word",
                                    AppType::MicrosoftExcel => "Microsoft Excel",
                                    AppType::MicrosoftPowerPoint => "Microsoft PowerPoint",
                                    AppType::MicrosoftOneNote => "Microsoft OneNote",
                                    AppType::VSCode => "VS Code",
                                    AppType::IntelliJ => "IntelliJ",
                                    AppType::Eclipse => "Eclipse",
                                    AppType::KakaoTalk => "KakaoTalk",
                                    AppType::Discord => "Discord",
                                    AppType::Notepad => "메모장",
                                    _ => "Unknown Application",
                                };
                                
                                break;
                            }
                        }
                        
                        // 브라우저인 경우, 웹앱 타입도 함께 확인
                        if BROWSER_PROCESSES.iter().any(|&browser| process_name.contains(browser)) {
                            app_type = detect_web_app_from_title(&window_title);
                        }
                        
                        enum_data.push(BrowserInfo {
                            name: app_name.to_string(),
                            process_id,
                            window_title,
                            web_app: app_type,
                        });
                    }
                }
            }
        }
    }
    
    TRUE // 열거 계속
}

// 현재 활성화되어 있는 애플리케이션을 감지하는 함수 (브라우저 + 모든 앱)
pub fn detect_active_application() -> Option<BrowserInfo> {
    // 현재 포그라운드(foreground) 창의 핸들 가져오기
    let foreground_window = unsafe { GetForegroundWindow() };
    
    // 활성화된 창이 없으면 마지막 감지된 앱 정보 반환
    if foreground_window.0 == 0 {
        return check_last_app_still_running();
    }
    
    // 활성화된 창의 프로세스 ID 가져오기
    let mut process_id = 0;
    unsafe { GetWindowThreadProcessId(foreground_window, Some(&mut process_id)) };
    
    if process_id > 0 {
        // 프로세스 정보 가져오기
        if let Some(process_info) = get_process_info(process_id) {
            // 프로세스 이름 확인
            if let Some(process_name) = process_info.name.to_lowercase().split('\\').last() {
                // Loop 앱 자체는 제외하고 마지막 감지된 앱 정보 반환
                if process_name.contains("loop.exe") {
                    return check_last_app_still_running();
                }
                
                // 창 제목 가져오기
                let window_title = get_window_title(foreground_window);
                
                // 앱 타입과 이름 결정
                let mut app_type = AppType::Other;
                let mut app_name = "Unknown Application";
                
                // 브라우저인지 확인
                if BROWSER_PROCESSES.iter().any(|&browser| process_name.contains(browser)) {
                    // 브라우저 이름 결정
                    app_name = match process_name {
                        name if name.contains("chrome") => "Google Chrome",
                        name if name.contains("firefox") => "Mozilla Firefox",
                        name if name.contains("msedge") => "Microsoft Edge",
                        name if name.contains("iexplore") => "Internet Explorer",
                        name if name.contains("brave") => "Brave Browser",
                        name if name.contains("opera") => "Opera Browser",
                        _ => "Unknown Browser",
                    };
                    
                    // 웹 애플리케이션 타입 감지 (구글 문서, Notion 등)
                    app_type = detect_web_app_from_title(&window_title);
                } else {
                    // 알려진 애플리케이션인지 확인
                    for (app_process, app_type_enum) in APP_PROCESSES.iter() {
                        if process_name.contains(app_process) {
                            app_type = app_type_enum.clone();
                            
                            // 앱 이름 설정
                            app_name = match app_type {
                                AppType::MicrosoftWord => "Microsoft Word",
                                AppType::MicrosoftExcel => "Microsoft Excel",
                                AppType::MicrosoftPowerPoint => "Microsoft PowerPoint",
                                AppType::MicrosoftOneNote => "Microsoft OneNote",
                                AppType::VSCode => "VS Code",
                                AppType::IntelliJ => "IntelliJ",
                                AppType::Eclipse => "Eclipse",
                                AppType::KakaoTalk => "KakaoTalk",
                                AppType::Discord => "Discord",
                                AppType::Notepad => "메모장",
                                _ => "Unknown Application",
                            };
                            
                            break;
                        }
                    }
                }
                
                // 새로 감지된 애플리케이션 정보 생성
                let app_info = BrowserInfo {
                    name: app_name.to_string(),
                    process_id,
                    window_title,
                    web_app: app_type,
                };
                
                // 마지막 감지된 앱 정보 업데이트
                *LAST_DETECTED_APP.lock().unwrap() = Some(app_info.clone());
                
                return Some(app_info);
            }
        }
    }
    
    // 기존에 감지된 앱 정보 없으면 None 반환
    check_last_app_still_running()
}

// 마지막으로 감지된 앱이 여전히 실행 중인지 확인
fn check_last_app_still_running() -> Option<BrowserInfo> {
    let last_app = LAST_DETECTED_APP.lock().unwrap().clone();
    
    if let Some(app) = last_app {
        // 프로세스 ID로 앱이 여전히 실행 중인지 확인
        let process_id = app.process_id;
        if process_still_running(process_id) {
            return Some(app);
        } else {
            // 앱이 종료된 경우 캐시 정보 삭제
            *LAST_DETECTED_APP.lock().unwrap() = None;
        }
    }
    
    None
}

// 특정 프로세스가 여전히 실행 중인지 확인
fn process_still_running(process_id: u32) -> bool {
    // 특수 프로세스 ID 검사 (시스템 프로세스 등)
    if process_id == 0 || process_id == 4 || process_id == 8 {
        return false;
    }

    unsafe {
        // 프로세스 핸들 열기 (종료 권한 없이)
        let process_handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id);
        if let Ok(handle) = process_handle {
            // 프로세스 종료 코드 조회
            let mut exit_code = 0;
            if GetExitCodeProcess(handle, &mut exit_code).as_bool() {
                // STILL_ACTIVE 상수는 259 (프로세스가 아직 실행 중)
                let is_running = exit_code == 259;
                CloseHandle(handle);
                
                if !is_running {
                    // 프로세스 캐시에서도 제거
                    PROCESS_CACHE.lock().unwrap().remove(&process_id);
                    println!("프로세스 {} 종료 감지됨", process_id);
                }
                
                return is_running;
            }
            CloseHandle(handle);
        }
    }
    
    // 핸들을 얻지 못했거나 종료 코드를 확인할 수 없는 경우
    // 프로세스가 이미 종료된 것으로 간주
    // 프로세스 캐시에서도 제거
    PROCESS_CACHE.lock().unwrap().remove(&process_id);
    false
}

// 외부에서 프로세스 실행 상태를 확인할 수 있는 함수 (프론트엔드에서 호출)
pub fn is_process_running(process_id: u32) -> bool {
    process_still_running(process_id)
}