// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// lib.rs에 정의된 run 함수를 사용
fn main() {
    // typing_app_lib은 Cargo.toml에 정의된 라이브러리 이름입니다
    typing_app_lib::run();
}
