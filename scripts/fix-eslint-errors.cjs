const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('🔍 ESLint 오류 자동 수정 시작...');
    
    // ESLint 실행 결과를 저장할 파일
    const eslintResultsDir = path.join(process.cwd(), '.eslint-cache');
    const eslintResultsPath = path.join(eslintResultsDir, 'auto-fix-results.json');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(eslintResultsDir)) {
      fs.mkdirSync(eslintResultsDir, { recursive: true });
    }
    
    // 자동 수정 가능한 ESLint 오류 수정
    try {
      console.log('✅ 자동 수정 가능한 ESLint 오류 수정 중...');
      // ESLint 9.x와 호환되는 명령어 사용
      execSync('npx eslint --cache --fix --config eslint.config.mjs "src/**/*.{js,jsx,ts,tsx}" --format json --no-error-on-unmatched-pattern > ' + eslintResultsPath, { stdio: 'inherit' });
    } catch (error) {
      // ESLint 오류가 있어도 실행은 계속
      console.log('⚠️ ESLint 오류가 감지되었습니다. 자동으로 수정 가능한 부분을 수정합니다.');
      
      if (!fs.existsSync(eslintResultsPath)) {
        fs.writeFileSync(eslintResultsPath, '[]', 'utf8');
        console.log('⚠️ ESLint 결과 파일이 생성되지 않아 빈 결과를 사용합니다.');
      }
    }
    
    console.log('✅ 자동 수정 가능한 ESLint 오류 수정 완료');
    console.log('');
    console.log('남아있는 오류는 ESLint 보고서와 VS Code 에디터를 통해 확인하세요.');
    
    // 추가 필요한 오류 수정 코드를 여기에 구현할 수 있습니다.
    
  } catch (error) {
    console.error('ESLint 오류 수정 중 문제가 발생했습니다:', error);
    process.exit(1);
  }
})();
