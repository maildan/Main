/**
 * 스테이징 환경 배포 스크립트
 * GitHub Actions에서 실행됩니다.
 */

try {
  // 필요한 경우에만 dotenv 모듈을 동적으로 로드
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
} catch (err) {
  // dotenv 모듈이 없는 경우 무시
}

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const os = require('os');

// 콘솔 입력을 위한 readline 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 프로미스 기반 질문 함수
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// 임시 디렉토리 생성 함수
function createTempDir() {
  const tempDir = path.join(os.tmpdir(), `vercel-deploy-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

async function main() {
  try {
    console.log('🚀 스테이징 환경 배포 시작...');

    // 임시 디렉토리 생성
    const tempDir = createTempDir();
    console.log(`📁 임시 작업 디렉토리 생성: ${tempDir}`);

    // 환경 변수 확인
    let deployToken = process.env.DEPLOY_TOKEN;
    let stagingUrl = process.env.STAGING_URL;
    
    // 환경 변수가 없으면 사용자에게 입력 요청
    if (!deployToken) {
      console.log('⚠️ DEPLOY_TOKEN 환경 변수가 설정되지 않았습니다.');
      console.log('💡 팁: 환경 변수로 설정하려면 다음 명령어를 사용하세요:');
      console.log('  - Windows: $env:DEPLOY_TOKEN="토큰값"');
      console.log('  - Linux/Mac: export DEPLOY_TOKEN="토큰값"');
      console.log('또는 .env 파일에 DEPLOY_TOKEN=토큰값 형식으로 추가하세요.');
      
      deployToken = await question('배포 토큰을 입력하세요 (Vercel 토큰): ');
      
      if (!deployToken.trim()) {
        console.error('❌ 배포 토큰은 필수입니다.');
        process.exit(1);
      }

      // 사용자에게 토큰 저장 여부 질문
      const saveToken = await question('다음 배포를 위해 토큰을 .env 파일에 저장할까요? (Y/n): ');
      
      if (saveToken.toLowerCase() !== 'n') {
        try {
          const envFilePath = path.resolve(__dirname, '../.env');
          // 기존 .env 파일 내용 읽기
          let envContent = '';
          if (fs.existsSync(envFilePath)) {
            envContent = fs.readFileSync(envFilePath, 'utf8');
          }
          
          // DEPLOY_TOKEN이 이미 있는지 확인
          if (envContent.includes('DEPLOY_TOKEN=')) {
            // 기존 값 업데이트
            envContent = envContent.replace(/DEPLOY_TOKEN=.*/g, `DEPLOY_TOKEN=${deployToken}`);
          } else {
            // 새로운 값 추가 (필요시 줄바꿈 추가)
            if (envContent.length > 0 && !envContent.endsWith('\n')) {
              envContent += '\n';
            }
            envContent += `DEPLOY_TOKEN=${deployToken}\n`;
          }
          
          // 파일에 저장
          fs.writeFileSync(envFilePath, envContent);
          console.log('✅ 토큰이 .env 파일에 저장되었습니다.');
          console.log('⚠️ 주의: .env 파일이 .gitignore에 포함되어 있는지 확인하세요!');
        } catch (error) {
          console.error('❌ .env 파일 저장 중 오류가 발생했습니다:', error.message);
        }
      }
    }
    
    if (!stagingUrl) {
      stagingUrl = await question('스테이징 URL을 입력하세요 (기본값: https://typing-stats-app-staging.vercel.app): ');
      
      if (!stagingUrl.trim()) {
        stagingUrl = 'https://typing-stats-app-staging.vercel.app';
        console.log(`✓ 기본 URL을 사용합니다: ${stagingUrl}`);
      }
    }
    
    // 사용자 확인
    const confirmDeploy = await question(`스테이징 URL(${stagingUrl})로 배포하시겠습니까? (y/N): `);
    
    if (confirmDeploy.toLowerCase() !== 'y') {
      console.log('🛑 배포가 취소되었습니다.');
      process.exit(0);
    }
  
    // 배포를 위한 설정 파일 생성 (임시 디렉토리에)
    const deployConfigPath = path.join(tempDir, 'deploy-config.json');
    const deployConfig = {
      token: deployToken,
      url: stagingUrl,
      appName: 'typing-stats-app-staging',
      timestamp: new Date().toISOString(),
      environment: 'staging'
    };
    
    fs.writeFileSync(deployConfigPath, JSON.stringify(deployConfig, null, 2), 'utf8');
    console.log('✅ 배포 설정 파일 생성 완료');
    
    // 배포 실행 - npx를 사용해 vercel 직접 실행
    console.log('🔄 배포 실행 중...');
    
    // npx로 실행하여 설치 단계 건너뛰기
    try {
      execSync(`npx vercel@latest --token ${deployToken}`, { 
        stdio: 'inherit',
        cwd: process.cwd() // 현재 프로젝트 디렉토리에서 실행
      });
      
      console.log('✅ 스테이징 배포 완료!');
      console.log(`🌐 배포된 URL: ${stagingUrl}`);
    } catch (error) {
      console.error('❌ vercel 실행 중 오류가 발생했습니다:', error.message);
      console.log('\n💡 대체 방법을 시도합니다...');
      
      try {
        // 대체 방법: 글로벌 vercel 사용 시도
        execSync(`vercel --token ${deployToken}`, { 
          stdio: 'inherit',
          cwd: process.cwd() 
        });
        console.log('✅ 스테이징 배포 완료!');
      } catch (secondError) {
        console.error('❌ 모든 배포 시도가 실패했습니다. Vercel CLI를 전역으로 설치해 보세요:');
        console.log('npm install -g vercel');
        process.exit(1);
      }
    }
    
    // 배포 후 임시 설정 파일 정리
    try {
      fs.unlinkSync(deployConfigPath);
      fs.rmdirSync(tempDir, { recursive: true });
    } catch (cleanupError) {
      // 임시 파일 삭제 실패는 배포에 영향 없음
      console.log('⚠️ 임시 파일 정리 중 오류가 발생했습니다.');
    }
    
  } catch (error) {
    console.error('❌ 배포 중 오류 발생:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
