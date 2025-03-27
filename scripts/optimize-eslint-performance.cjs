const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * ESLint 성능 최적화 스크립트
 * 
 * 이 스크립트는 ESLint 실행 성능을 최적화하기 위한 작업을 수행합니다:
 * - 캐시 파일 정리 (필요시)
 * - ESLint 설정 파일 검증
 * - 성능 테스트
 * 
 * ESLint 9.x와 호환됩니다.
 */
async function optimizeESLintPerformance() {
  console.log('ESLint 성능 최적화 시작...');
  
  try {
    // 1. 캐시 크기 확인 및 필요시 정리
    if (fs.existsSync('.eslintcache')) {
      const cacheStats = fs.statSync('.eslintcache');
      const cacheSizeMB = cacheStats.size / (1024 * 1024);
      
      console.log(`현재 ESLint 캐시 크기: ${cacheSizeMB.toFixed(2)}MB`);
      
      if (cacheSizeMB > 10) {
        console.log('캐시 크기가 10MB를 넘어 정리합니다...');
        fs.unlinkSync('.eslintcache');
        console.log('캐시 파일이 정리되었습니다.');
      }
    }
    
    // 2. ESLint 설정 파일 확인
    const eslintConfigPath = path.join(process.cwd(), 'eslint.config.mjs');
    if (!fs.existsSync(eslintConfigPath)) {
      console.error('eslint.config.mjs 파일을 찾을 수 없습니다. setup-eslint.cjs 스크립트를 실행하세요.');
      return;
    }
    
    // 3. ESLint 설정 확인
    console.log('ESLint 설정 파일 검증 중...');
    try {
      // ESLint 9.x 호환 검증 방식 사용
      await execPromise('npx eslint --config eslint.config.mjs --print-config src/app/page.tsx');
      console.log('ESLint 설정이 유효합니다.');
    } catch (error) {
      console.error('ESLint 설정에 문제가 있을 수 있습니다:', error.message);
      console.log('fix:eslint-config 스크립트를 실행하여 문제를 해결해 보세요.');
    }
    
    // 4. 성능 테스트 실행
    console.log('\nESLint 성능 테스트 실행 중...');
    console.time('ESLint 성능 테스트');
    try {
      const { stdout } = await execPromise('npx eslint --config eslint.config.mjs --no-ignore "src/app/page.tsx" --no-fix');
      console.timeEnd('ESLint 성능 테스트');
      console.log('테스트 완료! 출력의 일부:');
      console.log(stdout.slice(0, 300) + (stdout.length > 300 ? '...' : ''));
    } catch (error) {
      console.timeEnd('ESLint 성능 테스트');
      console.log('성능 테스트 중 오류가 발생했지만 측정은 계속됩니다.');
    }
    
    // 5. 최적화 제안
    console.log('\n성능 최적화 제안:');
    console.log('1. eslint.config.mjs에서 필요하지 않은 플러그인을 제거하세요.');
    console.log('2. ignores 규칙을 사용하여 불필요한 파일을 검사에서 제외하세요.');
    console.log('3. --cache 옵션을 사용하여 변경된 파일만 검사하세요.');
    console.log('4. 핵심 파일만 포함하는 별도의 린트 스크립트를 만드세요.');
    
  } catch (error) {
    console.error('성능 최적화 중 오류가 발생했습니다:', error);
  }
}

optimizeESLintPerformance();
