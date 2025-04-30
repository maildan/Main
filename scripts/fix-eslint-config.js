const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * ESLint 설정 수정 스크립트
 * ESLint 9.x 이상 버전에서의 호환성 문제 해결
 */
function fixEslintConfig() {
  console.log('🔧 ESLint 설정 수정 스크립트 시작');

  try {
    // 1. .eslintrc.js 백업 (만약 존재한다면)
    const eslintRcPath = path.join(process.cwd(), '.eslintrc.js');
    if (fs.existsSync(eslintRcPath)) {
      const backupPath = path.join(process.cwd(), '.eslintrc.js.bak');
      fs.copyFileSync(eslintRcPath, backupPath);
      console.log('✅ .eslintrc.js 파일 백업 완료');
    }

    // 2. .eslintignore 내용을 eslint.config.mjs로 이전
    const eslintIgnorePath = path.join(process.cwd(), '.eslintignore');
    if (fs.existsSync(eslintIgnorePath)) {
      console.log('🔍 .eslintignore 파일 내용을 eslint.config.mjs로 이전 중...');
      
      // 기존 파일 백업
      const backupPath = path.join(process.cwd(), '.eslintignore.bak');
      fs.copyFileSync(eslintIgnorePath, backupPath);
      
      // eslint.config.mjs 읽기
      const eslintConfigPath = path.join(process.cwd(), 'eslint.config.mjs');
      if (!fs.existsSync(eslintConfigPath)) {
        console.error('❌ eslint.config.mjs 파일을 찾을 수 없습니다.');
        return;
      }
      
      // .eslintignore 내용 읽기
      const ignoreContent = fs.readFileSync(eslintIgnorePath, 'utf8');
      const ignorePatterns = ignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      // 기존 디렉토리에 추가
      ignorePatterns.push('logs/');
      
      console.log('✅ .eslintignore 파일 이전 완료');
    }

    // 3. package.json 스크립트 의존성 확인 및 필요한 패키지 설치
    console.log('🔍 의존성 확인 중...');
    try {
      execSync('npm list eslint', { stdio: 'ignore' });
    } catch (e) {
      console.log('⚠️ ESLint 패키지 설치가 필요합니다.');
      execSync('npm install eslint@9.23.0 --save-dev', { stdio: 'inherit' });
    }

    console.log('✅ ESLint 설정 수정 완료');
    console.log('👉 이제 `npm run lint` 또는 `npm run lint:fix` 명령을 실행해보세요.');

  } catch (error) {
    console.error('❌ ESLint 설정 수정 중 오류가 발생했습니다:', error);
  }
}

fixEslintConfig();
