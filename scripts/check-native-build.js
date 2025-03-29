/**
 * 네이티브 모듈 빌드 상태 확인 스크립트
 * 
 * 이 스크립트는 네이티브 모듈 빌드 결과를 확인하고 문제 해결을 위한 정보를 제공합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// 로깅 함수
function logHeader(text) {
  console.log('\n' + colorize('='.repeat(80), 'bright'));
  console.log(colorize(` ${text} `, 'bright'));
  console.log(colorize('='.repeat(80), 'bright') + '\n');
}

function logSection(text) {
  console.log(colorize(`\n>> ${text}`, 'cyan'));
}

function logSuccess(text) {
  console.log(colorize(`✅ ${text}`, 'green'));
}

function logWarning(text) {
  console.log(colorize(`⚠️ ${text}`, 'yellow'));
}

function logError(text) {
  console.log(colorize(`❌ ${text}`, 'red'));
}

function logInfo(text) {
  console.log(`ℹ️ ${text}`);
}

// 경로 설정
const projectRoot = path.resolve(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');
const releaseDir = path.join(nativeModulesDir, 'target', 'release');
const debugDir = path.join(nativeModulesDir, 'target', 'debug');

// 디렉토리 및 파일 존재 확인
function checkPathExists(pathToCheck, description) {
  const exists = fs.existsSync(pathToCheck);
  if (exists) {
    logSuccess(`${description} 경로가 존재합니다: ${pathToCheck}`);
  } else {
    logError(`${description} 경로가 존재하지 않습니다: ${pathToCheck}`);
  }
  return exists;
}

// 디렉토리 내용 출력
function listDirectoryContents(dir) {
  try {
    if (!fs.existsSync(dir)) {
      logWarning(`디렉토리가 존재하지 않습니다: ${dir}`);
      return [];
    }
    
    const items = fs.readdirSync(dir);
    logInfo(`${dir} 디렉토리 내용 (${items.length}개 항목):`);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const size = stats.isFile() ? `${Math.round(stats.size / 1024)}KB` : '(디렉토리)';
      console.log(`  - ${item.padEnd(40)} ${size}`);
    });
    return items;
  } catch (error) {
    logError(`디렉토리 읽기 오류 (${dir}): ${error.message}`);
    return [];
  }
}

// Rust/Cargo 설치 확인
function checkRustInstallation() {
  logSection('Rust 설치 확인');
  
  try {
    const rustcVersion = execSync('rustc --version', { encoding: 'utf8' });
    logSuccess(`Rust 설치됨: ${rustcVersion.trim()}`);
    
    const cargoVersion = execSync('cargo --version', { encoding: 'utf8' });
    logSuccess(`Cargo 설치됨: ${cargoVersion.trim()}`);
    
    return true;
  } catch (error) {
    logError('Rust가 설치되지 않았거나 PATH에 없습니다.');
    logInfo('Rust 설치 방법: https://rustup.rs/');
    return false;
  }
}

// Cargo.toml 확인
function checkCargoToml() {
  logSection('Cargo.toml 설정 확인');
  
  const cargoTomlPath = path.join(nativeModulesDir, 'Cargo.toml');
  if (!checkPathExists(cargoTomlPath, 'Cargo.toml')) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(cargoTomlPath, 'utf8');
    
    // [lib] 섹션 확인
    const hasLibSection = content.includes('[lib]');
    if (hasLibSection) {
      logSuccess('Cargo.toml에 [lib] 섹션이 존재합니다.');
    } else {
      logWarning('Cargo.toml에 [lib] 섹션이 없습니다. 다음 내용을 추가하세요:');
      console.log(`
[lib]
name = "typing_stats_native"
crate-type = ["cdylib"]`);
    }
    
    // cdylib 확인
    const hasCdylib = content.includes('crate-type') && content.includes('cdylib');
    if (hasCdylib) {
      logSuccess('Cargo.toml에 cdylib 설정이 있습니다.');
    } else {
      logWarning('Cargo.toml에 cdylib 설정이 없습니다.');
    }
    
    return true;
  } catch (error) {
    logError(`Cargo.toml 읽기 오류: ${error.message}`);
    return false;
  }
}

// 빌드 스크립트 실행
function runBuild(mode = 'release') {
  logSection(`${mode === 'debug' ? '디버그' : '릴리스'} 모드 빌드 실행`);
  
  try {
    const cmd = `cd "${nativeModulesDir}" && cargo build ${mode === 'release' ? '--release' : ''}`;
    logInfo(`명령어 실행: ${cmd}`);
    
    const result = execSync(cmd, { encoding: 'utf8' });
    logSuccess('빌드 성공');
    return true;
  } catch (error) {
    logError(`빌드 실패: ${error.message}`);
    return false;
  }
}

// 모듈 복사 스크립트 실행
function runCopyScript(debug = false) {
  logSection('모듈 복사 스크립트 실행');
  
  try {
    const cmd = `node "${path.join(__dirname, 'copy-native.js')}" ${debug ? '--debug' : ''}`;
    logInfo(`명령어 실행: ${cmd}`);
    
    const result = execSync(cmd, { encoding: 'utf8' });
    console.log(result);
    
    // 결과 확인
    const targetPath = path.join(nativeModulesDir, 'typing_stats_native.node');
    if (fs.existsSync(targetPath)) {
      logSuccess(`네이티브 모듈이 성공적으로 복사됨: ${targetPath}`);
      return true;
    } else {
      logError(`모듈 복사 후에도 파일이 없음: ${targetPath}`);
      return false;
    }
  } catch (error) {
    logError(`복사 스크립트 오류: ${error.message}`);
    return false;
  }
}

// 모듈 로드 테스트
function testModuleLoad() {
  logSection('네이티브 모듈 로드 테스트');
  
  try {
    const modulePath = path.join(nativeModulesDir, 'typing_stats_native.node');
    if (!fs.existsSync(modulePath)) {
      logError(`모듈 파일이 존재하지 않습니다: ${modulePath}`);
      return false;
    }
    
    // 로드 테스트
    logInfo(`모듈 로드 시도: ${modulePath}`);
    const moduleObj = require(modulePath);
    
    if (moduleObj) {
      logSuccess('모듈 로드 성공');
      
      // 메서드 확인
      const methods = Object.keys(moduleObj);
      logInfo(`사용 가능한 메서드: ${methods.join(', ')}`);
      
      // get_memory_info 함수 테스트
      if (typeof moduleObj.get_memory_info === 'function') {
        const memoryInfo = moduleObj.get_memory_info();
        logSuccess('get_memory_info() 호출 성공');
        logInfo(`결과: ${memoryInfo.substring(0, 100)}...`);
      } else {
        logWarning('get_memory_info() 함수가 없습니다');
      }
      
      return true;
    } else {
      logError('모듈이 비어 있습니다');
      return false;
    }
  } catch (error) {
    logError(`모듈 로드 오류: ${error.message}`);
    return false;
  }
}

// 해결책 제안
function suggestSolutions() {
  logSection('문제 해결 방법');
  
  console.log(`
1. ${colorize('Cargo.toml 확인', 'bright')}
   Cargo.toml에 다음 내용이 있는지 확인하세요:
   
   [lib]
   name = "typing_stats_native"
   crate-type = ["cdylib"]
   
2. ${colorize('수동으로 파일 복사', 'bright')}
   빌드된 네이티브 라이브러리를 .node 파일로 복사:
   
   ${colors.cyan}# Windows${colors.reset}
   copy "${releaseDir}\\typing_stats_native.dll" "${nativeModulesDir}\\typing_stats_native.node"
   
   ${colors.cyan}# Linux/macOS${colors.reset}
   cp "${releaseDir}/libtyping_stats_native.so" "${nativeModulesDir}/typing_stats_native.node"
   # 또는 macOS의 경우:
   cp "${releaseDir}/libtyping_stats_native.dylib" "${nativeModulesDir}/typing_stats_native.node"
   
3. ${colorize('Node-API가 올바르게 설정되었는지 확인', 'bright')}
   Cargo.toml에 다음 의존성이 있는지 확인하세요:
   
   [dependencies]
   napi = "2.0.0"  # 버전은 다를 수 있음
   napi-derive = "2.0.0"
   
4. ${colorize('네이티브 코드 확인', 'bright')}
   메인 Rust 파일에 #[napi] 매크로와 적절한 함수 내보내기가 있는지 확인하세요.
   
5. ${colorize('node-gyp 사용', 'bright')}
   Node.js의 네이티브 모듈 빌드 도구를 사용해보세요:
   
   npm install -g node-gyp
   cd native-modules
   node-gyp configure
   node-gyp build`);
}

// 메인 함수
async function main() {
  logHeader('네이티브 모듈 빌드 상태 확인 도구');
  
  // 1. 프로젝트 구조 확인
  logSection('프로젝트 구조 확인');
  const nativeModulesExists = checkPathExists(nativeModulesDir, 'native-modules 디렉토리');
  if (nativeModulesExists) {
    const releaseExists = checkPathExists(releaseDir, 'release 디렉토리');
    const debugExists = checkPathExists(debugDir, 'debug 디렉토리');
    
    // release 디렉토리 내용 출력
    if (releaseExists) {
      const releaseFiles = listDirectoryContents(releaseDir);
      
      // .dll, .so, .dylib 파일 찾기
      const nativeLibs = releaseFiles.filter(file => 
        file.includes('typing_stats_native') && 
        (file.endsWith('.dll') || file.endsWith('.so') || file.endsWith('.dylib'))
      );
      
      if (nativeLibs.length > 0) {
        logSuccess(`네이티브 라이브러리 파일 발견: ${nativeLibs.join(', ')}`);
      } else {
        logWarning('네이티브 라이브러리 파일을 찾을 수 없습니다.');
      }
    }
    
    // native-modules 디렉토리 내용 출력
    listDirectoryContents(nativeModulesDir);
  }
  
  // 2. Rust/Cargo 확인
  const rustInstalled = checkRustInstallation();
  
  // 3. Cargo.toml 확인
  if (rustInstalled) {
    checkCargoToml();
  }
  
  // 4. 빌드 재시도
  const promptRunBuild = process.argv.includes('--build');
  if (promptRunBuild && rustInstalled) {
    runBuild('release');
    
    // 빌드 후 디렉토리 확인
    if (fs.existsSync(releaseDir)) {
      listDirectoryContents(releaseDir);
    }
  }
  
  // 5. 복사 스크립트 재시도
  const promptRunCopy = process.argv.includes('--copy');
  if (promptRunCopy) {
    runCopyScript();
  }
  
  // 6. 모듈 로드 테스트
  const nodeModulePath = path.join(nativeModulesDir, 'typing_stats_native.node');
  if (fs.existsSync(nodeModulePath)) {
    testModuleLoad();
  } else {
    logError(`${nodeModulePath} 파일이 존재하지 않습니다. 먼저 빌드 및 복사 과정이 필요합니다.`);
  }
  
  // 7. 해결책 제안
  suggestSolutions();
  
  logHeader('스크립트 완료');
  console.log(`
추가 옵션:
  --build : 빌드 재시도
  --copy  : 복사 스크립트 재실행
  
사용 예:
  node scripts/check-native-build.js --build --copy`);
}

// 스크립트 실행
main().catch(err => {
  logError(`예상치 못한 오류: ${err.message}`);
  process.exit(1);
});
