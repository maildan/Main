// 네이티브 모듈 로더
const path = require('path');
const fs = require('fs');

// 플랫폼별 네이티브 모듈 확장자 및 접두사 설정
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// 네이티브 모듈 로드
let nativeModule = null;

try {
  // 네이티브 애드온은 .node 확장자로 로드해야 함
  const modulePath = path.join(__dirname, 'typing_stats_native.node');

  // 파일 존재 여부 확인
  if (fs.existsSync(modulePath)) {
    console.log(`네이티브 모듈 경로 확인: ${modulePath}`);
    nativeModule = require(modulePath);
    console.log('네이티브 모듈 로드 성공');
  } else {
    // 대체 경로 확인 (빌드 디렉토리)
    const alternatePaths = [
      path.join(process.cwd(), 'native-modules', 'target', 'release', 'typing_stats_native.node'),
      path.join(process.cwd(), 'native-modules', 'target', 'debug', 'typing_stats_native.node'),
    ];

    for (const altPath of alternatePaths) {
      if (fs.existsSync(altPath)) {
        console.log(`대체 경로에서 네이티브 모듈 찾음: ${altPath}`);
        try {
          nativeModule = require(altPath);
          console.log('대체 경로에서 네이티브 모듈 로드 성공');
          break;
        } catch (e) {
          console.error(`대체 경로에서 모듈 로드 실패: ${e.message}`);
        }
      }
    }

    if (!nativeModule) {
      throw new Error('적합한 네이티브 모듈을 찾을 수 없습니다.');
    }
  }
} catch (err) {
  console.error('네이티브 모듈 로드 실패:', err);
  nativeModule = null;
}

module.exports = nativeModule;
