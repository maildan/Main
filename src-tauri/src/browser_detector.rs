use windows::{
    core::PWSTR,
    Win32::Foundation::*,
    Win32::System::Threading::*,
    Win32::UI::WindowsAndMessaging::*,
};
use serde::Serialize;

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
            AppType::Other => "Other",
            AppType::None => "None",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Serialize)]
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
const APP_PROCESSES: [(&str, AppType); 14] = [
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
#[derive(Debug)]
struct ProcessInfo {
    name: String,
}

fn get_process_info(process_id: u32) -> Option<ProcessInfo> {
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
                
                CloseHandle(process_handle);
                return Some(ProcessInfo { name: path });
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
                                    AppType::VSCode => "Visual Studio Code",
                                    AppType::IntelliJ => "IntelliJ IDEA",
                                    AppType::Eclipse => "Eclipse IDE",
                                    AppType::KakaoTalk => "KakaoTalk",
                                    AppType::Discord => "Discord",
                                    _ => {
                                        // 브라우저인 경우
                                        if app_process == &"chrome.exe" { "Google Chrome" }
                                        else if app_process == &"firefox.exe" { "Mozilla Firefox" }
                                        else if app_process == &"msedge.exe" { "Microsoft Edge" }
                                        else if app_process == &"brave.exe" { "Brave Browser" }
                                        else if app_process == &"opera.exe" { "Opera Browser" }
                                        else { "Unknown Application" }
                                    }
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