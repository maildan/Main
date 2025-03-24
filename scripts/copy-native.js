/**
 * 네이티브 모듈 복사 스크립트
 * 빌드된 Rust .node 파일을 Next.js 서버 디렉토리로 복사합니다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 경로 설정
const isDebug = process.argv.includes('--debug');
const buildType = isDebug ? 'debug' : 'release';
const sourceDir = path.join(__dirname, '..', 'native-modules', 'target', buildType);
const targetDir = path.join(__dirname, '..', 'src', 'server', 'native');

// 타겟 디렉토리 생성 (없는 경우)
if (!fs.existsSync(targetDir)) {
  console.log(`📁 Creating directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// 운영체제별 파일 확장자 결정
const getExtension = () => {
  switch (process.platform) {
    case 'win32': return '.dll';
    case 'darwin': return '.dylib';
    default: return '.so';
  }
};

// 네이티브 모듈 파일 찾기
const findNativeModule = (dir) => {
  try {
    // .node 파일 직접 찾기
    const nodeFiles = fs.readdirSync(dir).filter(file => file.endsWith('.node'));
    if (nodeFiles.length > 0) {
      return path.join(dir, nodeFiles[0]);
    }
    
    // 운영체제별 라이브러리 파일 찾기
    const extension = getExtension();
    const libFiles = fs.readdirSync(dir).filter(file => 
      file.includes('typing_stats_native') && file.endsWith(extension)
    );
    
    if (libFiles.length > 0) {
      return path.join(dir, libFiles[0]);
    }
    
    throw new Error(`Native module not found in ${dir}`);
  } catch (error) {
    console.error(`❌ Error finding native module: ${error.message}`);
    return null;
  }
};

// 빌드 시도 (파일이 없는 경우)
const attemptBuild = () => {
  try {
    console.log('🔨 Native module not found, attempting to build...');
    const buildCmd = isDebug 
      ? 'cd native-modules && cargo build --verbose'
      : 'cd native-modules && cargo build --release --verbose';
    
    execSync(buildCmd, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Build failed: ${error.message}`);
    return false;
  }
};

// 메인 함수
const copyNativeModule = () => {
  console.log(`🔍 Looking for native module in ${sourceDir}...`);
  
  let sourcePath = findNativeModule(sourceDir);
  
  // 빌드 시도 (파일이 없는 경우)
  if (!sourcePath && attemptBuild()) {
    sourcePath = findNativeModule(sourceDir);
  }
  
  if (!sourcePath) {
    console.error('❌ Failed to locate or build native module');
    process.exit(1);
  }
  
  const targetPath = path.join(targetDir, 'typing_stats_native.node');
  
  try {
    console.log(`📋 Copying from ${sourcePath} to ${targetPath}`);
    fs.copyFileSync(sourcePath, targetPath);
    console.log('✅ Native module copied successfully');
  } catch (error) {
    console.error(`❌ Copy failed: ${error.message}`);
    process.exit(1);
  }
};

// 스크립트 실행
copyNativeModule();
