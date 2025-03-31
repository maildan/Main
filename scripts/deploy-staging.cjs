/**
 * 스테이징 환경 배포 스크립트
 * GitHub Actions에서 실행됩니다.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 환경 변수 확인
const deployToken = process.env.DEPLOY_TOKEN;
const stagingUrl = process.env.STAGING_URL;

if (!deployToken || !stagingUrl) {
  console.error('❌ 배포에 필요한 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

console.log('🚀 스테이징 환경 배포 시작...');

try {
  // 배포를 위한 설정 파일 생성
  const deployConfigPath = path.join(process.cwd(), 'deploy-config.json');
  const deployConfig = {
    token: deployToken,
    url: stagingUrl,
    appName: 'typing-stats-app-staging',
    timestamp: new Date().toISOString(),
    environment: 'staging'
  };
  
  fs.writeFileSync(deployConfigPath, JSON.stringify(deployConfig, null, 2), 'utf8');
  console.log('✅ 배포 설정 파일 생성 완료');
  
  // 필요한 패키지 설치
  console.log('📦 배포 도구 설치 중...');
  execSync('npm install --no-save dotenv vercel', { stdio: 'inherit' });
  
  // 배포 실행
  console.log('🔄 배포 실행 중...');
  execSync(`npx vercel --token ${deployToken}`, { stdio: 'inherit' });
  
  // 배포 후 설정 파일 정리
  fs.unlinkSync(deployConfigPath);
  
  console.log('✅ 스테이징 배포 완료!');
  console.log(`🌐 배포된 URL: ${stagingUrl}`);
  
} catch (error) {
  console.error('❌ 배포 중 오류 발생:', error.message);
  process.exit(1);
}
