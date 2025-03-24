/**
 * 네이티브 모듈 설치 스크립트
 * Rust 툴체인 확인 및 네이티브 모듈 빌드를 처리합니다.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 로그 출력 함수
function log(message) {
  console.log(`[install-native] ${message}`);
}

// 오류 로그 함수
function error(message) {
  console.error(`[install-native] ❌ ${message}`);
}

// 성공 로그 함수
function success(message) {
  console.log(`[install-native] ✅ ${message}`);
}

// 경로 설정
const rootDir = path.resolve(__dirname, '..');
const nativeModulesDir = path.join(rootDir, 'native-modules');
const targetDir = path.join(rootDir, 'src', 'server', 'native');

// Rust 설치 확인
function checkRustInstalled() {
  try {
    const rustcVersion = execSync('rustc --version', { encoding: 'utf8' });
    log(`Rust 설치 확인됨: ${rustcVersion.trim()}`);
    return true;
  } catch (e) {
    error('Rust가 설치되어 있지 않습니다. https://rustup.rs/ 에서 설치해주세요.');
    return false;
  }
}

// Cargo 확인
function checkCargoInstalled() {
  try {
    const cargoVersion = execSync('cargo --version', { encoding: 'utf8' });
    log(`Cargo 설치 확인됨: ${cargoVersion.trim()}`);
    return true;
  } catch (e) {
    error('Cargo가 설치되어 있지 않습니다. Rust와 함께 설치되어야 합니다.');
    return false;
  }
}

// 네이티브 모듈이 빌드 가능한지 확인
function checkNativeModuleBuildable() {
  if (!fs.existsSync(nativeModulesDir)) {
    error(`네이티브 모듈 디렉토리를 찾을 수 없습니다: ${nativeModulesDir}`);
    return false;
  }
  
  const cargoTomlPath = path.join(nativeModulesDir, 'Cargo.toml');
  if (!fs.existsSync(cargoTomlPath)) {
    error(`Cargo.toml을 찾을 수 없습니다: ${cargoTomlPath}`);
    return false;
  }
  
  return true;
}

// 네이티브 모듈 빌드
function buildNativeModule() {
  try {
    log('네이티브 모듈 빌드 중...');
    
    // 빌드 디렉토리로 이동하고 빌드 명령 실행
    process.chdir(nativeModulesDir);
    
    // 운영체제에 따라 다른 빌드 옵션 사용
    const isWindows = os.platform() === 'win32';
    const buildCommand = isWindows
      ? 'cargo build --release --target-dir target'
      : 'cargo build --release';
    
    execSync(buildCommand, { stdio: 'inherit' });
    
    success('네이티브 모듈 빌드 완료!');
    return true;
  } catch (e) {
    error(`네이티브 모듈 빌드 중 오류 발생: ${e.message}`);
    return false;
  } finally {
    // 원래 디렉토리로 돌아가기
    process.chdir(rootDir);
  }
}

// 빌드된 네이티브 모듈 복사
function copyNativeModule() {
  try {
    log('빌드된 네이티브 모듈 복사 중...');
    
    // 타겟 디렉토리 생성 (없는 경우)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      log(`타겟 디렉토리 생성됨: ${targetDir}`);
    }
    
    // 복사 스크립트 실행
    execSync('node scripts/copy-native.js', { stdio: 'inherit' });
    
    success('네이티브 모듈 복사 완료!');
    return true;
  } catch (e) {
    error(`네이티브 모듈 복사 중 오류 발생: ${e.message}`);
    return false;
  }
}

// 메인 설치 함수
function installNativeModule() {
  log('네이티브 모듈 설치 시작...');
  
  // 전제 조건 확인
  const rustInstalled = checkRustInstalled();
  const cargoInstalled = checkCargoInstalled();
  const buildable = checkNativeModuleBuildable();
  
  if (!rustInstalled || !cargoInstalled || !buildable) {
    error('네이티브 모듈 설치를 위한 전제 조건이 충족되지 않았습니다.');
    return false;
  }
  
  // 빌드 및 복사
  const buildSuccess = buildNativeModule();
  if (!buildSuccess) {
    error('네이티브 모듈 빌드에 실패했습니다.');
    return false;
  }
  
  const copySuccess = copyNativeModule();
  if (!copySuccess) {
    error('네이티브 모듈 복사에 실패했습니다.');
    return false;
  }
  
  success('네이티브 모듈 설치가 성공적으로 완료되었습니다!');
  return true;
}

// 스크립트 실행
if (installNativeModule()) {
  process.exit(0);
} else {
  log('네이티브 모듈 없이 JS 폴백 모드로 실행됩니다.');
  process.exit(0); // 비정상 종료 코드로 변경해서는 안 됨 (npm install 실패로 간주됨)
}
