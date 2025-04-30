import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// __dirname 대체 (ES 모듈에서는 __dirname이 없음)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설치 경로 설정
const projectRoot = path.resolve(__dirname, '..');
const nativeModulesDir = path.join(projectRoot, 'native-modules');

/**
 * 네이티브 모듈 설치 함수
 */
function installNativeModules() {
  console.log('네이티브 모듈 설치 시작...');

  try {
    // 모듈이 이미 존재하는지 확인
    function checkNativeModule() {
      const releaseModulePath = path.join(__dirname, '../native-modules/target/release/typing_stats_native.node');
      const debugModulePath = path.join(__dirname, '../native-modules/target/debug/typing_stats_native.node');
      
      const releaseExists = fs.existsSync(releaseModulePath);
      const debugExists = fs.existsSync(debugModulePath);
      
      return { releaseExists, debugExists };
    }

    // 폴백 모듈 경로 확인 및 생성
    function ensureFallbackModule() {
      const fallbackDir = path.join(__dirname, '../src/server/native/fallback');
      const fallbackFile = path.join(fallbackDir, 'index.js');
      
      // 폴백 디렉토리가 없으면 생성
      if (!fs.existsSync(fallbackDir)) {
        console.log('폴백 모듈 디렉토리 생성...');
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      
      // 폴백 파일이 없으면 기본 구현 생성
      if (!fs.existsSync(fallbackFile)) {
        console.log('기본 폴백 모듈 생성...');
        const fallbackContent = `
          /**
           * 네이티브 모듈 폴백 구현
           * 네이티브 모듈을 로드할 수 없을 때 기본적인 기능을 제공합니다.
           */
          
          function getCurrentTimestamp() {
            return Date.now();
          }
          
          function get_memory_info() {
            const memoryUsage = process.memoryUsage();
            return JSON.stringify({
              success: true,
              timestamp: getCurrentTimestamp(),
              heap_used: memoryUsage.heapUsed,
              heap_total: memoryUsage.heapTotal,
              heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
              percent_used: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
              error: null
            });
          }
          
          function force_garbage_collection() {
            return JSON.stringify({
              success: false,
              timestamp: getCurrentTimestamp(),
              freed_memory: 0,
              freed_mb: 0,
              error: "가비지 컬렉션을 직접 호출할 수 없습니다"
            });
          }
          
          function optimize_memory() {
            return JSON.stringify({
              success: false,
              timestamp: getCurrentTimestamp(),
              error: "메모리 최적화 기능을 사용할 수 없습니다"
            });
          }
          
          module.exports = {
            get_memory_info,
            force_garbage_collection,
            optimize_memory
          };
        `;
        
        fs.writeFileSync(fallbackFile, fallbackContent.trim());
      }
    }

    // Cargo 설치 확인
    function checkCargoInstalled() {
      try {
        const output = execSync('cargo --version', { encoding: 'utf8' });
        console.log('Cargo 버전:', output.trim());
        return true;
      } catch (error) {
        console.error('Cargo가 설치되어 있지 않습니다.');
        return false;
      }
    }

    // 네이티브 모듈 빌드
    function buildNativeModule() {
      try {
        console.log('네이티브 모듈 빌드 중...');
        // 현재 작업 디렉토리 변경
        process.chdir(path.join(__dirname, '../native-modules'));
        
        // 릴리즈 모드로 빌드
        execSync('cargo build --release', { stdio: 'inherit' });
        console.log('네이티브 모듈 빌드 완료');
        return true;
      } catch (error) {
        console.error('네이티브 모듈 빌드 실패:', error.message);
        return false;
      }
    }

    // 메인 함수
    async function main() {
      console.log('네이티브 모듈 설치를 시작합니다...');
      
      // 폴백 모듈 확인 및 생성
      ensureFallbackModule();
      
      // 이미 빌드된 모듈 확인
      const { releaseExists, debugExists } = checkNativeModule();
      
      if (releaseExists) {
        console.log('릴리즈 모드 네이티브 모듈이 이미 존재합니다.');
        return;
      }
      
      if (debugExists) {
        console.log('디버그 모드 네이티브 모듈이 이미 존재합니다.');
        return;
      }
      
      // Cargo 설치 확인
      if (!checkCargoInstalled()) {
        console.log('빌드를 건너뜁니다. 폴백 모듈을 사용합니다.');
        return;
      }
      
      // 네이티브 모듈 빌드
      const buildSuccess = buildNativeModule();
      
      if (buildSuccess) {
        console.log('네이티브 모듈 설치가 완료되었습니다.');
      } else {
        console.log('네이티브 모듈 빌드에 실패했습니다. 폴백 모듈을 사용합니다.');
      }
    }

    // 스크립트 실행
    main().catch(error => {
      console.error('설치 중 오류 발생:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('네이티브 모듈 설치 중 오류 발생:', error);
    process.exit(1);
  }
}

// 네이티브 모듈 설치 실행
installNativeModules();
