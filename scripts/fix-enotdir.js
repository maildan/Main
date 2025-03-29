/**
 * ENOTDIR 오류 처리 향상 스크립트
 * 
 * 이 스크립트는 특히 파일이 디렉토리인 것처럼 처리되어 발생하는 ENOTDIR 오류를 해결합니다.
 * Google Drive와 같은 클라우드 스토리지에서 자주 발생하는 문제입니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

// 루트 디렉토리
const rootDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(rootDir, 'node_modules');
const packageLockPath = path.join(rootDir, 'package-lock.json');

console.log('🔍 ENOTDIR 오류 심화 진단 및 해결 시작...');

// 특별히 문제가 될 수 있는 경로들
const problematicPaths = [
  path.join(nodeModulesPath, 'eslint', 'node_modules'),
  path.join(nodeModulesPath, 'eslint-plugin-import', 'node_modules'),
  path.join(nodeModulesPath, 'eslint-plugin-react', 'node_modules'),
  path.join(nodeModulesPath, 'victory-vendor', 'node_modules'),
  // 일반적으로 문제가 되는 다른 경로들도 추가
  path.join(nodeModulesPath, '@typescript-eslint', 'node_modules'),
  path.join(nodeModulesPath, 'typescript', 'node_modules')
];

// 파일 시스템 검사 실행
async function runFileSystemCheck() {
  console.log('📊 파일 시스템 상태 확인 중...');

  if (process.platform === 'win32') {
    try {
      console.log('Windows 드라이브 검사 실행 중...');
      // G 드라이브 확인
      const driveInfo = execSync('wmic logicaldisk get caption, filesystem, freespace, size | findstr "G:"', 
        { encoding: 'utf8' });
      console.log(`드라이브 정보: ${driveInfo.trim()}`);
    } catch (err) {
      console.log('드라이브 정보 조회 실패 (계속 진행)');
    }
  }
}

// 노드 모듈 디렉토리 확인
async function checkNodeModules() {
  console.log('🔍 node_modules 구조 확인 중...');
  
  try {
    // 1. node_modules 디렉토리가 있는지 먼저 확인
    const nodeModulesExists = fs.existsSync(nodeModulesPath);
    console.log(`node_modules 디렉토리 존재: ${nodeModulesExists ? '예' : '아니오'}`);
    
    // 2. node_modules가 보이지 않지만 하위 경로가 있을 수 있음
    // Windows 전용: dir /ah 명령어로 숨겨진 파일 확인
    if (process.platform === 'win32') {
      try {
        console.log('숨겨진 node_modules 확인 중...');
        execSync(`dir /ah "${path.dirname(nodeModulesPath)}"`, { stdio: 'inherit' });
      } catch (err) {
        // 오류 무시, 결과가 없을 수 있음
      }
    }

    // 3. 문제 경로 체크
    if (nodeModulesExists) {
      // node_modules 내 특정 문제 경로 확인
      for (const problemPath of problematicPaths) {
        if (fs.existsSync(problemPath)) {
          try {
            const stats = fs.statSync(problemPath);
            const isDirectory = stats.isDirectory();
            console.log(`확인: ${problemPath} - ${isDirectory ? '디렉토리' : '파일'}`);
            
            if (!isDirectory) {
              console.log(`⚠️ 발견됨: ${problemPath}는 디렉토리가 아닌 파일입니다. 제거 중...`);
              fs.unlinkSync(problemPath);
              console.log('✅ 문제 파일 제거 완료');
            }
          } catch (err) {
            console.warn(`⚠️ 경로 확인 중 오류: ${err.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ node_modules 확인 중 오류: ${err.message}`);
  }
}

// 강력한 삭제 함수
async function forceRemoveNodeModules() {
  console.log('🗑️ node_modules 강력 제거 중...');
  
  // 방법 1: 디렉토리 존재 확인
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('✓ node_modules 디렉토리가 존재하지 않는 것으로 보입니다.');
    // 그러나 숨겨진 파일이나 부분적으로 존재할 수 있으므로 계속 진행
  }

  // 방법 2: Windows 특수 명령 (관리자 권한 필요할 수 있음)
  if (process.platform === 'win32') {
    console.log('Windows 전용 강화 제거 방법 시도 중...');
    
    // 속성 제거 시도
    try {
      execSync(`attrib -R -H -S "${nodeModulesPath}\\*.*" /S /D`, { stdio: 'ignore' });
    } catch (err) {
      // 오류 무시
    }
    
    // RD 명령 사용
    try {
      execSync(`rd /s /q "${nodeModulesPath}"`, { stdio: 'ignore' });
    } catch (err) {
      console.log(`⚠️ RD 명령 실패 (계속 진행): ${err.message}`);
    }
    
    // Powershell Remove-Item (강력한 옵션 적용)
    try {
      const psCommand = `Remove-Item -Path '${nodeModulesPath.replace(/\\/g, '\\\\')}' -Recurse -Force -ErrorAction SilentlyContinue`;
      execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
    } catch (err) {
      console.log(`⚠️ PowerShell 제거 실패 (계속 진행): ${err.message}`);
    }
    
    // DEL 명령으로 파일만 먼저 삭제
    try {
      execSync(`del /f /s /q "${nodeModulesPath}\\*.*"`, { stdio: 'ignore' });
    } catch (err) {
      // 오류 무시
    }
  } else {
    // Unix 계열 시스템용 명령
    try {
      execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'inherit' });
    } catch (err) {
      console.log(`⚠️ Unix 제거 명령 실패: ${err.message}`);
    }
  }

  // 추가 확인: 제거 완료 후 정리
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules 디렉토리 제거 완료');
    return true;
  } else {
    console.log('⚠️ node_modules 디렉토리가 여전히 존재함');
    return false;
  }
}

// 부분적으로 남아있는 파일 찾아서 처리
async function cleanupPartialFiles() {
  console.log('🧹 부분적 파일 구조 정리 중...');
  
  // 특정 문제 경로 처리
  for (const problemPath of problematicPaths) {
    const parentDir = path.dirname(problemPath);
    
    if (fs.existsSync(parentDir)) {
      console.log(`🔍 검사 중: ${parentDir}`);
      
      try {
        const files = fs.readdirSync(parentDir);
        for (const file of files) {
          const filePath = path.join(parentDir, file);
          const stats = fs.statSync(filePath);
          
          // node_modules라는 이름의 파일 발견
          if (file === 'node_modules' && !stats.isDirectory()) {
            console.log(`⚠️ 발견됨: ${filePath}는 디렉토리가 아닌 파일입니다. 제거 중...`);
            fs.unlinkSync(filePath);
            console.log(`✅ ${filePath} 제거 완료`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ ${parentDir} 검사 중 오류: ${err.message}`);
      }
    }
  }
  
  // Google Drive 캐시 정리 시도
  if (process.platform === 'win32') {
    try {
      console.log('Google Drive 캐시 정리 시도 중...');
      execSync('taskkill /f /im "GoogleDriveFS.exe" /t', { stdio: 'ignore' });
    } catch (err) {
      // 오류 무시
    }
  }
}

// 배치 파일로 정리하는 방법 (백그라운드에서 실행)
async function createCleanupBatch() {
  console.log('📝 특수 정리 스크립트 생성 중...');
  
  if (process.platform === 'win32') {
    const batchPath = path.join(os.tmpdir(), `cleanup-${Date.now()}.bat`);
    const batchContent = `@echo off
echo 노드 모듈 강력 정리 배치 스크립트
timeout /t 2 /nobreak > nul
echo 캐시된 파일 초기화 중...
attrib -R -H -S "${nodeModulesPath.replace(/\\/g, '\\\\')}" /S /D
timeout /t 1 /nobreak > nul
echo 파일 삭제 중...
del /f /s /q "${nodeModulesPath.replace(/\\/g, '\\\\')}" > nul 2>&1
timeout /t 2 /nobreak > nul
echo 폴더 제거 중...
rd /s /q "${nodeModulesPath.replace(/\\/g, '\\\\')}" > nul 2>&1
echo 완료!
del "%~f0"
`;
    
    try {
      fs.writeFileSync(batchPath, batchContent, 'utf8');
      console.log(`✅ 정리 스크립트 생성됨: ${batchPath}`);
      
      // 백그라운드에서 실행
      exec(`start /min cmd /c ${batchPath}`, (error) => {
        if (error) {
          console.error(`배치 실행 오류: ${error.message}`);
        }
      });
      
      console.log('🔄 정리 스크립트가 백그라운드에서 실행 중입니다...');
    } catch (err) {
      console.error(`배치 파일 생성 오류: ${err.message}`);
    }
  }
}

// 메인 실행 흐름
async function main() {
  try {
    // 1. 파일 시스템 검사
    await runFileSystemCheck();
    
    // 2. node_modules 구조 확인
    await checkNodeModules();
    
    // 3. package-lock.json 제거
    if (fs.existsSync(packageLockPath)) {
      console.log('🗑️ package-lock.json 삭제 중...');
      fs.unlinkSync(packageLockPath);
      console.log('✅ package-lock.json 삭제 완료');
    } else {
      console.log('✓ package-lock.json 파일이 이미 없습니다');
    }
    
    // 4. 남아있는 부분 파일 정리
    await cleanupPartialFiles();
    
    // 5. node_modules 강력 제거
    const removed = await forceRemoveNodeModules();
    
    // 6. 백그라운드 정리 스크립트 생성 (문제 지속 시)
    if (!removed) {
      await createCleanupBatch();
    }
    
    // 7. npm 캐시 정리
    console.log('🧹 npm 캐시 정리 중...');
    try {
      execSync('npm cache clean --force', { stdio: 'inherit' });
      console.log('✅ npm 캐시 정리 완료');
    } catch (err) {
      console.warn(`⚠️ npm 캐시 정리 실패: ${err.message}`);
    }
    
    console.log('\n✅ ENOTDIR 오류 해결 작업 완료!');
    console.log('\n📋 다음 단계:');
    console.log('1. 이제 "npm install --no-package-lock --legacy-peer-deps" 명령으로 패키지를 재설치하세요.');
    console.log('2. 만약 여전히 오류가 발생한다면 "npm run fix:npm-errors" 명령을 실행하세요.');
    console.log('\n💡 Google Drive 환경에서 작업 중이라면:');
    console.log('- Google Drive 동기화를 일시 중지하고 설치를 진행하세요');
    console.log('- 또는 로컬 드라이브로 프로젝트를 복사하여 작업하는 것이 좋습니다');
    
  } catch (error) {
    console.error(`❌ 오류 발생: ${error.message}`);
    process.exit(1);
  }
}

main();
