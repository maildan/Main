/**
 * 개발 환경 설정 스크립트
 * 
 * 기능:
 * - Next.js와 Electron 동시 실행 최적화
 * - 개발용 환경 설정 자동화
 * - 필요한 디렉토리 생성 및 권한 확인
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { createInterface } = require('readline');

console.log('개발 환경 설정 스크립트 실행 중...');

const projectRoot = path.resolve(__dirname, '..');

// 환경 확인
function checkEnvironment() {
  console.log('환경 확인 중...');

  try {
    // Node.js 버전 확인
    const nodeVersion = process.version;
    console.log(`Node.js 버전: ${nodeVersion}`);

    // npm 버전 확인
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`npm 버전: ${npmVersion}`);

    // 필수 패키지 확인
    const requiredPackages = ['concurrently', 'wait-on', 'cross-env'];
    const missingPackages = [];

    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg, { paths: [projectRoot] });
      } catch (err) {
        missingPackages.push(pkg);
      }
    }

    if (missingPackages.length > 0) {
      console.log(`필요한 패키지 설치 중: ${missingPackages.join(', ')}`);
      execSync(`npm install --save-dev ${missingPackages.join(' ')}`, { stdio: 'inherit' });
    }

    return true;
  } catch (error) {
    console.error('환경 확인 중 오류 발생:', error);
    return false;
  }
}

// 개발 환경 설정
function setupDevEnvironment() {
  console.log('개발 환경 설정 중...');

  try {
    // package.json 읽기
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // 기존 dev 스크립트 업데이트
    if (packageJson.scripts && packageJson.scripts.dev) {
      // 현재 스크립트가 업데이트된 버전인지 확인
      if (!packageJson.scripts.dev.includes('wait-on')) {
        // 백업
        packageJson.scripts['dev:old'] = packageJson.scripts.dev;

        // 업데이트된 스크립트
        packageJson.scripts.dev = 'concurrently -n "next,electron" -c "blue,green" "next dev" "wait-on -l tcp:3000 && cross-env NODE_ENV=development electron --expose-gc --js-flags=\\\"--expose-gc\\\" ."';

        console.log('dev 스크립트 업데이트됨');
      } else {
        console.log('dev 스크립트가 이미 최신 버전입니다');
      }
    }

    // 개발에 유용한 스크립트 추가
    if (!packageJson.scripts['dev:next']) {
      packageJson.scripts['dev:next'] = 'next dev';
    }

    if (!packageJson.scripts['dev:electron']) {
      packageJson.scripts['dev:electron'] = 'cross-env NODE_ENV=development electron --expose-gc --js-flags=\\\"--expose-gc\\\" .';
    }

    if (!packageJson.scripts['dev:debug']) {
      packageJson.scripts['dev:debug'] = 'concurrently -n "next,electron" -c "blue,green" "next dev" "wait-on -l tcp:3000 && cross-env NODE_ENV=development ELECTRON_DEBUG=true electron --inspect=9229 --expose-gc --js-flags=\\\"--expose-gc\\\" ."';
    }

    // package.json 저장
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log('개발 환경 설정 완료');
    return true;
  } catch (error) {
    console.error('개발 환경 설정 중 오류 발생:', error);
    return false;
  }
}

// 개발 모드 테스트
async function testDevMode() {
  console.log('개발 모드 테스트 중...');

  return new Promise((resolve) => {
    // Next.js 개발 서버 시작
    console.log('Next.js 개발 서버를 시작합니다...');
    const nextProcess = spawn('npm', ['run', 'dev:next'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let serverStarted = false;
    let electronStarted = false;

    // Next.js 서버 출력 처리
    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Next.js] ${output.trim()}`);

      // 서버가 준비되었는지 확인
      if (output.includes('ready') && !serverStarted) {
        serverStarted = true;
        console.log('Next.js 서버가 준비되었습니다. Electron을 시작합니다...');

        // Electron 시작
        const electronProcess = spawn('npm', ['run', 'dev:electron'], {
          stdio: 'inherit',
          shell: true
        });

        electronStarted = true;

        // 5초 후에 테스트 종료
        setTimeout(() => {
          console.log('테스트를 종료합니다...');
          electronProcess.kill();
          nextProcess.kill();
          resolve(true);
        }, 5000);
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`[Next.js 오류] ${data.toString().trim()}`);
    });

    // 30초 후에도 서버가 시작되지 않으면 타임아웃
    setTimeout(() => {
      if (!serverStarted) {
        console.log('서버 시작 타임아웃. 테스트를 종료합니다.');
        nextProcess.kill();
        resolve(false);
      }
    }, 30000);
  });
}

// 메인 함수
async function main() {
  console.log('개발 환경 설정 및 테스트를 시작합니다.\n');

  // 환경 확인
  if (!checkEnvironment()) {
    console.error('환경 확인에 실패했습니다. 설정을 계속할 수 없습니다.');
    process.exit(1);
  }

  // 개발 환경 설정
  if (!setupDevEnvironment()) {
    console.error('개발 환경 설정에 실패했습니다.');
    process.exit(1);
  }

  // 사용자에게 테스트 여부 묻기
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\n개발 모드를 테스트하시겠습니까? (y/n): ', async (answer) => {
    readline.close();

    if (answer.toLowerCase() === 'y') {
      const success = await testDevMode();
      if (success) {
        console.log('\n개발 모드 테스트가 성공적으로 완료되었습니다.');
      } else {
        console.log('\n개발 모드 테스트에 실패했습니다. 로그를 확인하세요.');
      }
    }

    console.log('\n설정이 완료되었습니다. 이제 `npm run dev` 명령으로 개발을 시작할 수 있습니다.');
  });
}

// 스크립트 실행
main().catch((error) => {
  console.error('스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});
