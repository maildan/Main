const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 필요한 변수 선언
const projectRoot = path.join(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');
// 수정: 올바른 Windows 플랫폼 검사
const isWindows = os.platform() === 'win32';

// 폴백 모듈 디렉토리 생성 함수 추가
function createFallbackModule() {
  console.log('폴백 모듈 생성 중...');

  const fallbackDir = path.join(__dirname, '..', 'src', 'server', 'native', 'fallback');

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
    console.log(`폴백 모듈 디렉토리 생성됨: ${fallbackDir}`);
  }

  // 기본 fallback/index.js 파일 생성
  const fallbackFilePath = path.join(fallbackDir, 'index.js');

  // 폴백 모듈 내용 작성
  const fallbackContent = `
/**
 * 네이티브 모듈 JavaScript 폴백 구현
 * 
 * 네이티브 모듈을 로드할 수 없을 때 기본 기능을 제공합니다.
 */
const os = require('os');

// 상태 관리
const state = {
  startTime: Date.now(),
  callCount: 0,
  gpuEnabled: false
};

// 유틸리티 함수
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 메모리 정보 가져오기
 * @returns {string} JSON 형식의 메모리 정보
 */
function get_memory_info() {
  const memoryUsage = process.memoryUsage();
  
  return JSON.stringify({
    heap_used: memoryUsage.heapUsed,
    heap_total: memoryUsage.heapTotal,
    heap_limit: memoryUsage.heapTotal * 2,
    heap_used_mb: Math.round(memoryUsage.heapUsed / (1024 * 1024) * 100) / 100,
    percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 10) / 10,
    rss: memoryUsage.rss,
    rss_mb: Math.round(memoryUsage.rss / (1024 * 1024) * 100) / 100,
    external: memoryUsage.external,
    timestamp: getCurrentTimestamp(),
    success: true
  });
}

/**
 * 최적화 레벨 결정
 * @param {Object} memoryInfo 메모리 정보 객체
 * @param {boolean} emergency 긴급 여부
 * @returns {number} 최적화 레벨 (1-4)
 */
function determine_optimization_level(memoryInfo, emergency = false) {
  if (emergency) return 4;
  
  if (!memoryInfo) {
    const memUsage = process.memoryUsage();
    const percentUsed = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (percentUsed > 90) return 3;
    if (percentUsed > 70) return 2;
    return 1;
  }
  
  const memInfo = typeof memoryInfo === 'string' ? JSON.parse(memoryInfo) : memoryInfo;
  const percentUsed = memInfo.percent_used || (memInfo.heap_used / memInfo.heap_total) * 100;
  
  if (percentUsed > 90) return 3;
  if (percentUsed > 70) return 2;
  return 1;
}

/**
 * 메모리 최적화 수행
 * @param {number} level 최적화 레벨
 * @param {boolean} emergency 긴급 모드 여부
 * @returns {string} JSON 형식의 결과
 */
function optimize_memory(level = 2, emergency = false) {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = getCurrentTimestamp();
  
  // 최대한 메모리 확보 시도
  if (global.gc) {
    global.gc();
  }
  
  // 대용량 객체 초기화로 간접적 GC 촉진
  for (let i = 0; i < 3; i++) {
    const temp = new Array(1000).fill(0);
    temp.length = 0;
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  const freedMemory = Math.max(0, startMemory - endMemory);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
  
  return JSON.stringify({
    success: true,
    optimization_level: level,
    emergency,
    freed_memory: freedMemory,
    freed_mb: freedMB,
    duration: getCurrentTimestamp() - startTime,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * 가비지 컬렉션 강제 수행
 * @returns {string} JSON 형식의 결과
 */
function force_garbage_collection() {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = getCurrentTimestamp();
  
  // 실제 GC 수행
  if (global.gc) {
    global.gc();
  } else {
    // GC 직접 호출이 불가능하면 간접적으로 유도
    const tempObjects = [];
    for (let i = 0; i < 10; i++) {
      tempObjects.push(new Array(10000).fill(0));
    }
    tempObjects.length = 0;
  }
  
  const endMemory = process.memoryUsage().heapUsed;
  const freedMemory = Math.max(0, startMemory - endMemory);
  const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
  
  return JSON.stringify({
    success: true,
    freed_memory: freedMemory,
    freed_mb: freedMB,
    duration: getCurrentTimestamp() - startTime,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * GC 요청 (force_garbage_collection의 별칭)
 */
function request_garbage_collection() {
  return force_garbage_collection();
}

/**
 * GPU 가속 가능 여부 확인
 * @returns {boolean} GPU 가속 가능 여부
 */
function is_gpu_acceleration_available() {
  return false; // 폴백에서는 항상 불가능
}

/**
 * GPU 가속 활성화
 * @returns {boolean} 성공 여부
 */
function enable_gpu_acceleration() {
  state.gpuEnabled = false; // 폴백에서는 활성화 불가
  return false;
}

/**
 * GPU 가속 비활성화
 * @returns {boolean} 성공 여부
 */
function disable_gpu_acceleration() {
  state.gpuEnabled = false;
  return true; // 이미 비활성화 상태이므로 항상 성공
}

/**
 * GPU 정보 가져오기
 * @returns {string} JSON 형식의 GPU 정보
 */
function get_gpu_info() {
  return JSON.stringify({
    success: true,
    name: 'JavaScript Fallback',
    vendor: 'JavaScript',
    driver_info: 'Fallback Implementation',
    device_type: 'Software',
    backend: 'JavaScript',
    available: false,
    acceleration_enabled: state.gpuEnabled,
    timestamp: getCurrentTimestamp()
  });
}

/**
 * GPU 계산 수행
 * @param {Object} data 계산 데이터
 * @param {string} computationType 계산 유형
 * @returns {string} JSON 형식의 결과
 */
function perform_gpu_computation(data, computationType = 'default') {
  return JSON.stringify({
    success: false,
    task_type: computationType,
    duration_ms: 0,
    result: null,
    error: 'GPU 계산을 사용할 수 없습니다 (JavaScript 폴백)',
    timestamp: getCurrentTimestamp()
  });
}

/**
 * 네이티브 모듈 버전 정보 가져오기
 * @returns {string} 버전 정보
 */
function get_native_module_version() {
  return '0.1.0-js-fallback';
}

/**
 * 네이티브 모듈 정보 가져오기
 * @returns {string} JSON 형식의 모듈 정보
 */
function get_native_module_info() {
  const info = {
    name: 'typing-stats-native',
    version: '0.1.0-js-fallback',
    description: 'JavaScript fallback for typing-stats-native',
    features: {
      memory_optimization: true,
      gpu_acceleration: false,
      worker_threads: true
    },
    system: {
      os: process.platform,
      arch: process.arch,
      cpu_cores: os.cpus().length,
      node_version: process.version
    }
  };
  
  return JSON.stringify(info);
}

/**
 * 네이티브 모듈 초기화
 * @returns {boolean} 성공 여부
 */
function initialize_native_modules() {
  state.startTime = Date.now();
  console.log('[JS-Fallback] JavaScript 폴백 모듈이 초기화되었습니다');
  return true;
}

/**
 * 네이티브 모듈 정리
 * @returns {boolean} 성공 여부
 */
function cleanup_native_modules() {
  console.log('[JS-Fallback] JavaScript 폴백 모듈이 정리되었습니다');
  return true;
}

// 모듈 내보내기
module.exports = {
  // 기본 모듈 정보
  get_native_module_version,
  get_native_module_info,
  initialize_native_modules,
  cleanup_native_modules,
  
  // 메모리 관리 함수
  get_memory_info,
  determine_optimization_level,
  optimize_memory,
  force_garbage_collection,
  request_garbage_collection,
  
  // GPU 관련 함수
  is_gpu_acceleration_available,
  enable_gpu_acceleration,
  disable_gpu_acceleration,
  get_gpu_info,
  perform_gpu_computation,
  
  // 상태 확인
  is_native_module_available: () => false
};
`;

  // 파일이 없거나 내용이 다르면 생성
  if (!fs.existsSync(fallbackFilePath)) {
    fs.writeFileSync(fallbackFilePath, fallbackContent, 'utf8');
    console.log(`폴백 모듈 생성됨: ${fallbackFilePath}`);
  } else {
    const existingContent = fs.readFileSync(fallbackFilePath, 'utf8');
    if (existingContent.trim() !== fallbackContent.trim()) {
      fs.writeFileSync(fallbackFilePath, fallbackContent, 'utf8');
      console.log(`폴백 모듈 업데이트됨: ${fallbackFilePath}`);
    } else {
      console.log(`폴백 모듈이 이미 최신 상태임: ${fallbackFilePath}`);
    }
  }
}

function installNativeModules() {
  console.log('네이티브 모듈 설치 시작...');

  try {
    // 네이티브 모듈 디렉토리 확인
    if (!fs.existsSync(nativeModulesDir)) {
      console.log('네이티브 모듈 디렉토리가 존재하지 않습니다. 설치를 건너뜁니다.');
      return;
    }

    // 운영체제 확인
    const isMac = os.platform() === 'darwin';
    const isLinux = os.platform() === 'linux';

    console.log(`플랫폼 감지: ${os.platform()}`);

    // Rust가 설치되어 있는지 확인
    try {
      const rustVersion = execSync('rustc --version', { encoding: 'utf8' });
      console.log(`Rust 확인: ${rustVersion.trim()}`);
    } catch (error) {
      console.error('Rust가 설치되어 있지 않습니다. 네이티브 모듈을 설치할 수 없습니다.');
      console.error('https://www.rust-lang.org/tools/install 에서 Rust를 설치하세요.');
      return;
    }

    // 네이티브 모듈 디렉토리로 이동하여 빌드
    console.log('네이티브 모듈 빌드 중...');
    process.chdir(nativeModulesDir);

    // cargo build 실행
    execSync('cargo build --release', {
      stdio: 'inherit',
      env: {
        ...process.env,
        // 필요한 환경 변수 설정
        RUSTFLAGS: isWindows ? '-C target-feature=+crt-static' : ''
      }
    });

    // 빌드된 라이브러리 파일 복사
    console.log('빌드된 네이티브 모듈 복사 중...');
    const targetDir = path.join(nativeModulesDir, 'target', 'release');
    const libDir = path.join(projectRoot, 'src', 'native-modules');

    // 라이브러리 디렉토리가 존재하는지 확인, 없으면 생성
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    // 플랫폼별 파일 확장자 결정
    const libExt = isWindows ? '.dll' : (isMac ? '.dylib' : '.so');
    const libPrefix = isWindows ? '' : 'lib';
    const libName = `${libPrefix}typing_stats_native${libExt}`;

    // 빌드된 파일 경로
    const srcPath = path.join(targetDir, libName);

    // 파일이 존재하는지 확인
    if (!fs.existsSync(srcPath)) {
      console.error(`빌드된 네이티브 모듈 파일을 찾을 수 없습니다: ${srcPath}`);
      console.log('대상 디렉토리의 파일 목록:');

      try {
        const files = fs.readdirSync(targetDir);
        files.forEach(file => console.log(`- ${file}`));

        // 가능한 다른 이름으로 파일 찾기
        const possibleFiles = files.filter(file =>
          file.includes('typing_stats_native') ||
          file.includes('typing-stats-native')
        );

        if (possibleFiles.length > 0) {
          console.log(`\n가능한 네이티브 모듈 파일: ${possibleFiles.join(', ')}`);
          console.log(`${possibleFiles[0]} 파일 사용 시도...`);

          const alternativeSrcPath = path.join(targetDir, possibleFiles[0]);
          const destPath = path.join(libDir, libName);

          fs.copyFileSync(alternativeSrcPath, destPath);
          console.log(`네이티브 모듈이 ${destPath}에 복사되었습니다.`);
        } else {
          throw new Error('호환되는 네이티브 모듈 파일을 찾을 수 없습니다.');
        }
      } catch (listError) {
        console.error('빌드 디렉토리 탐색 중 오류:', listError);
        throw new Error('네이티브 모듈 파일을 찾을 수 없습니다.');
      }
    } else {
      // 파일이 존재하면 복사
      const destPath = path.join(libDir, libName);
      fs.copyFileSync(srcPath, destPath);
      console.log(`네이티브 모듈이 ${destPath}에 복사되었습니다.`);
    }

    // 인덱스 파일 생성
    const indexPath = path.join(libDir, 'index.js');

    const indexContent = `
// 네이티브 모듈 로더
const path = require('path');

// 플랫폼별 파일 확장자
const extension = {
  'win32': '.dll',
  'darwin': '.dylib',
  'linux': '.so'
}[process.platform];

// 플랫폼별 접두사
const prefix = process.platform === 'win32' ? '' : 'lib';

// 네이티브 모듈 로드
let nativeModule;
try {
  const modulePath = path.join(__dirname, \`\${prefix}typing_stats_native\${extension}\`);
  nativeModule = require(modulePath);
  console.log('네이티브 모듈 로드 성공');
} catch (err) {
  console.error('네이티브 모듈 로드 실패:', err);
  nativeModule = null;
}

module.exports = nativeModule;
`;

    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('인덱스 파일 생성 완료');

    console.log('네이티브 모듈 설치 완료!');

    // 폴백 모듈 생성 추가
    createFallbackModule();

  } catch (error) {
    console.error('네이티브 모듈 설치 중 오류 발생:', error);
    process.exit(1);
  }
}

// 네이티브 모듈 설치 실행
installNativeModules();
