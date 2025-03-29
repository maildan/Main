const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// 기본 경로 설정
const projectRoot = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const lockFilePath = path.join(projectRoot, 'package-lock.json');

console.log('🧹 노드 모듈 정리 도구 시작');

// 단계 1: 모든 프로세스 종료 시도
console.log('📌 1단계: 관련 프로세스 종료 확인');

try {
  if (process.platform === 'win32') {
    try {
      // Windows에서 노드 프로세스 종료
      execSync('taskkill /f /im node.exe /t', { stdio: 'ignore' });
      console.log('✅ Node.js 프로세스 종료됨');
    } catch (e) {
      // 이미 종료되어 있는 경우도 있으므로 무시
      console.log('ℹ️ 실행 중인 Node.js 프로세스가 없습니다');
    }
  }
} catch (error) {
  console.log('⚠️ 프로세스 종료 중 오류 (무시 가능):', error.message);
}

// 단계 2: 파일 권한 초기화 (Windows)
console.log('📌 2단계: 파일 권한 초기화');

if (process.platform === 'win32') {
  try {
    console.log(`🔓 읽기 전용 속성 제거 중...`);
    execSync(`attrib -R "${nodeModulesPath}\\*.*" /S /D`, { stdio: 'ignore' });
    console.log('✅ 속성 초기화 완료');
  } catch (e) {
    console.log('⚠️ 속성 변경 중 오류 (계속 진행):', e.message);
  }
}

// 단계 3: 노드 모듈 디렉토리 삭제
console.log('📌 3단계: node_modules 삭제');

if (fs.existsSync(nodeModulesPath)) {
  console.log('🗑️ node_modules 폴더 삭제 중...');
  
  try {
    // 1번 시도: fs.rmSync
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('✅ node_modules 삭제 성공!');
  } catch (error) {
    console.log('⚠️ 기본 삭제 실패, 강력 삭제 시도 중...');
    
    // 2번 시도: OS별 명령어 사용
    if (process.platform === 'win32') {
      try {
        execSync(`rmdir /s /q "${nodeModulesPath}"`, { stdio: 'ignore' });
        console.log('✅ rmdir 명령으로 성공적으로 삭제됨');
      } catch (e) {
        console.log('⚠️ Windows 삭제 실패, 임시 배치 파일로 시도...');
        
        // 3번 시도: 배치 파일 생성 및 실행
        try {
          const batchPath = path.join(os.tmpdir(), `clean-modules-${Date.now()}.bat`);
          const batchContent = `@echo off
echo 노드 모듈 정리 중...
timeout /t 1 /nobreak > nul
rd /s /q "${nodeModulesPath.replace(/\\/g, '\\\\')}"
echo 완료!
del "%~f0"
`;
          fs.writeFileSync(batchPath, batchContent);
          execSync(`start /min cmd /c ${batchPath}`, { stdio: 'ignore' });
          console.log('✅ 배치 파일을 통해 삭제 작업이 백그라운드에서 실행 중');
        } catch (batchError) {
          console.error('❌ 모든 시도 실패. 관리자 권한으로 다음 명령 수동 실행 필요:');
          console.error(`rd /s /q "${nodeModulesPath}"`);
        }
      }
    } else {
      // Unix 계열
      try {
        execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'ignore' });
        console.log('✅ rm 명령으로 성공적으로 삭제됨');
      } catch (e) {
        console.error('❌ 삭제 실패. 관리자 권한으로 다음 명령 수동 실행 필요:');
        console.error(`sudo rm -rf "${nodeModulesPath}"`);
      }
    }
  }
} else {
  console.log('✅ node_modules 폴더가 이미 존재하지 않음');
}

// 단계 4: 락 파일 삭제 (선택적)
console.log('📌 4단계: package-lock.json 삭제');

if (fs.existsSync(lockFilePath)) {
  try {
    fs.unlinkSync(lockFilePath);
    console.log('✅ package-lock.json 삭제 완료');
  } catch (error) {
    console.log('⚠️ package-lock.json 삭제 실패:', error.message);
  }
} else {
  console.log('ℹ️ package-lock.json 파일이 없습니다');
}

// 단계 5: npm 캐시 정리
console.log('📌 5단계: npm 캐시 정리');

try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npm 캐시 정리 완료');
} catch (error) {
  console.log('⚠️ npm 캐시 정리 중 오류:', error.message);
}

console.log('\n✨ 정리 작업 완료! 이제 다음 명령어로 의존성을 다시 설치하세요:');
console.log('npm install');
