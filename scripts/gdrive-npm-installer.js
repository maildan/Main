/**
 * Google Drive 환경을 위한 NPM 설치 스크립트
 * 
 * Google Drive에서 발생하는 파일 권한 문제를 해결하고 안정적인 npm 설치를 수행합니다.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// 설정
const ROOT_DIR = path.resolve(__dirname, '..');
const NODE_MODULES_PATH = path.join(ROOT_DIR, 'node_modules');
const TEMP_DIR = path.join(os.tmpdir(), `npm-${Date.now()}`);
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 사용자에게 질문하는 함수
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 Google Drive 환경을 위한 NPM 설치 도구 시작');
  console.log('이 도구는 Google Drive에서 발생하는 npm 설치 문제를 해결합니다.\n');
  
  try {
    // 1. 환경 확인
    checkEnvironment();

    // 2. Google Drive 프로세스 일시 중지
    await pauseGoogleDriveProcesses();
    
    // 3. 임시 작업 디렉토리 생성
    createTempDirectory();
    
    // 4. node_modules 정리
    await cleanNodeModules();
    
    // 5. package.json 복사
    copyPackageJson();
    
    // 6. 임시 디렉토리에 npm 설치
    await installInTempDirectory();
    
    // 7. 설치된 모듈 이동
    await moveNodeModules();
    
    console.log('\n✅ 설치가 완료되었습니다!');
    console.log('💡 이제 프로젝트를 실행할 수 있습니다.');
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.log('💡 대체 방법으로 일반 설치 스크립트를 시도해보세요: npm run fix:npm-errors');
  } finally {
    // 8. 정리
    cleanupTempDir();
    rl.close();
  }
}

/**
 * 환경 확인
 */
function checkEnvironment() {
  console.log('🔍 환경 확인 중...');
  
  // Node.js 버전 확인
  const nodeVersion = process.version;
  console.log(`✓ Node.js 버전: ${nodeVersion}`);
  
  // OS 확인
  const platform = process.platform;
  console.log(`✓ 운영체제: ${platform} ${os.release()}`);
  
  // 디스크 공간 확인 (Windows와 Unix에서 다른 명령 사용)
  try {
    let diskInfo;
    if (platform === 'win32') {
      diskInfo = execSync('wmic logicaldisk get freespace,size,caption', { encoding: 'utf8' });
    } else {
      diskInfo = execSync('df -h', { encoding: 'utf8' });
    }
    
    console.log('\n📊 디스크 정보:');
    console.log(diskInfo.split('\n').slice(0, 5).join('\n'));
    
  } catch (e) {
    console.log('⚠️ 디스크 정보를 가져올 수 없습니다.');
  }
}

/**
 * Google Drive 프로세스 일시 중지
 */
async function pauseGoogleDriveProcesses() {
  console.log('\n🔍 Google Drive 프로세스 확인 중...');
  
  const shouldPause = await question('Google Drive 동기화를 일시 중지할까요? (권장) (Y/n): ');
  
  if (shouldPause.toLowerCase() === 'n') {
    console.log('⚠️ 동기화를 계속 실행하면 설치 중에 문제가 발생할 수 있습니다.');
    return;
  }
  
  try {
    if (process.platform === 'win32') {
      console.log('Google Drive 프로세스 중지 시도 중...');
      try { execSync('taskkill /f /im "GoogleDriveFS.exe" /t', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('taskkill /f /im "Google Drive.exe" /t', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('taskkill /f /im "GoogleDrive.exe" /t', { stdio: 'ignore' }); } catch (e) {}
    } else if (process.platform === 'darwin') { // macOS
      try { execSync('pkill -f "Google Drive"', { stdio: 'ignore' }); } catch (e) {}
      try { execSync('pkill -f "GoogleDriveFS"', { stdio: 'ignore' }); } catch (e) {}
    } else { // Linux
      try { execSync('pkill -f "google-drive"', { stdio: 'ignore' }); } catch (e) {}
    }
    
    console.log('✅ Google Drive 동기화가 일시 중지되었습니다.');
  } catch (error) {
    console.log('⚠️ Google Drive 프로세스 중지 실패, 계속 진행합니다.');
  }
}

/**
 * 임시 작업 디렉토리 생성
 */
function createTempDirectory() {
  console.log('\n📁 임시 작업 디렉토리 생성 중...');
  
  try {
    // 기존 임시 디렉토리 제거 (있는 경우)
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    // 새 임시 디렉토리 생성
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`✅ 임시 디렉토리 생성됨: ${TEMP_DIR}`);
  } catch (error) {
    throw new Error(`임시 디렉토리 생성 실패: ${error.message}`);
  }
}

/**
 * node_modules 정리
 */
async function cleanNodeModules() {
  console.log('\n🧹 node_modules 정리 중...');
  
  if (!fs.existsSync(NODE_MODULES_PATH)) {
    console.log('✓ node_modules가 이미 존재하지 않습니다.');
    return;
  }
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Windows에서 추가 권한 작업
      if (process.platform === 'win32') {
        try { execSync(`attrib -R "${NODE_MODULES_PATH}\\*.*" /S`, { stdio: 'ignore' }); } catch (e) {}
      }
      
      // 삭제 시도
      fs.rmSync(NODE_MODULES_PATH, { recursive: true, force: true, maxRetries: 5 });
      
      if (!fs.existsSync(NODE_MODULES_PATH)) {
        console.log('✅ node_modules 삭제 성공');
        return;
      }
      
      console.log(`⚠️ 삭제 시도 ${attempt}/${MAX_RETRIES} 실패, 다시 시도 중...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
    } catch (error) {
      console.log(`⚠️ 삭제 시도 ${attempt}/${MAX_RETRIES} 중 오류: ${error.message}`);
      
      if (attempt === MAX_RETRIES) {
        // 마지막 시도 - 운영체제별 강력한 삭제 명령 사용
        console.log('💪 강력한 삭제 명령 사용 중...');
        try {
          if (process.platform === 'win32') {
            execSync(`rmdir /s /q "${NODE_MODULES_PATH}"`, { stdio: 'ignore' });
          } else {
            execSync(`rm -rf "${NODE_MODULES_PATH}"`, { stdio: 'ignore' });
          }
        } catch (e) {
          console.log('⚠️ 강력한 삭제 명령도 실패, 계속 진행합니다.');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  
  console.log('⚠️ node_modules 완전 삭제 실패, 설치 시 덮어쓰기로 계속 진행합니다.');
}

/**
 * package.json 복사
 */
function copyPackageJson() {
  console.log('\n📋 package.json 복사 중...');
  
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  const tempPackageJsonPath = path.join(TEMP_DIR, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json 파일을 찾을 수 없습니다.');
  }
  
  try {
    fs.copyFileSync(packageJsonPath, tempPackageJsonPath);
    console.log('✅ package.json 복사 완료');
  } catch (error) {
    throw new Error(`package.json 복사 실패: ${error.message}`);
  }
}

/**
 * 임시 디렉토리에 npm 설치
 */
async function installInTempDirectory() {
  console.log('\n📦 임시 디렉토리에 npm 설치 중...');
  
  // 사용자가 선택한 설치 방법 실행
  const methods = [
    { name: 'npm install', command: 'npm install --no-package-lock --legacy-peer-deps' },
    { name: 'npm ci', command: 'npm ci --legacy-peer-deps' },
    { name: 'pnpm install', command: 'npx pnpm install --no-frozen-lockfile' },
    { name: 'yarn install', command: 'npx yarn install' }
  ];
  
  console.log('사용 가능한 설치 방법:');
  methods.forEach((method, index) => {
    console.log(`${index + 1}. ${method.name}`);
  });
  
  const choice = await question('사용할 방법 번호 선택 (1-4, 기본값: 1): ');
  const methodIndex = parseInt(choice) - 1 || 0;
  
  if (methodIndex < 0 || methodIndex >= methods.length) {
    console.log('⚠️ 잘못된 선택, 기본 방법(npm install)을 사용합니다.');
    methodIndex = 0;
  }
  
  const selectedMethod = methods[methodIndex];
  console.log(`\n🔄 ${selectedMethod.name} 실행 중...`);
  
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = selectedMethod.command.split(' ');
    const installProcess = spawn(cmd, args, {
      cwd: TEMP_DIR,
      stdio: 'inherit',
      shell: true
    });
    
    installProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${selectedMethod.name} 성공`);
        resolve();
      } else {
        reject(new Error(`${selectedMethod.name} 실패 (코드: ${code})`));
      }
    });
    
    installProcess.on('error', (err) => {
      reject(new Error(`${selectedMethod.name} 실행 오류: ${err.message}`));
    });
  });
}

/**
 * 설치된 모듈 이동
 */
async function moveNodeModules() {
  console.log('\n📦 설치된 모듈 이동 중...');
  
  const tempNodeModulesPath = path.join(TEMP_DIR, 'node_modules');
  
  if (!fs.existsSync(tempNodeModulesPath)) {
    throw new Error('임시 디렉토리에 node_modules가 없습니다.');
  }
  
  try {
    // node_modules 디렉토리가 존재하는 경우 제거
    if (fs.existsSync(NODE_MODULES_PATH)) {
      console.log('기존 node_modules 제거 중...');
      fs.rmSync(NODE_MODULES_PATH, { recursive: true, force: true });
    }
    
    // 디렉토리 이동
    console.log(`${tempNodeModulesPath} → ${NODE_MODULES_PATH} 이동 중...`);
    
    // 플랫폼별 최적의 이동 방법 사용
    if (process.platform === 'win32') {
      // Windows에서는 rename 작업이 볼륨 간에 작동하지 않을 수 있음
      // 같은 볼륨에 있는지 확인하고 그에 맞는 방법 사용
      try {
        fs.renameSync(tempNodeModulesPath, NODE_MODULES_PATH);
      } catch (e) {
        console.log('⚠️ 빠른 이동 실패, 복사 후 삭제 방식으로 전환...');
        // 폴더 복사 후 원본 삭제
        execSync(`xcopy "${tempNodeModulesPath}" "${NODE_MODULES_PATH}" /E /I /H /Y`, { stdio: 'ignore' });
        fs.rmSync(tempNodeModulesPath, { recursive: true, force: true });
      }
    } else {
      // Unix 계열에서는 rename 또는 mv 명령 사용
      try {
        fs.renameSync(tempNodeModulesPath, NODE_MODULES_PATH);
      } catch (e) {
        console.log('⚠️ 빠른 이동 실패, mv 명령으로 전환...');
        execSync(`mv "${tempNodeModulesPath}" "${NODE_MODULES_PATH}"`, { stdio: 'ignore' });
      }
    }
    
    console.log('✅ node_modules 이동 완료');
  } catch (error) {
    throw new Error(`node_modules 이동 실패: ${error.message}`);
  }
}

/**
 * 임시 디렉토리 정리
 */
function cleanupTempDir() {
  console.log('\n🧹 임시 디렉토리 정리 중...');
  
  try {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      console.log('✅ 임시 디렉토리 정리 완료');
    }
  } catch (error) {
    console.log(`⚠️ 임시 디렉토리 정리 실패: ${error.message}`);
  }
}

// 스크립트 실행
main().catch(console.error);
