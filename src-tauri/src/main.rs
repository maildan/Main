// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// lib.rs에 정의된 run 함수를 사용
fn main() {
    loop_app::run();
}
