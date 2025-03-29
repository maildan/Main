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

// 파일 존재 확인 함수
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (e) {
    return false;
  }
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
    
    // 운영체제별 라이브러리 파일 찾기 - 확장된 패턴
    const extension = getExtension();
    log(`현재 OS에 맞는 확장자 검색: ${extension}`);
    
    // 가능한 모든 파일 이름 패턴 검색
    const possibleNames = [
      'typing_stats_native',
      'libtyping_stats_native',
      'typing-stats-native',
      'typingstats_native',
      'typing_stats'
    ];
    
    for (const baseName of possibleNames) {
      const matches = files.filter(file => 
        file.includes(baseName) && file.endsWith(extension)
      );
      
      if (matches.length > 0) {
        log(`네이티브 라이브러리 파일 발견: ${matches[0]}`);
        return path.join(dir, matches[0]);
      }
    }
    
    // deps 디렉토리 확인 
    const depsDir = path.join(dir, 'deps');
    if (fs.existsSync(depsDir)) {
      log(`deps 디렉토리 확인 중...`);
      const depsResult = findNativeModule(depsDir);
      if (depsResult) return depsResult;
    }
    
    // 모든 가능한 네이티브 라이브러리 파일 검색 (확장자 기반)
    const anyLibFile = files.filter(file => 
      file.endsWith(extension) && 
      !file.includes('build_script') && 
      !file.includes('metadata')
    );
    
    if (anyLibFile.length > 0) {
      log(`가능한 네이티브 라이브러리 파일 발견: ${anyLibFile[0]}`);
      return path.join(dir, anyLibFile[0]);
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
  // 1. deps 디렉토리를 먼저 확인 (Rust는 주로 여기에 출력함)
  const depsDir = path.join(sourceDir, 'deps');
  let sourcePath = null;
  
  if (fs.existsSync(depsDir)) {
    log(`deps 디렉토리 먼저 확인 중...`);
    sourcePath = findNativeModule(depsDir);
  }
  
  // 2. 일반 디렉토리 확인
  if (!sourcePath) {
    sourcePath = findNativeModule(sourceDir);
  }
  
  // 3. 직접 경로 확인 (명명 패턴 기준)
  if (!sourcePath) {
    const extension = getExtension();
    const specificPaths = [
      path.join(sourceDir, 'deps', `typing_stats_native${extension}`),
      path.join(sourceDir, 'deps', `libtyping_stats_native${extension}`),
      path.join(sourceDir, `typing_stats_native${extension}`),
      path.join(sourceDir, `libtyping_stats_native${extension}`)
    ];
    
    for (const specificPath of specificPaths) {
      if (fs.existsSync(specificPath)) {
        log(`직접 경로에서 파일 발견: ${specificPath}`);
        sourcePath = specificPath;
        break;
      }
    }
  }
  
  // 4. 빌드 시도 (파일이 없는 경우)
  if (!sourcePath && attemptBuild()) {
    if (fs.existsSync(depsDir)) {
      sourcePath = findNativeModule(depsDir);
    }
    
    if (!sourcePath) {
      sourcePath = findNativeModule(sourceDir);
    }
  }
  
  // 5. 마지막 자원: 폴더 전체 재귀 검색
  if (!sourcePath) {
    log('대체 검색 방법: 전체 target 디렉토리 검색 중...');
    const targetBaseDir = path.join(__dirname, '..', 'native-modules', 'target');
    
    try {
      // 재귀적으로 .dll/.so/.dylib 파일 찾기
      const extension = getExtension();
      const findFiles = (dir, pattern) => {
        let results = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            results = results.concat(findFiles(itemPath, pattern));
          } else if (item.endsWith(extension) && item.includes(pattern)) {
            results.push(itemPath);
          }
        }
        
        return results;
      };
      
      const matchingFiles = findFiles(targetBaseDir, 'typing_stats_native');
      if (matchingFiles.length > 0) {
        sourcePath = matchingFiles[0];
        log(`재귀 검색으로 파일 발견: ${sourcePath}`);
      }
    } catch (err) {
      logError(`재귀 검색 중 오류: ${err.message}`);
    }
  }
  
  // 파일을 찾지 못한 경우
  if (!sourcePath) {
    logError('네이티브 모듈 파일을 찾을 수 없습니다.');
    logError('수동 명령으로 시도하세요:');
    
    const extension = getExtension();
    const expectedSrcPath = path.join(sourceDir, 'deps', `typing_stats_native${extension}`);
    const targetPath = path.join(targetDir, 'typing_stats_native.node');
    
    if (process.platform === 'win32') {
      logError(`copy "${expectedSrcPath}" "${targetPath}"`);
    } else {
      logError(`cp "${expectedSrcPath}" "${targetPath}"`);
    }
    
    logError('또는 디렉토리 내용을 확인하세요:');
    logError(`dir "${path.join(sourceDir, 'deps')}"`);
    
    process.exit(1);
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