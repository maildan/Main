#!/usr/bin/env node

/**
 * 모듈 임포트 문제를 해결하기 위한 스크립트
 * 개발 모드에서 앱을 재시작할 때 모든 모듈이 일관되게 로딩되도록 합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('모듈 임포트 문제 해결 중...');

// 프로젝트 루트 경로
const projectRoot = path.resolve(__dirname, '..');

// 캐시 디렉토리 정리
const cacheDirs = [
  path.join(projectRoot, '.next', '.cache'),
  path.join(projectRoot, '.next', 'cache'),
  path.join(projectRoot, 'node_modules', '.cache')
];

// 캐시 삭제
cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`캐시 디렉토리 삭제 중: ${dir}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`캐시 디렉토리 삭제 완료: ${dir}`);
    } catch (err) {
      console.error(`캐시 디렉토리 삭제 실패: ${dir}`, err);
    }
  }
});

// TypeScript 타입 확인
console.log('TypeScript 타입 확인 중...');
try {
  execSync('tsc --noEmit', { stdio: 'inherit', cwd: projectRoot });
  console.log('TypeScript 타입 확인 완료');
} catch (err) {
  console.error('TypeScript 타입 확인 중 오류가 발생했지만 계속 진행합니다.');
}

// 개발 서버 정상 작동 확인
console.log('개발 서버가 정상적으로 작동하는지 확인 중...');
try {
  const isPortOpen = (port) => {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
          resolve(res.statusCode === 200);
          res.resume();
        });
        req.on('error', () => {
          resolve(false);
        });
        req.end();
      });
    } catch (err) {
      return Promise.resolve(false);
    }
  };

  isPortOpen(3000).then(isOpen => {
    if (isOpen) {
      console.log('개발 서버가 정상적으로 작동 중입니다.');
    } else {
      console.log('개발 서버가 작동하지 않습니다. 다시 시작해 주세요.');
    }
  });
} catch (err) {
  console.error('개발 서버 확인 중 오류 발생:', err);
}

// 모듈 의존성 확인
console.log('모듈 의존성 확인 중...');
try {
  // package.json에서 electron-reload 버전 확인
  const packageJson = require(path.join(projectRoot, 'package.json'));
  const electronReloadVersion = packageJson.devDependencies['electron-reload'];
  
  if (electronReloadVersion && electronReloadVersion !== packageJson.dependencies['electron-reload']) {
    console.log('electron-reload 버전 충돌이 감지되었습니다. package.json을 확인해주세요.');
  }
  
  console.log('모듈 의존성 확인 완료');
} catch (err) {
  console.error('모듈 의존성 확인 중 오류 발생:', err);
}

console.log('모듈 임포트 문제 해결 완료. 이제 "yarn dev" 또는 "npm run dev"를 실행하여 앱을 시작할 수 있습니다.'); 