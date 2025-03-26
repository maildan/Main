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
 * - 불필요한 파일 제외 설정 (.eslintignore 최적화)
 * - ESLint 설정 파일 검증
 * - 성능 테스트
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
    
    // 2. .eslintignore 파일 확인 및 최적화
    const eslintIgnorePath = path.join(process.cwd(), '.eslintignore');
    const requiredIgnoreEntries = [
      'node_modules/',
      '.next/',
      'out/',
      'dist/',
      'build/',
      '*.config.js',
      '*.config.mjs',
      'public/',
      'coverage/',
      '*.json',
      '*.lock'
    ];
    
    let ignoreContent = '';
    let needsUpdate = false;
    
    if (fs.existsSync(eslintIgnorePath)) {
      ignoreContent = fs.readFileSync(eslintIgnorePath, 'utf8');
      for (const entry of requiredIgnoreEntries) {
        if (!ignoreContent.includes(entry)) {
          ignoreContent += `\n${entry}`;
          needsUpdate = true;
        }
      }
    } else {
      ignoreContent = requiredIgnoreEntries.join('\n');
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      fs.writeFileSync(eslintIgnorePath, ignoreContent.trim(), 'utf8');
      console.log('.eslintignore 파일이 최적화되었습니다.');
    } else {
      console.log('.eslintignore 파일이 이미 최적화되어 있습니다.');
    }
    
    // 3. ESLint 설정 확인
    console.log('ESLint 설정 파일 검증 중...');
    try {
      await execPromise('npx eslint --print-config src/app/page.tsx');
      console.log('ESLint 설정이 유효합니다.');
    } catch (error) {
      console.error('ESLint 설정에 문제가 있을 수 있습니다:', error.message);
    }
    
    // 4. 성능 벤치마킹
    console.log('ESLint 성능 테스트 실행 중...');
    const startTime = Date.now();
    
    try {
      await execPromise('npx eslint --cache src/app/page.tsx');
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`성능 테스트 완료: ${duration.toFixed(2)}초`);
      
      if (duration > 5) {
        console.log('⚠️ 성능이 느립니다. 추가 최적화가 필요할 수 있습니다.');
        console.log('팁: 불필요한 플러그인이나 규칙을 비활성화하여 성능을 개선할 수 있습니다.');
      } else {
        console.log('✅ 성능이 양호합니다.');
      }
    } catch (error) {
      console.error('성능 테스트 실패:', error.message);
    }
    
    console.log('ESLint 성능 최적화 완료!');
    
  } catch (error) {
    console.error('ESLint 성능 최적화 중 오류 발생:', error);
  }
}

optimizeESLintPerformance();
