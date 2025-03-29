/**
 * 빌드 오류 해결 스크립트
 * 
 * 이 스크립트는 일반적인 빌드 오류(특히 액세스 권한 문제)를 해결하는 데 도움을 줍니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

console.log('🔧 빌드 오류 해결 도구 실행 중...');

// 주요 경로 설정
const rootDir = path.resolve(__dirname, '..');
const nativeDir = path.join(rootDir, 'native-modules');
const targetDir = path.join(nativeDir, 'target');

// 작업 환경 확인
const isWindows = process.platform === 'win32';
const isAdmin = checkAdminRights();

console.log(`💻 시스템 정보: ${os.platform()} ${os.release()} (${isAdmin ? '관리자 권한' : '일반 권한'})`);

// 주요 작업 수행
try {
  // 1. 빌드 프로세스 종료
  killBuildProcesses();
  
  // 2. 빌드 디렉토리 정리
  cleanBuildDirectory();
  
  // 3. 임시 파일 정리
  cleanTempFiles();
  
  // 4. npm 캐시 정리
  cleanNpmCache();
  
  // 5. 빌드 재시도
  askForRebuild();
} catch (error) {
  console.error(`❌ 오류 발생: ${error.message}`);
}

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
 * 빌드 관련 프로세스 종료
 */
function killBuildProcesses() {
  console.log('🔍 빌드 관련 프로세스 검색 중...');
  
  const processNames = ['cargo', 'rustc', 'linker', 'gcc', 'cl.exe'];
  
  if (isWindows) {
    processNames.forEach(proc => {
      try {
        execSync(`taskkill /F /IM ${proc}.exe 2>nul`, { stdio: 'ignore' });
      } catch (e) {
        // 프로세스가 없는 경우 무시
      }
    });
  } else {
    processNames.forEach(proc => {
      try {
        execSync(`pkill -f ${proc}`, { stdio: 'ignore' });
      } catch (e) {
        // 프로세스가 없는 경우 무시
      }
    });
  }
  
  console.log('✅ 빌드 관련 프로세스 처리 완료');
}

/**
 * 빌드 디렉토리 정리
 */
function cleanBuildDirectory() {
  console.log('🧹 빌드 디렉토리 정리 중...');
  
  if (!fs.existsSync(targetDir)) {
    console.log('⏭️ 빌드 디렉토리가 없습니다. 이 단계를 건너뜁니다.');
    return;
  }
  
  if (isWindows) {
    // Windows에서는 읽기 전용 속성을 제거
    try {
      execSync(`attrib -R "${targetDir}\\*.*" /S`, { stdio: 'ignore' });
    } catch (e) {
      console.warn('⚠️ 파일 속성 변경 중 오류가 발생했습니다.');
    }
  }
  
  try {
    // cargo clean 명령 실행
    console.log('🧹 cargo clean 실행 중...');
    execSync('cargo clean', { cwd: nativeDir, stdio: 'pipe' });
    console.log('✅ cargo clean 완료');
  } catch (e) {
    console.warn('⚠️ cargo clean 실행 중 오류가 발생했습니다:', e.message);
    console.log('💡 수동으로 디렉토리 정리를 시도합니다...');
    
    try {
      // 타겟 디렉토리 삭제 시도
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 3 });
      console.log('✅ 빌드 디렉토리 삭제 완료');
    } catch (rmError) {
      console.error('❌ 빌드 디렉토리 삭제 실패:', rmError.message);
      
      if (!isAdmin && isWindows) {
        console.log('💡 관리자 권한으로 명령 프롬프트를 실행한 후 다음 명령을 시도해보세요:');
        console.log(`   rd /s /q "${targetDir}"`);
      } else if (!isAdmin) {
        console.log('💡 관리자 권한으로 터미널을 실행한 후 다음 명령을 시도해보세요:');
        console.log(`   sudo rm -rf "${targetDir}"`);
      }
    }
  }
}

/**
 * 임시 파일 정리
 */
function cleanTempFiles() {
  console.log('🧹 임시 파일 정리 중...');
  
  // 프로젝트 내 임시 파일 정리
  const tempPatterns = [
    '.eslintcache',
    '.next',
    'out'
  ];
  
  tempPatterns.forEach(pattern => {
    const fullPath = path.join(rootDir, pattern);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ ${pattern} 디렉토리 정리 완료`);
      } catch (e) {
        console.warn(`⚠️ ${pattern} 정리 중 오류 발생 (무시됨)`);
      }
    }
  });
}

/**
 * npm 캐시 정리
 */
function cleanNpmCache() {
  console.log('🧹 npm 캐시 정리 중...');
  
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ npm 캐시 정리 완료');
  } catch (e) {
    console.warn('⚠️ npm 캐시 정리 중 오류가 발생했습니다:', e.message);
  }
}

/**
 * 빌드 재시도 확인
 */
function askForRebuild() {
  console.log('\n✅ 오류 해결 작업이 완료되었습니다!');
  console.log('\n💡 이제 다음 명령으로 빌드를 재시도할 수 있습니다:');
  console.log('   npm run build:native -- --force');
  console.log('\n⭐ 빌드 중에 오류가 계속 발생하면:');
  console.log('1. 컴퓨터 재시작 후 다시 시도');
  console.log('2. 안티바이러스 소프트웨어 일시 중지 후 시도');
  console.log('3. 관리자 권한으로 IDE/터미널 실행 후 시도');
}
