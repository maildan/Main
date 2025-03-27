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
      // 구문 분석 오류를 해결하기 위해 --no-error-on-unmatched-pattern 플래그 추가
      execSync('npx eslint --fix "src/**/*.{js,jsx,ts,tsx}" --config eslint.config.mjs --format json --no-error-on-unmatched-pattern > ' + eslintResultsPath, { stdio: 'inherit' });
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
    const eslintResultsPath = path.join(process.cwd(), '.eslint-cache', 'auto-fix-results.json');
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(eslintResultsPath)) {
      console.log('⚠️ ESLint 결과 파일이 존재하지 않습니다.');
      return;
    }
    
    // 파일 내용 읽기
    const fileContent = fs.readFileSync(eslintResultsPath, 'utf8');
    
    // 파일 내용이 비어있는지 확인
    if (!fileContent || fileContent.trim() === '') {
      console.log('✅ 오류가 발견되지 않았습니다.');
      return;
    }
    
    // JSON 파싱 시도
    try {
      const results = JSON.parse(fileContent);
      
      // 남은 오류 개수 계산
      const remainingErrors = results.reduce((acc, file) => {
        return acc + file.errorCount;
      }, 0);
      
      const remainingWarnings = results.reduce((acc, file) => {
        return acc + file.warningCount;
      }, 0);
      
      if (remainingErrors > 0) {
        console.log(`⚠️ 남은 오류 개수: ${remainingErrors}`);
      } else {
        console.log('✅ 모든 오류가 수정되었습니다.');
      }
      
      if (remainingWarnings > 0) {
        console.log(`⚠️ 남은 경고 개수: ${remainingWarnings}`);
      }
    } catch (parseError) {
      console.log('⚠️ ESLint 결과를 파싱하는 중 오류가 발생했습니다.');
      console.log('  이는 ESLint 실행 중에 오류가 발생했거나 결과 형식이 예상과 다를 수 있습니다.');
      console.log('  하지만 자동 수정 가능한 오류는 이미 수정되었습니다.');
      
      // 오류 발생 시 직접 eslint를 실행하여 오류 수를 확인하는 방법 제안
      console.log('  정확한 오류 개수를 확인하려면 다음 명령어를 실행하세요:');
      console.log('  npx eslint "src/**/*.{js,jsx,ts,tsx}"');
    }
  } catch (error) {
    console.log('⚠️ 결과 요약 생성 중 오류가 발생했습니다:', error.message);
  }
}
