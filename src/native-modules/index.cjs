// 네이티브 모듈 로더 - 강화된 버전
const path = require('path');
const fs = require('fs');

// 디버깅용 로그
function log(message) {
  console.log(`[네이티브 모듈 로더] ${message}`);
}

function logError(message) {
  console.error(`[네이티브 모듈 로더 오류] ${message}`);
}

// 플랫폼별 파일 확장자
const extension = {
  'win32': '.dll',
  'darwin': '.dylib',
  'linux': '.so'
}[process.platform];

// 플랫폼별 접두사
const prefix = process.platform === 'win32' ? '' : 'lib';

// 가능한 모듈 경로 탐색
const possiblePaths = [
  // 기본 .node 파일
  path.join(__dirname, 'typing_stats_native.node'),
  // OS 특정 라이브러리 파일
  path.join(__dirname, `${prefix}typing_stats_native${extension}`),
  // 대체 경로
  path.join(__dirname, '..', '..', 'native-modules', 'typing_stats_native.node'),
  path.join(__dirname, '..', '..', 'native-modules', `${prefix}typing_stats_native${extension}`),
  // 빌드 디렉토리 경로
  path.join(__dirname, '..', '..', 'native-modules', 'target', 'release', 'typing_stats_native.node'),
  path.join(__dirname, '..', '..', 'native-modules', 'target', 'release', `${prefix}typing_stats_native${extension}`),
  path.join(__dirname, '..', '..', 'native-modules', 'target', 'debug', 'typing_stats_native.node'),
  path.join(__dirname, '..', '..', 'native-modules', 'target', 'debug', `${prefix}typing_stats_native${extension}`)
];

// 네이티브 모듈 로드
let nativeModule = null;
let moduleError = null;
let loadedPath = null;

log('네이티브 모듈 로드 시도 중...');

// 존재하는 모든 파일 경로 출력
const existingPaths = possiblePaths.filter(p => fs.existsSync(p));
log(`존재하는 파일 경로: ${existingPaths.join(', ') || '없음'}`);

// 모든 가능한 경로 시도
for (const modulePath of possiblePaths) {
  try {
    if (fs.existsSync(modulePath)) {
      log(`발견된 모듈 경로: ${modulePath}`);
      nativeModule = require(modulePath);
      loadedPath = modulePath;
      log(`네이티브 모듈 로드 성공: ${modulePath}`);
      break;
    }
  } catch (err) {
    logError(`${modulePath} 로드 실패: ${err.message}`);
    moduleError = err;
  }
}

// 폴백 구현
if (!nativeModule) {
  logError('네이티브 모듈을 로드할 수 없어 자바스크립트 폴백 구현을 사용합니다');
  
  // 간단한 폴백 구현
  nativeModule = {
    get_memory_info: () => {
      const memInfo = process.memoryUsage();
      const heapUsedMB = Math.round(memInfo.heapUsed / 1024 / 1024 * 100) / 100;
      const heapTotalMB = Math.round(memInfo.heapTotal / 1024 / 1024 * 100) / 100;
      const rssMB = Math.round(memInfo.rss / 1024 / 1024 * 100) / 100;
      
      return JSON.stringify({
        heap_used: memInfo.heapUsed,
        heap_total: memInfo.heapTotal,
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        rss: memInfo.rss,
        rss_mb: rssMB,
        percent_used: Math.round(memInfo.heapUsed / memInfo.heapTotal * 100),
        external: memInfo.external || 0,
        timestamp: Date.now()
      });
    },
    
    force_garbage_collection: () => {
      if (global.gc) {
        global.gc();
        return true;
      }
      return false;
    },
    
    optimize_memory: (level, emergency) => {
      const result = {
        success: true,
        optimization_level: level,
        freed_memory: 0,
        duration: 0,
        error: null,
        timestamp: Date.now()
      };
      
      if (global.gc) {
        const startTime = Date.now();
        const memBefore = process.memoryUsage();
        global.gc();
        const memAfter = process.memoryUsage();
        const duration = Date.now() - startTime;
        
        result.freed_memory = memBefore.heapUsed - memAfter.heapUsed;
        result.freed_mb = Math.round((result.freed_memory / 1024 / 1024) * 100) / 100;
        result.duration = duration;
      }
      
      return JSON.stringify(result);
    },
    
    is_using_fallback: () => true
  };
}

// 모듈을 동적으로 확장하여 폴백 확인 메서드 추가
if (nativeModule && !nativeModule.is_using_fallback) {
  nativeModule.is_using_fallback = () => false;
}

if (nativeModule && !nativeModule.get_loaded_path) {
  nativeModule.get_loaded_path = () => loadedPath || 'fallback-implementation';
}

module.exports = nativeModule;