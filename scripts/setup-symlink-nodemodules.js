/**
 * node_modules 심볼릭 링크 설정 스크립트
 * 
 * 이 스크립트는 Google Drive와 같은 클라우드 동기화 폴더에서 발생하는
 * ENOTDIR 및 기타 파일 관련 오류를 해결하기 위해 node_modules 폴더를
 * 클라우드 동기화 대상이 아닌 로컬 디렉토리에 생성하고 심볼릭 링크를 설정합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const os = require('os');

// 콘솔 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 사용자에게 질문하는 함수
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// 현재 프로젝트 경로
const projectPath = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(projectPath, 'node_modules');

// 기본 외부 스토리지 경로 (사용자 홈 디렉토리 내 typing-stats-modules 폴더)
const defaultExternalDir = path.join(os.homedir(), 'typing-stats-modules');

async function main() {
  console.log('🔧 node_modules 심볼릭 링크 설정 도구');
  console.log('이 도구는 node_modules 폴더를 Google Drive 외부에 저장하고 심볼릭 링크를 생성합니다.\n');

  try {
    // 1. 관리자 권한 확인 (Windows에서 심볼릭 링크 생성 시 필요)
    const isAdmin = checkAdminRights();
    if (!isAdmin && process.platform === 'win32') {
      console.log('⚠️ Windows에서 심볼릭 링크를 생성하려면 관리자 권한이 필요합니다.');
      console.log('💡 이 스크립트를 관리자 권한으로 실행하세요 (관리자 권한으로 PowerShell/명령 프롬프트 실행 후 node scripts/setup-symlink-nodemodules.js)');
      
      const continueAnyway = await question('그래도 계속 진행할까요? (y/N): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log('🛑 작업이 취소되었습니다.');
        rl.close();
        return;
      }
    }

    // 2. 외부 저장소 경로 설정
    console.log('node_modules 폴더가 저장될 외부 경로를 지정합니다.');
    console.log(`기본 경로: ${defaultExternalDir}`);
    
    const customPath = await question('다른 경로를 사용하시겠습니까? (엔터를 누르면 기본 경로 사용) ');
    
    const externalModulesDir = customPath.trim() 
      ? path.resolve(customPath.trim()) 
      : defaultExternalDir;
    
    const projectName = path.basename(projectPath);
    const externalNodeModulesPath = path.join(externalModulesDir, projectName, 'node_modules');

    console.log(`\n선택된 경로: ${externalNodeModulesPath}`);

    // 3. 기존 node_modules 처리
    if (fs.existsSync(nodeModulesPath)) {
      console.log('\n🔍 기존 node_modules 폴더가 발견되었습니다.');
      
      const shouldCopy = await question('기존 node_modules 내용을 새 위치로 복사할까요? (y/N): ');
      
      if (shouldCopy.toLowerCase() === 'y') {
        console.log('📦 node_modules 내용을 복사 중...');
        
        // 외부 디렉토리가 없으면 생성
        fs.mkdirSync(path.dirname(externalNodeModulesPath), { recursive: true });
        
        try {
          // node_modules 복사 (Windows에서는 xcopy, 다른 OS에서는 cp 명령 사용)
          if (process.platform === 'win32') {
            execSync(`xcopy "${nodeModulesPath}" "${externalNodeModulesPath}" /E /I /H /Y`, 
              { stdio: 'ignore' });
          } else {
            execSync(`cp -R "${nodeModulesPath}" "${path.dirname(externalNodeModulesPath)}"`, 
              { stdio: 'ignore' });
          }
          console.log('✅ 복사 완료');
        } catch (error) {
          console.error(`❌ 복사 중 오류 발생: ${error.message}`);
          console.log('💡 기존 node_modules는 유지되고, 새로운 위치에서 설치를 시도합니다.');
        }
      }
      
      console.log('🗑️ 기존 node_modules 폴더 삭제 중...');
      try {
        removeDirectory(nodeModulesPath);
        console.log('✅ 삭제 완료');
      } catch (error) {
        console.error(`❌ 삭제 중 오류 발생: ${error.message}`);
        console.log('💡 수동으로 node_modules 폴더를 삭제한 후 다시 시도하세요.');
        rl.close();
        return;
      }
    }

    // 4. 외부 디렉토리 준비
    console.log('\n📁 외부 저장소 디렉토리 준비 중...');
    try {
      fs.mkdirSync(path.dirname(externalNodeModulesPath), { recursive: true });
      console.log('✅ 외부 디렉토리 준비 완료');
    } catch (error) {
      throw new Error(`외부 디렉토리 생성 실패: ${error.message}`);
    }

    // 5. 심볼릭 링크 생성
    console.log('\n🔗 심볼릭 링크 생성 중...');
    
    try {
      if (process.platform === 'win32') {
        // Windows에서는 mklink /D 명령어 사용 (관리자 권한 필요)
        execSync(`mklink /D "${nodeModulesPath}" "${externalNodeModulesPath}"`, { stdio: 'inherit' });
      } else {
        // Unix 계열에서는 ln -s 명령어 사용
        execSync(`ln -s "${externalNodeModulesPath}" "${nodeModulesPath}"`, { stdio: 'inherit' });
      }
      console.log('✅ 심볼릭 링크 생성 완료');
    } catch (error) {
      throw new Error(`심볼릭 링크 생성 실패: ${error.message}`);
    }

    // 6. npm 설치 실행
    console.log('\n📦 npm 패키지 설치 시작...');
    const shouldInstall = await question('npm install을 실행할까요? (Y/n): ');
    
    if (shouldInstall.toLowerCase() !== 'n') {
      return new Promise((resolve) => {
        const npmProcess = spawn('npm', ['install', '--legacy-peer-deps'], {
          stdio: 'inherit',
          shell: true
        });
        
        npmProcess.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ npm 설치 완료!');
          } else {
            console.error(`\n❌ npm 설치 실패 (종료 코드: ${code})`);
          }
          
          console.log('\n📋 설정 요약:');
          console.log(`- 프로젝트 경로: ${projectPath}`);
          console.log(`- 외부 node_modules 경로: ${externalNodeModulesPath}`);
          console.log(`- 심볼릭 링크 경로: ${nodeModulesPath}`);
          
          console.log('\n💡 이제 일반적인 방식으로 npm 명령을 사용할 수 있습니다.');
          console.log('💡 주의: 이 컴퓨터에서만 이 설정이 적용됩니다. 다른 컴퓨터에서는 이 스크립트를 다시 실행해야 합니다.');
          
          rl.close();
          resolve();
        });
      });
    } else {
      console.log('\n📋 설정 요약:');
      console.log(`- 프로젝트 경로: ${projectPath}`);
      console.log(`- 외부 node_modules 경로: ${externalNodeModulesPath}`);
      console.log(`- 심볼릭 링크 경로: ${nodeModulesPath}`);
      
      console.log('\n💡 이제 직접 npm install 명령을 실행하여 패키지를 설치할 수 있습니다.');
      console.log('💡 주의: 이 컴퓨터에서만 이 설정이 적용됩니다. 다른 컴퓨터에서는 이 스크립트를 다시 실행해야 합니다.');
    }
    
  } catch (error) {
    console.error(`\n❌ 오류 발생: ${error.message}`);
    console.log('💡 기본 방법으로 돌아가려면 node_modules 폴더를 삭제하고 일반적인 방법으로 npm install을 실행하세요.');
  } finally {
    rl.close();
  }
}

/**
 * 디렉토리 삭제 함수
 */
function removeDirectory(dirPath) {
  if (process.platform === 'win32') {
    // Windows에서는 rd 명령어 사용
    execSync(`rd /s /q "${dirPath}"`, { stdio: 'ignore' });
  } else {
    // Unix 계열에서는 rm -rf 명령어 사용
    execSync(`rm -rf "${dirPath}"`, { stdio: 'ignore' });
  }
}

/**
 * 관리자 권한 확인
 */
function checkAdminRights() {
  try {
    if (process.platform === 'win32') {
      // Windows에서 관리자 권한 확인
      execSync('net session >nul 2>&1', { stdio: 'ignore' });
      return true;
    } else {
      // Unix 계열에서 관리자 권한 확인
      return process.getuid && process.getuid() === 0;
    }
  } catch (e) {
    return false;
  }
}

main().catch(console.error);
