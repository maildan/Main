use windows::{
    core::PWSTR,
    Win32::Foundation::*,
    Win32::System::Threading::*,
    Win32::UI::WindowsAndMessaging::*,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct BrowserInfo {
    pub name: String,
    pub process_id: u32,
    pub window_title: String,
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
                    
                    active_browsers.push(BrowserInfo {
                        name: browser_name.to_string(),
                        process_id,
                        window_title,
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
                            
                            enum_data.push(BrowserInfo {
                                name: browser_name.to_string(),
                                process_id,
                                window_title,
                            });
                        }
                    }
                }
            }
        }
    }
    
    TRUE // 열거 계속
}