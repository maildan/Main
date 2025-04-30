extern crate napi_build;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=Cargo.toml");
    println!("cargo:rerun-if-changed=src/");
    
    // NAPI 빌드 과정 실행
    napi_build::setup();
    
    // 빌드 시간에 OS 정보 출력
    println!("cargo:rustc-env=TARGET_OS={}", std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default());
    println!("cargo:rustc-env=TARGET_ARCH={}", std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default());
    
    // 디버그 모드에서 특정 기능 활성화
    if std::env::var("PROFILE").unwrap_or_default() == "debug" {
        println!("cargo:rustc-cfg=debug_mode");
    }
    
    // OS별 특정 기능 활성화
    if cfg!(target_os = "windows") {
        println!("cargo:rustc-cfg=platform_windows");
    } else if cfg!(target_os = "macos") {
        println!("cargo:rustc-cfg=platform_macos");
    } else if cfg!(target_os = "linux") {
        println!("cargo:rustc-cfg=platform_linux");
    }
    
    // 필요에 따라 추가 링커 플래그 설정
    if cfg!(target_os = "linux") {
        println!("cargo:rustc-link-lib=dylib=stdc++");
    }
}
