use std::process::Command;

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .output()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&url)
            .output()
    } else {
        Command::new("xdg-open")
            .arg(&url)
            .output()
    };
    match result {
        Ok(_) => {
            println!("Opened URL in browser: {}", url);
            Ok(())
        }
        Err(e) => Err(format!("Failed to open URL: {}", e))
    }
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
