/**
 * Rust 빌드 파일의 권한 문제를 해결하기 위한 스크립트
 * 
 * 이 스크립트는 Windows와 Unix 시스템에서 파일 권한 문제를 해결합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

console.log('🔧 파일 권한 문제 해결 도구 실행 중...');

// 주요 경로 설정
const rootDir = path.resolve(__dirname, '..');
const nativeDir = path.join(rootDir, 'native-modules');
const targetDir = path.join(nativeDir, 'target');

// 플랫폼 확인
const isWindows = process.platform === 'win32';
const isAdmin = checkAdminRights();

console.log(`💻 시스템 정보: ${os.platform()} ${os.release()} (${isAdmin ? '관리자 권한' : '일반 권한'})`);

/**
 * 관리자 권한 확인
 */
function checkAdminRights() {
  try {
    if (isWindows) {
      // Windows에서 관리자 권한 확인
      const output = execSync('net session', { stdio: 'ignore' });
      return true;
    } else {
      // Unix 계열에서 관리자 권한 확인
      return process.getuid && process.getuid() === 0;
    }
  } catch (e) {
    return false;
  }
}

/**
 * 파일 권한 문제 해결
 */
function fixPermissions() {
  // 1. 네이티브 모듈 디렉토리 존재 확인
  if (!fs.existsSync(nativeDir)) {
    console.log('⚠️ 네이티브 모듈 디렉토리가 없습니다. 아무 작업도 수행하지 않습니다.');
    return;
  }

  // 2. 타겟 디렉토리 권한 수정
  if (fs.existsSync(targetDir)) {
    console.log('🔍 Rust 빌드 디렉토리 권한 수정 중...');
    
    if (isWindows) {
      try {
        // Windows에서 읽기 전용 속성 제거 및 모든 권한 부여
        console.log('📂 Windows 파일 권한 수정 중...');
        execSync(`attrib -R "${targetDir}\\*.*" /S`, { stdio: 'ignore' });
        
        // 추가적인 Windows 권한 문제 해결
        try {
          execSync(`icacls "${targetDir}" /grant "%USERNAME%":F /T /Q`, { stdio: 'pipe' });
          console.log('✅ Windows 파일 권한 수정 완료');
        } catch (icaclsError) {
          console.warn('⚠️ icacls 명령 실행 중 오류가 발생했습니다:', icaclsError.message);
        }
      } catch (e) {
        console.error('❌ Windows 파일 권한 수정 실패:', e.message);
      }
    } else {
      // Unix 계열 시스템에서 권한 수정
      try {
        console.log('📂 Unix 파일 권한 수정 중...');
        execSync(`chmod -R u+w ${targetDir}`, { stdio: 'ignore' });
        console.log('✅ Unix 파일 권한 수정 완료');
      } catch (e) {
        console.error('❌ Unix 파일 권한 수정 실패:', e.message);
        
        if (!isAdmin) {
          console.log('💡 권한 문제 해결을 위해 관리자 권한으로 실행해보세요:');
          console.log(`   sudo chmod -R u+w "${targetDir}"`);
        }
      }
    }
  } else {
    console.log('⚠️ Rust 빌드 디렉토리가 존재하지 않습니다. 첫 빌드인 경우 정상입니다.');
  }

  // 3. 프로젝트 루트 디렉토리 권한 확인 및 수정
  console.log('🔍 프로젝트 디렉토리 권한 확인 중...');
  
  const criticalDirs = [
    path.join(rootDir, 'node_modules'),
    path.join(rootDir, '.next'),
    path.join(rootDir, 'out'),
    path.join(rootDir, '.vercel')
  ];
  
  criticalDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        if (isWindows) {
          // Windows에서 읽기 전용 속성 제거
          execSync(`attrib -R "${dir}\\*.*" /S`, { stdio: 'ignore' });
        } else {
          // Unix 계열에서 쓰기 권한 추가
          execSync(`chmod -R u+w ${dir}`, { stdio: 'ignore' });
        }
        console.log(`✅ ${path.basename(dir)} 디렉토리 권한 수정 완료`);
      } catch (e) {
        console.warn(`⚠️ ${path.basename(dir)} 디렉토리 권한 수정 중 오류:`, e.message);
      }
    }
  });
  
  // 4. npm 캐시 디렉토리 권한 수정
  try {
    const npmCachePath = path.join(os.homedir(), '.npm');
    if (fs.existsSync(npmCachePath)) {
      console.log('🔍 npm 캐시 디렉토리 권한 수정 중...');
      if (isWindows) {
        execSync(`attrib -R "${npmCachePath}\\*.*" /S`, { stdio: 'ignore' });
      } else {
        execSync(`chmod -R u+w "${npmCachePath}"`, { stdio: 'ignore' });
      }
      console.log('✅ npm 캐시 디렉토리 권한 수정 완료');
    }
  } catch (e) {
    console.warn('⚠️ npm 캐시 디렉토리 권한 수정 중 오류:', e.message);
  }
  
  console.log('✅ 파일 권한 문제 해결 작업이 완료되었습니다.');
  console.log('\n💡 이제 빌드 명령을 다시 실행해보세요:');
  console.log('   npm run build:native');
  
  // 5. 비관리자 권한으로 실행 시 안내
  if (!isAdmin) {
    console.log('\n⚠️ 일부 권한 문제는 관리자 권한이 필요할 수 있습니다.');
    console.log('   지속적인 문제가 발생하면 관리자 권한으로 명령 프롬프트/터미널을 실행하세요.');
  }
}

// 스크립트 실행
try {
  fixPermissions();
} catch (e) {
  console.error('❌ 권한 수정 중 오류가 발생했습니다:', e.message);
}