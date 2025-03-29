/**
 * Electron 자원 잠금 문제 해결 스크립트
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 프로젝트 루트 경로
const projectRoot = path.resolve(__dirname, '..');
console.log('프로젝트 루트:', projectRoot);

// Electron 프로세스 종료
console.log('실행 중인 Electron 프로세스 종료 시도...');
try {
  if (process.platform === 'win32') {
    execSync('taskkill /f /im electron.exe', { stdio: 'inherit' });
    console.log('Electron 프로세스 종료됨');
  } else {
    execSync('pkill -f electron', { stdio: 'inherit' });
    console.log('Electron 프로세스 종료됨');
  }
} catch (error) {
  console.log('실행 중인 Electron 프로세스가 없거나 종료할 수 없습니다.');
}

// 문제가 되는 electron 폴더 처리
const electronNodeModulesPath = path.join(projectRoot, 'node_modules', 'electron');
if (fs.existsSync(electronNodeModulesPath)) {
  console.log('electron 폴더 이름 변경 시도...');
  try {
    // 임시 이름으로 변경
    const tempFolderName = `electron-old-${Date.now()}`;
    fs.renameSync(electronNodeModulesPath, path.join(projectRoot, 'node_modules', tempFolderName));
    console.log(`electron 폴더를 ${tempFolderName}로 이름 변경했습니다.`);
  } catch (error) {
    console.error('electron 폴더 이름 변경 실패:', error.message);
    console.log('수동으로 node_modules\\electron 폴더를 삭제한 후 다시 시도하세요.');
  }
}

// 패키지 설치 명령어 안내
console.log('\n패키지 설치 명령어:');
console.log('npm install --no-package-lock');
