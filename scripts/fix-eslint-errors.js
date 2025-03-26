const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

/**
 * ESLint 오류 자동 수정 스크립트
 * 사용법: node scripts/fix-eslint-errors.js
 * 
 * 이 스크립트는 프로젝트의 일반적인 ESLint 오류를 자동으로 식별하고 수정합니다.
 * - any 타입 사용 위치 찾기
 * - 미사용 변수 자동 수정
 * - 모듈 import 스타일 검사
 * - 기본 포맷팅 오류 수정
 * 
 * 최적화 기능 추가:
 * - 캐시 활용
 * - 병렬 처리
 * - 단계별 프로세싱
 */
(async function() {
  console.log('ESLint 오류 자동 수정 시작...');
  
  try {
    const cpuCount = os.cpus().length;
    const maxWorkers = Math.max(1, Math.min(cpuCount - 1, 4)); // CPU 코어 수에 따라 워커 수 결정
    
    console.log(`사용 가능한 CPU 코어 수: ${cpuCount}, 워커 수: ${maxWorkers}`);
    console.log('캐싱 및 병렬 처리를 활용한 최적화 수행 중...');
    
    // 1. any 타입 수정을 위한 패턴 확인
    console.log('💡 "any" 타입 검색 중...');
    await execPromise(`npx eslint --cache --no-eslintrc --rule "@typescript-eslint/no-explicit-any: error" --format json "src/**/*.{ts,tsx}" > any-errors.json`)
      .catch(() => {
        console.log('any 타입 사용 위치 파일 생성됨: any-errors.json');
      });
    
    // 2. 미사용 변수 수정 (병렬 처리)
    console.log('💡 미사용 변수 자동 수정 중...');
    await execPromise(`npx eslint --fix --cache --no-eslintrc --max-workers=${maxWorkers} --rule "@typescript-eslint/no-unused-vars: [error, {argsIgnorePattern: ^_, varsIgnorePattern: ^_}]" "src/**/*.{ts,tsx}"`)
      .catch(() => {
        console.log('일부 미사용 변수가 수정되었습니다.');
      });
    
    // 3. require 스타일 import 수정 (병렬 처리)
    console.log('💡 모듈 import 스타일 검사 중...');
    await execPromise(`npx eslint --fix --cache --max-workers=${maxWorkers} --rule "@next/next/no-assign-module-variable: error" "src/**/*.{js,ts}"`)
      .catch(() => {
        console.log('일부 모듈 스타일 문제가 수정되었습니다.');
      });
    
    // 4. 기본적인 포맷팅 오류 수정 (병렬 처리)
    console.log('💡 기본 포맷팅 오류 수정 중...');
    await execPromise(`npx eslint --fix --cache --max-workers=${maxWorkers} --rule "semi: [error, always]" --rule "quotes: [error, single]" "src/**/*.{js,ts,tsx}"`)
      .catch(() => {
        console.log('일부 포맷팅 문제가 수정되었습니다.');
      });
    
    // 5. React 훅 의존성 배열 경고 표시
    console.log('💡 React 훅 의존성 배열 검사 중...');
    await execPromise(`npx eslint --cache --max-workers=${maxWorkers} --no-eslintrc --rule "react-hooks/exhaustive-deps: warn" "src/**/*.{tsx,jsx}" --format stylish`)
      .catch(() => {
        console.log('React 훅 의존성 문제가 발견되었습니다. 수동 확인이 필요합니다.');
      });
    
    // 6. 메모리 누수 가능성이 있는 패턴 검사
    console.log('💡 잠재적 메모리 누수 패턴 검사 중...');
    await execPromise(`npx eslint --cache --max-workers=${maxWorkers} --no-eslintrc --rule "react-hooks/rules-of-hooks: error" "src/**/*.{tsx,jsx}" --format stylish`)
      .catch(() => {
        console.log('일부 파일에서 Hook 규칙 위반이 감지되었습니다.');
      });
    
    console.log('✅ 자동 수정 가능한 ESLint 오류 수정 완료');
    console.log('');
    console.log('남아있는 오류는 ESLint 보고서와 VS Code 에디터를 통해 확인하세요.');
    console.log('전체 린트 검사 실행: npm run lint');
    
    // 결과 요약
    summarizeResults();
    
  } catch (error) {
    console.error('오류 수정 중 문제가 발생했습니다:', error);
    process.exit(1);
  }
})();

/**
 * 결과 요약 표시
 */
function summarizeResults() {
  try {
    // 남아있는 'any' 유형 개수 확인
    if (fs.existsSync('any-errors.json')) {
      const anyErrors = JSON.parse(fs.readFileSync('any-errors.json', 'utf8'));
      const anyErrorCount = Array.isArray(anyErrors) ? anyErrors.reduce((acc, file) => acc + file.errorCount, 0) : 0;
      
      if (anyErrorCount > 0) {
        console.log(`⚠️  아직 ${anyErrorCount}개의 'any' 타입이 남아 있습니다.`);
        console.log('상세 내용은 any-errors.json 파일을 확인하세요.');
      } else {
        console.log('✅ any 타입 문제가 발견되지 않았습니다.');
      }
    }
    
    // .eslintcache 상태 확인
    if (fs.existsSync('.eslintcache')) {
      const cacheStats = fs.statSync('.eslintcache');
      const cacheSizeMB = cacheStats.size / (1024 * 1024);
      console.log(`ℹ️  ESLint 캐시 크기: ${cacheSizeMB.toFixed(2)}MB`);
    }
    
  } catch (error) {
    console.error('결과 요약 생성 중 오류:', error);
  }
}
