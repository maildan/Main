const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 설치 경로 설정
const projectRoot = path.resolve(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');

/**
 * 네이티브 모듈 설치 함수
 */
function installNativeModules() {
  console.log('네이티브 모듈 설치 시작...');

  try {
    // 네이티브 모듈 디렉토리 확인
    if (!fs.existsSync(nativeModulesDir)) {
      console.log('네이티브 모듈 디렉토리가 존재하지 않습니다. 설치를 건너뜁니다.');
      return;
    }

    // 운영체제 확인
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    console.log(`플랫폼 감지: ${process.platform}`);

    // Rust가 설치되어 있는지 확인
    try {
      const rustVersion = execSync('rustc --version', { encoding: 'utf8' });
      console.log(`Rust 확인: ${rustVersion.trim()}`);
    } catch (error) {
      console.error('Rust가 설치되어 있지 않습니다. 네이티브 모듈을 설치할 수 없습니다.');
      console.error('https://www.rust-lang.org/tools/install 에서 Rust를 설치하세요.');
      return;
    }

    // 네이티브 모듈 디렉토리로 이동하여 빌드
    console.log('네이티브 모듈 빌드 중...');
    process.chdir(nativeModulesDir);

    // cargo build 실행
    execSync('cargo build --release', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        // 필요한 환경 변수 설정
        RUSTFLAGS: isWindows ? '-C target-feature=+crt-static' : ''
      }
    });

    // 빌드된 라이브러리 파일 복사
    console.log('빌드된 네이티브 모듈 복사 중...');
    const targetDir = path.join(nativeModulesDir, 'target', 'release');
    const libDir = path.join(projectRoot, 'src', 'native-modules');

    // 라이브러리 디렉토리가 존재하는지 확인, 없으면 생성
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    // 플랫폼에 맞는 파일 확장자 선택
    let libExt;
    if (isWindows) {
      libExt = '.dll';
    } else if (isMac) {
      libExt = '.dylib';
    } else if (isLinux) {
      libExt = '.so';
    } else {
      throw new Error('지원되지 않는 플랫폼입니다.');
    }

    // 라이브러리 파일 찾기
    const libFile = fs.readdirSync(targetDir)
      .find(file => file.endsWith(libExt) && file.includes('typing_stats_native'));
    
    if (!libFile) {
      throw new Error('빌드된 네이티브 모듈을 찾을 수 없습니다.');
    }

    // 파일 복사
    const sourcePath = path.join(targetDir, libFile);
    const destPath = path.join(libDir, libFile);
    
    fs.copyFileSync(sourcePath, destPath);
    console.log(`네이티브 모듈 복사 완료: ${destPath}`);

    // 인덱스 파일 생성
    const indexPath = path.join(libDir, 'index.js');
    
    const indexContent = `
// 네이티브 모듈 로더
const path = require('path');

// 플랫폼별 파일 확장자
const extension = {
  'win32': '.dll',
  'darwin': '.dylib',
  'linux': '.so'
}[process.platform];

// 네이티브 모듈 로드
let nativeModule;
try {
  const modulePath = path.join(__dirname, \`typing_stats_native\${extension}\`);
  nativeModule = require(modulePath);
  console.log('네이티브 모듈 로드 성공');
} catch (err) {
  console.error('네이티브 모듈 로드 실패:', err);
  nativeModule = null;
}

module.exports = nativeModule;
`;

    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('인덱스 파일 생성 완료');

    console.log('네이티브 모듈 설치 완료!');

  } catch (error) {
    console.error('네이티브 모듈 설치 중 오류 발생:', error);
    process.exit(1);
  }
}

// 네이티브 모듈 설치 실행
installNativeModules();
