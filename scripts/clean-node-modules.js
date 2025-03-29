/**
 * node_modules 및 package-lock.json 안전 제거 스크립트
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 루트 디렉토리
const rootDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(rootDir, 'node_modules');
const packageLockPath = path.join(rootDir, 'package-lock.json');

console.log('🧹 node_modules 및 관련 파일 정리 시작...');

// package-lock.json 처리
try {
  if (fs.existsSync(packageLockPath)) {
    // 백업 생성
    const backupPath = `${packageLockPath}.backup`;
    console.log('📦 package-lock.json 백업 중...');
    fs.copyFileSync(packageLockPath, backupPath);
    
    // 파일 삭제
    console.log('🗑️ package-lock.json 삭제 중...');
    fs.unlinkSync(packageLockPath);
    console.log('✅ package-lock.json 삭제 완료');
  } else {
    console.log('✓ package-lock.json 파일이 이미 없습니다');
  }
} catch (err) {
  console.warn('⚠️ package-lock.json 처리 중 오류:', err.message);
}

// node_modules 삭제
if (fs.existsSync(nodeModulesPath)) {
  console.log('🗑️ node_modules 폴더 삭제 중...');
  
  try {
    // Windows에서는 먼저 읽기 전용 속성 제거
    if (process.platform === 'win32') {
      try {
        execSync(`attrib -R "${nodeModulesPath}\\*.*" /S`, { stdio: 'ignore' });
      } catch (e) {
        // 에러 무시
      }
    }
    
    // 폴더 삭제 시도 1: fs.rmSync
    try {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true, maxRetries: 5 });
      console.log('✅ node_modules 폴더 삭제 성공');
    } catch (err) {
      console.log('⚠️ 기본 삭제 실패, 강력한 방법으로 재시도...');
      
      // 플랫폼별 강력한 삭제 명령 시도
      if (process.platform === 'win32') {
        try {
          execSync(`rmdir /s /q "${nodeModulesPath}"`, { stdio: 'ignore' });
          console.log('✅ 명령 프롬프트로 node_modules 폴더 삭제 성공');
        } catch (e) {
          console.error('❌ node_modules 폴더 삭제 실패, 수동 삭제가 필요할 수 있습니다');
          console.log(`💡 관리자 권한으로 명령 프롬프트를 열고 다음 명령어를 실행하세요: rmdir /s /q "${nodeModulesPath}"`);
        }
      } else {
        // Unix 계열 시스템
        try {
          execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'ignore' });
          console.log('✅ rm 명령으로 node_modules 폴더 삭제 성공');
        } catch (e) {
          console.error('❌ node_modules 폴더 삭제 실패, 수동 삭제가 필요할 수 있습니다');
          console.log(`💡 터미널에서 다음 명령어를 실행하세요: sudo rm -rf "${nodeModulesPath}"`);
        }
      }
    }
  } catch (error) {
    console.error('❌ node_modules 폴더 삭제 중 예기치 않은 오류 발생:', error.message);
  }
} else {
  console.log('✓ node_modules 폴더가 이미 없습니다');
}

console.log('🧹 정리 작업 완료');
