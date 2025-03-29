/**
 * npm 설치 오류 해결 스크립트
 * electron 파일 잠금 문제 및 package.json 오류 해결
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(rootDir, 'node_modules');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');

console.log('🔧 npm 설치 오류 해결 시작...');

// 1. 실행 중인 Electron 프로세스 종료
try {
  console.log('🔍 Electron 프로세스 확인 중...');
  if (process.platform === 'win32') {
    try {
      execSync('taskkill /f /im electron.exe', { stdio: 'ignore' });
      console.log('✅ Electron 프로세스 종료 완료');
    } catch (e) {
      console.log('ℹ️ 실행 중인 Electron 프로세스가 없습니다');
    }
  } else {
    try {
      execSync('pkill -f electron', { stdio: 'ignore' });
      console.log('✅ Electron 프로세스 종료 완료');
    } catch (e) {
      console.log('ℹ️ 실행 중인 Electron 프로세스가 없습니다');
    }
  }
} catch (error) {
  console.warn('⚠️ 프로세스 확인 중 오류:', error.message);
}

// 2. package.json 파일 유효성 확인
try {
  console.log('🔍 package.json 유효성 검사 중...');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  try {
    JSON.parse(packageJsonContent);
    console.log('✅ package.json 파일이 유효합니다');
  } catch (jsonError) {
    console.error('❌ package.json 파일에 구문 오류가 있습니다:', jsonError.message);
    console.log('⚠️ package.json 파일을 백업하고 수정해야 합니다');
    
    // 백업 생성
    const backupPath = `${packageJsonPath}.backup-${Date.now()}`;
    fs.copyFileSync(packageJsonPath, backupPath);
    console.log(`📋 기존 package.json 백업 생성: ${backupPath}`);
    
    // 여기서 package.json 수정 코드를 추가할 수 있습니다.
    console.log('🔧 에디터에서 package.json 파일을 수정한 후 이 스크립트를 다시 실행하세요');
    process.exit(1);
  }
} catch (fileError) {
  console.error('❌ package.json 파일 읽기 오류:', fileError.message);
}

// 3. node_modules와 package-lock.json 삭제
try {
  console.log('🗑️ node_modules 폴더 삭제 중...');
  
  if (fs.existsSync(nodeModulesPath)) {
    // Windows에서는 먼저 읽기 전용 속성 제거
    if (process.platform === 'win32') {
      try {
        execSync(`attrib -R "${nodeModulesPath}\\*.*" /S`, { stdio: 'ignore' });
      } catch (e) {
        // 에러 무시
      }
    }
    
    // 폴더 삭제 시도 - rmSync 사용
    try {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true, maxRetries: 5 });
      console.log('✅ node_modules 폴더 삭제 성공');
    } catch (rmError) {
      console.log('⚠️ fs.rmSync로 삭제 실패, 다른 방법 시도...');
      
      // 운영체제별 강력한 삭제 명령 시도
      try {
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${nodeModulesPath}"`, { stdio: 'ignore' });
        } else {
          execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'ignore' });
        }
        console.log('✅ 시스템 명령으로 node_modules 폴더 삭제 성공');
      } catch (cmdError) {
        console.error('❌ node_modules 폴더 삭제 실패:', cmdError.message);
        console.log('💡 수동으로 node_modules 폴더를 삭제한 후 다시 시도하세요');
      }
    }
  } else {
    console.log('✓ node_modules 폴더가 이미 없습니다');
  }
  
  // package-lock.json 삭제
  console.log('🗑️ package-lock.json 삭제 중...');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
    console.log('✅ package-lock.json 파일 삭제 완료');
  } else {
    console.log('✓ package-lock.json 파일이 이미 없습니다');
  }
  
} catch (error) {
  console.error('❌ 파일 삭제 중 오류:', error.message);
}

// 4. npm 캐시 정리
try {
  console.log('🧹 npm 캐시 정리 중...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npm 캐시 정리 완료');
} catch (error) {
  console.warn('⚠️ npm 캐시 정리 중 오류:', error.message);
}

// 5. 의존성 재설치 진행
console.log('\n📦 설치 명령어 안내:');
console.log('1. 설치 시도 명령어 (차례로 시도하세요):');
console.log('   npm install --legacy-peer-deps --no-fund --no-audit');
console.log('   npm install --legacy-peer-deps --force --no-fund');
console.log('   npm install --legacy-peer-deps --no-package-lock');
console.log('\n2. Next.js 관련 패키지 설치 명령어:');
console.log('   npm install next@15.2.2 --save');
console.log('\n3. ESLint 관련 패키지 설치 명령어:');
console.log('   npm install eslint@9.23.0 eslint-config-next@15.2.4 @typescript-eslint/parser@8 @typescript-eslint/eslint-plugin@8 --save-dev');
console.log('   npm install @next/eslint-plugin-next@15.2.4 eslint-plugin-react@7.34.0 --save-dev');

console.log('\n✅ 설치 준비 완료!');
console.log('\n💡 이제 위에 나열된 설치 명령어를 차례로 실행해 보세요.');
