
// 네이티브 모듈 로더
const path = require('path');

// 플랫폼별 파일 확장자
const extension = {
  'win32': '.dll',
  'darwin': '.dylib',
  'linux': '.so'
}[process.platform];

// 네이티브 모듈 로드
let nativeModule;
try {
  const modulePath = path.join(__dirname, `typing_stats_native${extension}`);
  nativeModule = require(modulePath);
  console.log('네이티브 모듈 로드 성공');
} catch (err) {
  console.error('네이티브 모듈 로드 실패:', err);
  nativeModule = null;
}

module.exports = nativeModule;
