/**
 * 네이티브 모듈 설치 스크립트
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 경로 설정
const projectRoot = path.resolve(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');

console.log('📦 네이티브 모듈 설치 스크립트 실행 중...');

// Rust가 설치되어 있는지 확인
function checkRustInstalled() {
  try {
    execSync('rustc --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// 네이티브 모듈 디렉토리 확인
if (fs.existsSync(nativeModulesDir)) {
  console.log('✅ 네이티브 모듈 디렉토리 발견됨:', nativeModulesDir);
  
  // Rust 설치 확인
  if (checkRustInstalled()) {
    console.log('✅ Rust 설치 확인됨, 네이티브 모듈 빌드 시도...');
    
    try {
      // 네이티브 모듈 빌드
      execSync('npm run build:native', { stdio: 'inherit' });
      console.log('✅ 네이티브 모듈 빌드 완료');
      
      // 네이티브 모듈 복사
      execSync('npm run copy-native', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ 네이티브 모듈 빌드 또는 복사 실패:', error.message);
      console.log('💡 아래 명령어로 수동 빌드를 시도해보세요:');
      console.log('npm run build:native && npm run copy-native');
    }
  } else {
    console.log('⚠️ Rust가 설치되어 있지 않습니다. 폴백 구현이 사용됩니다.');
    console.log('💡 Rust를 설치하려면: https://rustup.rs/');
  }
} else {
  console.log('⚠️ 네이티브 모듈 디렉토리를 찾을 수 없습니다:', nativeModulesDir);
}

console.log('📦 네이티브 모듈 설치 스크립트 완료.');
