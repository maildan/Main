/**
 * 네이티브 모듈 복사 스크립트
 * 빌드된 Rust .node 파일을 Next.js 서버 디렉토리로 복사합니다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Debug 모드 여부 확인
const isDebug = process.argv.includes('--debug');
const sourceDir = path.join(__dirname, '..', 'native-modules', 'target', isDebug ? 'debug' : 'release');
const targetDir = path.join(__dirname, '..', 'native-modules');

// 로깅 개선
function log(message) {
  console.log(`[네이티브 모듈 복사] ${message}`);
}

function logError(message) {
  console.error(`❌ [오류] ${message}`);
}

const getExtension = () => {
  switch (process.platform) {
    case 'win32': return '.dll';
    case 'darwin': return '.dylib';
    default: return '.so';
  }
};

// 네이티브 모듈 파일 찾기 - 강화된 버전
const findNativeModule = (dir) => {
  try {
    log(`${dir} 디렉토리에서 네이티브 모듈 파일 검색 중...`);
    
    if (!fs.existsSync(dir)) {
      logError(`디렉토리가 존재하지 않음: ${dir}`);
      return null;
    }
    
    const files = fs.readdirSync(dir);
    log(`디렉토리 내 파일 목록: ${files.join(', ')}`);
    
    // .node 파일 직접 찾기
    const nodeFiles = files.filter(file => file.endsWith('.node'));
    if (nodeFiles.length > 0) {
      log(`.node 파일 발견: ${nodeFiles[0]}`);
      return path.join(dir, nodeFiles[0]);
    }
    
    // 운영체제별 라이브러리 파일 찾기
    const extension = getExtension();
    log(`현재 OS에 맞는 확장자 검색: ${extension}`);
    
    const libFiles = files.filter(file => 
      file.includes('typing_stats_native') && file.endsWith(extension)
    );
    
    if (libFiles.length > 0) {
      log(`네이티브 라이브러리 파일 발견: ${libFiles[0]}`);
      return path.join(dir, libFiles[0]);
    }
    
    // 모든 Rust 생성 파일 찾기 (확장자 무관)
    const anyRustFile = files.filter(file => 
      file.includes('typing_stats_native') && 
      !file.endsWith('.d') && 
      !file.endsWith('.pdb')
    );
    
    if (anyRustFile.length > 0) {
      log(`가능한 네이티브 모듈 파일 발견: ${anyRustFile[0]}`);
      return path.join(dir, anyRustFile[0]);
    }
    
    logError(`${dir} 디렉토리에서 네이티브 모듈 파일을 찾을 수 없음`);
    return null;
  } catch (error) {
    logError(`파일 검색 중 오류 발생: ${error.message}`);
    return null;
  }
};

// 빌드 시도 (파일이 없는 경우)
const attemptBuild = () => {
  try {
    log('네이티브 모듈을 찾을 수 없어 빌드를 시도합니다...');
    const buildCmd = isDebug 
      ? 'cd native-modules && cargo build --verbose'
      : 'cd native-modules && cargo build --release --verbose';
    
    execSync(buildCmd, { stdio: 'inherit' });
    log('빌드 완료');
    return true;
  } catch (error) {
    logError(`빌드 실패: ${error.message}`);
    return false;
  }
};

// 메인 함수
const copyNativeModule = () => {
  log(`${sourceDir} 디렉토리에서 네이티브 모듈 검색 중...`);
  
  let sourcePath = findNativeModule(sourceDir);
  
  // 빌드 시도 (파일이 없는 경우)
  if (!sourcePath && attemptBuild()) {
    sourcePath = findNativeModule(sourceDir);
  }
  
  if (!sourcePath) {
    // 더 넓은 검색 시도
    log('대체 경로에서 검색 시도 중...');
    const altSourceDir = path.join(__dirname, '..', 'native-modules', 'target');
    sourcePath = findNativeModule(altSourceDir);
    
    if (!sourcePath) {
      logError('네이티브 모듈 파일을 찾을 수 없습니다.');
      logError('다음 명령으로 수동 빌드를 시도하세요: cd native-modules && cargo build --release');
      process.exit(1);
    }
  }
  
  const targetPath = path.join(targetDir, 'typing_stats_native.node');
  
  try {
    log(`${sourcePath} 파일을 ${targetPath}로 복사합니다`);
    fs.copyFileSync(sourcePath, targetPath);
    log('✅ 네이티브 모듈 복사 완료');
    
    // 파일 존재 여부 최종 확인
    if (fs.existsSync(targetPath)) {
      log(`최종 확인: ${targetPath} 파일이 성공적으로 생성되었습니다.`);
    } else {
      logError(`최종 확인: ${targetPath} 파일이 존재하지 않습니다!`);
    }
  } catch (error) {
    logError(`복사 실패: ${error.message}`);
    process.exit(1);
  }
};

// 스크립트 실행
copyNativeModule();
