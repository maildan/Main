/**
 * npm TAR_ENTRY_ERROR 및 EBADF 오류 해결 스크립트
 * 
 * 이 스크립트는 npm 설치 중 발생하는 TAR_ENTRY_ERROR와 EBADF(bad file descriptor) 오류를
 * 해결하기 위한 단계별 접근 방식을 제공합니다.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 사용자에게 질문하는 함수
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 주요 경로 설정
const npmCachePath = path.join(os.homedir(), '.npm');
const rootDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(rootDir, 'node_modules');

// Google Drive 사용 여부 확인
const isGoogleDriveEnvironment = () => {
  // Google Drive 관련 파일이나 경로가 있는지 확인
  return fs.existsSync(path.join(rootDir, '.gdignore')) || 
         rootDir.includes('Google Drive') || 
         rootDir.includes('GoogleDrive') ||
         rootDir.includes('다른 컴퓨터');
};

/**
 * 강력한 디렉토리 삭제 함수
 * @param {string} dirPath - 삭제할 디렉토리 경로
 * @returns {boolean} - 성공 여부
 */
async function forceRemoveDirectory(dirPath) {
  console.log(`🗑️ 강력한 디렉토리 삭제 시도: ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    console.log('✓ 디렉토리가 이미 존재하지 않습니다.');
    return true;
  }

  // 방법 0: 읽기 전용 속성 제거 (Windows)
  if (process.platform === 'win32') {
    try {
      console.log('읽기 전용 속성 제거 중...');
      execSync(`attrib -R "${dirPath}\\*.*" /S`, { stdio: 'ignore' });
    } catch (e) {
      console.log('⚠️ 속성 변경 중 오류 발생 (계속 진행)');
    }
  }

  // 방법 1: Node.js fs.rmSync - 최대 재시도 횟수 및 대기 시간 증가
  try {
    fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 10 });
    if (!fs.existsSync(dirPath)) {
      console.log('✅ fs.rmSync로 삭제 성공');
      return true;
    }
  } catch (e) {
    console.log('⚠️ fs.rmSync 삭제 실패, 다른 방법 시도 중...');
  }

  // 방법 2: Windows 명령 프롬프트 명령 (관리자 권한 요청)
  if (process.platform === 'win32') {
    try {
      // /F 플래그 추가로 강제 삭제
      execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'ignore' });
      // 삭제 후 확인
      await new Promise(resolve => setTimeout(resolve, 1000)); // 약간의 대기 시간
      if (!fs.existsSync(dirPath)) {
        console.log('✅ rmdir 명령으로 삭제 성공');
        return true;
      }
    } catch (e) {
      console.log('⚠️ rmdir 명령 실패, 다음 방법 시도 중...');
    }

    // 방법 3: PowerShell 명령 (더 강력함)
    try {
      const psCmd = `Remove-Item -Path '${dirPath.replace(/\\/g, '\\\\')}' -Recurse -Force -ErrorAction SilentlyContinue`;
      execSync(`powershell -Command "${psCmd}"`, { stdio: 'ignore' });
      // 삭제 후 확인
      await new Promise(resolve => setTimeout(resolve, 1000)); // 약간의 대기 시간
      if (!fs.existsSync(dirPath)) {
        console.log('✅ PowerShell 명령으로 삭제 성공');
        return true;
      }
    } catch (e) {
      console.log('⚠️ PowerShell 명령 실패');
    }
  } else {
    // Unix 계열 시스템에서의 방법
    try {
      execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
      if (!fs.existsSync(dirPath)) {
        console.log('✅ rm -rf 명령으로 삭제 성공');
        return true;
      }
    } catch (e) {
      console.log('⚠️ rm -rf 명령 실패');
    }
  }

  // 방법 4: 임시 배치/셸 스크립트 생성 및 실행
  if (process.platform === 'win32') {
    try {
      const batchPath = path.join(os.tmpdir(), `delete-${Date.now()}.bat`);
      const batchContent = `@echo off
setlocal
echo 디렉토리 삭제 중... ${dirPath}
timeout /t 1 /nobreak > nul
rmdir /s /q "${dirPath.replace(/\\/g, '\\\\')}"
if exist "${dirPath.replace(/\\/g, '\\\\')}" (
  echo 첫 번째 시도 실패, 두 번째 시도 중...
  timeout /t 2 /nobreak > nul
  rmdir /s /q "${dirPath.replace(/\\/g, '\\\\')}"
)
del "%~f0"`;
      
      fs.writeFileSync(batchPath, batchContent, 'utf8');
      execSync(`start /min cmd /c ${batchPath}`, { stdio: 'ignore' });
      
      console.log('✅ 배치 스크립트를 통한 삭제 작업을 백그라운드에서 실행 중...');
      console.log('💡 이 작업은 시간이 조금 걸릴 수 있으며, 백그라운드에서 계속 진행됩니다.');
      
      // 약간의 대기 시간 후 확인
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (!fs.existsSync(dirPath)) {
        console.log('✅ 배치 스크립트로 삭제 성공');
        return true;
      }
      return false;
    } catch (e) {
      console.log('⚠️ 배치 스크립트 실행 실패');
    }
  } else {
    // Unix 시스템용 쉘 스크립트
    try {
      const shellPath = path.join(os.tmpdir(), `delete-${Date.now()}.sh`);
      const shellContent = `#!/bin/bash
echo "디렉토리 삭제 중... ${dirPath}"
sleep 1
rm -rf "${dirPath}"
sleep 1
rm "$0"`;
      
      fs.writeFileSync(shellPath, shellContent, 'utf8');
      fs.chmodSync(shellPath, 0o755);
      execSync(`"${shellPath}" &`, { stdio: 'ignore' });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!fs.existsSync(dirPath)) {
        console.log('✅ 쉘 스크립트로 삭제 성공');
        return true;
      }
    } catch (e) {
      console.log('⚠️ 쉘 스크립트 실행 실패');
    }
  }

  // 방법 5: 재귀적으로 파일 삭제 후 디렉토리 삭제
  try {
    console.log('📂 재귀적 파일 삭제 시도 중...');
    recursivelyDeleteFiles(dirPath);
    
    // 디렉토리가 비었으므로 삭제 시도
    fs.rmdirSync(dirPath);
    
    if (!fs.existsSync(dirPath)) {
      console.log('✅ 재귀적 삭제 성공');
      return true;
    }
  } catch (e) {
    console.log('⚠️ 재귀적 삭제 실패');
  }
  
  console.log(`❌ 모든 삭제 방법이 실패했습니다: ${dirPath}`);
  return false;
}

/**
 * 재귀적으로 디렉토리 내 파일 삭제
 */
function recursivelyDeleteFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return;
  
  try {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      
      try {
        if (entry.isDirectory()) {
          recursivelyDeleteFiles(entryPath);
          fs.rmdirSync(entryPath);
        } else {
          fs.unlinkSync(entryPath);
        }
      } catch (err) {
        // 개별 파일/폴더 삭제 실패 시 계속 진행
      }
    }
  } catch (err) {
    // 디렉토리 읽기 실패 시 무시하고 계속 진행
  }
}

/**
 * Google Drive 동기화 중지 시도
 */
async function tryPauseGoogleDriveSync() {
  if (process.platform === 'win32') {
    try {
      // Google Drive 프로세스 임시 중지 시도
      execSync('taskkill /f /im "GoogleDriveFS.exe" /t', { stdio: 'ignore' });
      execSync('taskkill /f /im "Google Drive.exe" /t', { stdio: 'ignore' });
      console.log('✅ Google Drive 동기화 일시 중지됨');
      return true;
    } catch (e) {
      // 프로세스가 없거나 중지 실패
      console.log('⚠️ Google Drive 프로세스 중지 실패 (없거나 중지 권한 없음)');
      return false;
    }
  } else if (process.platform === 'darwin') { // macOS
    try {
      execSync('pkill -f "Google Drive"', { stdio: 'ignore' });
      execSync('pkill -f "GoogleDriveFS"', { stdio: 'ignore' });
      console.log('✅ Google Drive 동기화 일시 중지됨');
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * 강제 권한 설정 시도
 */
async function tryFixPermissions(directoryPath) {
  console.log(`🔒 ${directoryPath} 권한 수정 시도 중...`);
  
  if (process.platform === 'win32') {
    try {
      // Windows에서 권한 수정
      execSync(`icacls "${directoryPath}" /grant Everyone:F /T /Q`, { stdio: 'ignore' });
      console.log('✅ 권한 수정 성공');
    } catch (e) {
      console.log('⚠️ 권한 수정 실패 (계속 진행)');
    }
  } else {
    // Unix에서 권한 수정
    try {
      execSync(`chmod -R 777 "${directoryPath}"`, { stdio: 'ignore' });
      console.log('✅ 권한 수정 성공');
    } catch (e) {
      console.log('⚠️ 권한 수정 실패 (계속 진행)');
    }
  }
}

/**
 * package-lock.json 생성
 */
async function createMinimalPackageLock() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  
  try {
    if (fs.existsSync(packageJsonPath) && !fs.existsSync(packageLockPath)) {
      console.log('📝 최소 package-lock.json 파일 생성 중...');
      
      // package.json 읽기
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 최소한의 package-lock.json 생성
      const minimalPackageLock = {
        name: packageJson.name || 'typing-stats-app',
        version: packageJson.version || '0.1.0',
        lockfileVersion: 2,
        requires: true,
        packages: {
          "": {
            name: packageJson.name || 'typing-stats-app',
            version: packageJson.version || '0.1.0'
          }
        }
      };
      
      fs.writeFileSync(packageLockPath, JSON.stringify(minimalPackageLock, null, 2), 'utf8');
      console.log('✅ 최소 package-lock.json 파일 생성됨');
      return true;
    }
  } catch (e) {
    console.log('⚠️ package-lock.json 생성 실패:', e.message);
  }
  return false;
}

/**
 * 여러 npm 설치 방법 시도
 */
async function tryVariousInstallMethods(isGDrive) {
  const installMethods = [
    {
      name: '기본 npm 설치',
      command: 'npm install --no-package-lock',
      gdCommand: 'npm install --no-package-lock --no-fund --no-audit --force'
    },
    {
      name: 'npm ci + legacy-peer-deps',
      command: 'npm ci --legacy-peer-deps',
      gdCommand: 'npm ci --legacy-peer-deps --no-audit --force'
    },
    {
      name: 'npm i + legacy-peer-deps',
      command: 'npm i --legacy-peer-deps',
      gdCommand: 'npm i --legacy-peer-deps --no-audit --force'
    },
    {
      name: 'pnpm 사용',
      command: 'npx pnpm install --no-frozen-lockfile',
      gdCommand: 'npx pnpm install --no-frozen-lockfile --force'
    },
    {
      name: 'yarn 사용',
      command: 'npx yarn install',
      gdCommand: 'npx yarn install --force'
    }
  ];
  
  for (const method of installMethods) {
    const command = isGDrive ? method.gdCommand : method.command;
    console.log(`\n🔄 ${method.name} 시도 중: ${command}`);
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`\n✅ ${method.name} 성공!`);
      return true;
    } catch (error) {
      console.log(`\n❌ ${method.name} 실패: ${error.message}`);
      
      // 사용자에게 계속할지 물어봄
      const continuePrompt = await question('다음 설치 방법을 시도할까요? (Y/n): ');
      if (continuePrompt.toLowerCase() === 'n') {
        return false;
      }
    }
  }
  
  console.log('\n❌ 모든 설치 방법이 실패했습니다.');
  return false;
}

// TAR_ENTRY_ERROR 및 EBADF 오류 해결을 위한 메인 함수
async function fixNpmErrors() {
  console.log('🔧 npm 오류 해결 도구 시작...\n');
  console.log('이 도구는 다음 단계를 수행합니다:');
  console.log('1. npm 캐시 정리');
  console.log('2. npm 잠금 파일 정리');
  console.log('3. node_modules 삭제 (필요한 경우)');
  console.log('4. package-lock.json 관리');
  console.log('5. 의존성 재설치 (여러 방법 시도)\n');

  // Google Drive 환경 확인
  const isGDrive = isGoogleDriveEnvironment();
  if (isGDrive) {
    console.log('⚠️ Google Drive 환경에서 실행 중입니다. 파일 권한 문제가 발생할 수 있습니다.');
    console.log('💡 Google Drive의 파일 잠금으로 인한 문제를 해결하기 위해 추가 단계가 수행됩니다.\n');
    
    const pauseGDrive = await question('Google Drive 동기화를 일시 중지할까요? (권장) (Y/n): ');
    if (pauseGDrive.toLowerCase() !== 'n') {
      await tryPauseGoogleDriveSync();
    }
  }

  try {
    // 1단계: npm 캐시 정리
    console.log('1️⃣ npm 캐시 정리 중...');
    try {
      execSync('npm cache clean --force', { stdio: 'inherit' });
      console.log('✅ npm 캐시가 정리되었습니다.\n');
    } catch (error) {
      console.log('⚠️ npm 캐시 정리 실패, 계속 진행합니다.\n');
    }

    // 2단계: npm 잠금 파일 정리
    console.log('2️⃣ npm 잠금 파일 확인 중...');
    const npmLockPath = path.join(npmCachePath, '_locks');
    if (fs.existsSync(npmLockPath)) {
      try {
        const lockFiles = fs.readdirSync(npmLockPath);
        if (lockFiles.length > 0) {
          console.log(`${lockFiles.length}개의 npm 잠금 파일을 찾았습니다. 정리 중...`);
          
          for (const file of lockFiles) {
            try {
              fs.unlinkSync(path.join(npmLockPath, file));
            } catch (e) {
              // 개별 파일 삭제 실패 시 계속 진행
            }
          }
          
          console.log('✅ npm 잠금 파일이 정리되었습니다.');
        } else {
          console.log('✓ npm 잠금 파일이 없습니다.');
        }
      } catch (e) {
        console.log('⚠️ npm 잠금 파일 정리 실패, 계속 진행합니다.');
      }
    } else {
      console.log('✓ npm 잠금 디렉토리가 존재하지 않습니다.');
    }
    console.log();

    // 3단계: node_modules 삭제
    console.log('3️⃣ node_modules 폴더 처리 중...');
    if (fs.existsSync(nodeModulesPath)) {
      // Google Drive 환경에서는 권한 수정 시도
      if (isGDrive) {
        await tryFixPermissions(nodeModulesPath);
      }
      
      console.log('🗑️ node_modules 폴더 삭제 중...');
      const removed = await forceRemoveDirectory(nodeModulesPath);
      
      if (removed) {
        console.log('✅ node_modules 폴더가 삭제되었습니다.\n');
      } else {
        console.log('⚠️ 자동 삭제 실패, 수동 삭제 안내:');
        
        if (process.platform === 'win32') {
          console.log(`  1. 관리자 권한으로 명령 프롬프트 실행`);
          console.log(`  2. 다음 명령 실행: rd /s /q "${nodeModulesPath}"`);
        } else {
          console.log(`  1. 터미널 실행`);
          console.log(`  2. 다음 명령 실행: rm -rf "${nodeModulesPath}"`);
        }
        
        const continueAnyway = await question('계속 진행할까요? (y/N): ');
        if (continueAnyway.toLowerCase() !== 'y') {
          console.log('🛑 작업이 취소되었습니다.');
          rl.close();
          return;
        }
      }
    } else {
      console.log('✓ node_modules 폴더가 이미 존재하지 않습니다.\n');
    }

    // 4단계: package-lock.json 관리
    const packageLockPath = path.join(rootDir, 'package-lock.json');
    console.log('4️⃣ package-lock.json 파일 관리 중...');
    
    if (fs.existsSync(packageLockPath)) {
      try {
        console.log('기존 package-lock.json 백업 중...');
        fs.copyFileSync(packageLockPath, `${packageLockPath}.backup`);
        console.log('✅ package-lock.json 백업 완료');
        
        console.log('기존 package-lock.json 제거 중...');
        fs.unlinkSync(packageLockPath);
        console.log('✅ package-lock.json 파일 제거 완료\n');
      } catch (e) {
        console.log(`⚠️ package-lock.json 작업 중 오류: ${e.message}`);
        
        // Google Drive 환경에서는 권한 수정 시도
        if (isGDrive) {
          await tryFixPermissions(packageLockPath);
          try {
            fs.unlinkSync(packageLockPath);
            console.log('✅ 권한 수정 후 package-lock.json 삭제 성공\n');
          } catch (e2) {
            console.log('⚠️ 여전히 삭제 실패, 계속 진행합니다.\n');
          }
        }
      }
    } else {
      console.log('✓ package-lock.json 파일이 이미 존재하지 않습니다.\n');
    }
    
    // npm ci를 위한 최소 package-lock.json 생성
    await createMinimalPackageLock();

    // 5단계: 의존성 재설치
    console.log('5️⃣ 의존성 재설치 중...');
    console.log('💡 여러 설치 방법을 순차적으로 시도합니다...');
    
    // 여러 설치 방법 순차적 시도
    const installSuccess = await tryVariousInstallMethods(isGDrive);
    
    if (installSuccess) {
      console.log('\n🎉 설치 성공! 이제 애플리케이션을 실행할 수 있습니다.');
    } else {
      console.error('\n💥 모든 설치 방법이 실패했습니다.');
      console.log('\n❓ 다음과 같은 추가 조치를 시도해보세요:');
      console.log('1. 프로젝트를 Google Drive가 아닌 로컬 디스크로 복사');
      console.log('2. 관리자 권한으로 터미널/명령 프롬프트 실행 후 다시 시도');
      console.log('3. Node.js를 재설치하고 다시 시도');
      console.log('4. 시스템을 재부팅한 후 다시 시도');
    }
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.log('\n💡 문제가 지속된다면 docs/npm-troubleshooting.md 문서를 참조하세요.');
  } finally {
    rl.close();
    
    if (isGDrive) {
      console.log('\n📋 Google Drive 환경에서 작업할 때 권장사항:');
      console.log('1. npm run sync:prepare 명령을 실행하여 동기화 준비');
      console.log('2. 작업 완료 후 npm run sync:cleanup 명령 실행');
      console.log('3. .gdignore 파일을 통해 node_modules와 같은 대용량 폴더 동기화 제외');
      console.log('4. 가능하면 프로젝트를 로컬 디스크로 복사하여 작업 수행');
    }
  }
}

// 스크립트 실행
fixNpmErrors().catch(console.error);
