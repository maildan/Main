const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 필요한 변수 선언
const projectRoot = path.join(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');
// 수정: 올바른 Windows 플랫폼 검사
const isWindows = os.platform() === 'win32';

function installNativeModules() {
  console.log('네이티브 모듈 설치 시작...');

  try {
    // 네이티브 모듈 디렉토리 확인
    if (!fs.existsSync(nativeModulesDir)) {
      console.log('네이티브 모듈 디렉토리가 존재하지 않습니다. 설치를 건너뜁니다.');
      return;
    }

    // 운영체제 확인
    const isMac = os.platform() === 'darwin';
    const isLinux = os.platform() === 'linux';

    console.log(`플랫폼 감지: ${os.platform()}`);

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

    // 플랫폼별 파일 확장자 결정
    const libExt = isWindows ? '.dll' : (isMac ? '.dylib' : '.so');
    const libPrefix = isWindows ? '' : 'lib';
    const libName = `${libPrefix}typing_stats_native${libExt}`;
    
    // 빌드된 파일 경로
    const srcPath = path.join(targetDir, libName);
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(srcPath)) {
      console.error(`빌드된 네이티브 모듈 파일을 찾을 수 없습니다: ${srcPath}`);
      console.log('대상 디렉토리의 파일 목록:');
      
      try {
        const files = fs.readdirSync(targetDir);
        files.forEach(file => console.log(`- ${file}`));
        
        // 가능한 다른 이름으로 파일 찾기
        const possibleFiles = files.filter(file => 
          file.includes('typing_stats_native') || 
          file.includes('typing-stats-native')
        );
        
        if (possibleFiles.length > 0) {
          console.log(`\n가능한 네이티브 모듈 파일: ${possibleFiles.join(', ')}`);
          console.log(`${possibleFiles[0]} 파일 사용 시도...`);
          
          const alternativeSrcPath = path.join(targetDir, possibleFiles[0]);
          const destPath = path.join(libDir, libName);
          
          fs.copyFileSync(alternativeSrcPath, destPath);
          console.log(`네이티브 모듈이 ${destPath}에 복사되었습니다.`);
        } else {
          throw new Error('호환되는 네이티브 모듈 파일을 찾을 수 없습니다.');
        }
      } catch (listError) {
        console.error('빌드 디렉토리 탐색 중 오류:', listError);
        throw new Error('네이티브 모듈 파일을 찾을 수 없습니다.');
      }
    } else {
      // 파일이 존재하면 복사
      const destPath = path.join(libDir, libName);
      fs.copyFileSync(srcPath, destPath);
      console.log(`네이티브 모듈이 ${destPath}에 복사되었습니다.`);
    }

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

// 플랫폼별 접두사
const prefix = process.platform === 'win32' ? '' : 'lib';

// 네이티브 모듈 로드
let nativeModule;
try {
  const modulePath = path.join(__dirname, \`\${prefix}typing_stats_native\${extension}\`);
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
