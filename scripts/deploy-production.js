try {
  // 필요한 경우에만 dotenv 모듈을 동적으로 로드
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
} catch (err) {
  // dotenv 모듈이 없는 경우 무시
}

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

// 터미널 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// .env 파일 경로
const envFilePath = path.resolve(__dirname, '../.env');

// 임시 디렉토리 생성 함수
function createTempDir() {
  const tempDir = path.join(os.tmpdir(), `vercel-deploy-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

async function deployProduction() {
  console.log('🚀 프로덕션 환경 배포 시작...');
  
  // 임시 디렉토리 생성
  const tempDir = createTempDir();
  console.log(`📁 임시 작업 디렉토리 생성: ${tempDir}`);
  
  // 환경 변수에서 토큰 확인
  let deployToken = process.env.DEPLOY_TOKEN;
  let productionUrl = process.env.PRODUCTION_URL;

  if (!deployToken) {
    console.log('⚠️ DEPLOY_TOKEN 환경 변수가 설정되지 않았습니다.');
    console.log('💡 팁: 환경 변수로 설정하려면 다음 명령어를 사용하세요:');
    console.log('  - Windows: $env:DEPLOY_TOKEN="토큰값"');
    console.log('  - Linux/Mac: export DEPLOY_TOKEN="토큰값"');
    console.log('또는 .env 파일에 DEPLOY_TOKEN=토큰값 형식으로 추가하세요.');
    
    // 사용자에게 토큰 입력 요청
    deployToken = await new Promise(resolve => {
      rl.question('배포 토큰을 입력하세요 (Vercel 토큰): ', (token) => {
        resolve(token.trim());
      });
    });
    
    if (!deployToken) {
      console.log('❌ 토큰이 입력되지 않았습니다. 배포를 취소합니다.');
      rl.close();
      return;
    }
    
    // 사용자에게 토큰 저장 여부 질문
    const saveToken = await new Promise(resolve => {
      rl.question('다음 배포를 위해 토큰을 .env 파일에 저장할까요? (Y/n): ', (answer) => {
        resolve(answer.toLowerCase() !== 'n');
      });
    });
    
    if (saveToken) {
      try {
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

  if (!productionUrl) {
    productionUrl = await new Promise(resolve => {
      rl.question('프로덕션 URL을 입력하세요 (기본값: https://typing-stats-app.vercel.app): ', (url) => {
        resolve(url.trim() || 'https://typing-stats-app.vercel.app');
      });
    });
    console.log(`✓ 프로덕션 URL: ${productionUrl}`);
  }
  
  // 사용자 확인
  const confirmDeploy = await new Promise(resolve => {
    rl.question(`프로덕션 URL(${productionUrl})로 배포하시겠습니까? (y/N): `, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
  
  if (confirmDeploy !== 'y') {
    console.log('🛑 배포가 취소되었습니다.');
    rl.close();
    return;
  }

  // 실제 배포 작업 수행
  try {
    console.log('🔄 배포 진행 중...');
    
    // 현재 브랜치 확인
    let currentBranch;
    try {
      currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      console.log(`ℹ️ 현재 Git 브랜치: ${currentBranch}`);
    } catch (gitError) {
      console.warn('⚠️ Git 브랜치를 확인할 수 없습니다:', gitError.message);
      currentBranch = 'unknown';
    }
    
    // 프로젝트 이름이 올바르게 설정되어 있는지 확인
    const projectName = 'typing-stats-app'; // 사용자의 프로젝트 이름으로 수정
    
    // npx로 Vercel 실행하여 설치 문제 회피
    try {
      // 현재 브랜치를 명시적으로 지정하여 배포
      console.log(`🔗 도메인 연결 확인: ${productionUrl}`);
      console.log(`📤 ${currentBranch} 브랜치에서 프로덕션 환경으로 배포합니다...`);
      
      execSync(`npx vercel@latest --prod --yes --token=${deployToken}`, { 
        stdio: 'inherit',
        cwd: process.cwd() // 현재 프로젝트 디렉토리에서 실행
      });
      
      // 도메인 연결 시도 - 프로젝트 ID를 사용하도록 변경
      try {
        console.log(`✅ 배포가 완료되었습니다. 도메인 연결을 확인합니다...`);
        
        // 프로젝트 ID 가져오기
        const vercelProjectId = process.env.VERCEL_PROJECT_ID;
        const vercelOrgId = process.env.VERCEL_ORG_ID;
        
        if (vercelProjectId && vercelOrgId) {
          // 도메인 조회 먼저 실행
          console.log(`🔍 현재 연결된 도메인 확인 중...`);
          try {
            const domainsOutput = execSync(`npx vercel domains ls --token=${deployToken}`, {
              encoding: 'utf8',
              stdio: 'pipe',
            });
            console.log('\n현재 연결된 도메인 목록:');
            console.log(domainsOutput);
          } catch (domainsError) {
            console.log(`⚠️ 도메인 목록 조회 중 오류가 발생했습니다.`);
          }
          
          // 프로젝트 ID를 사용한 도메인 연결 방법
          console.log(`🌐 도메인 ${productionUrl}을(를) 연결합니다...`);
          execSync(`npx vercel domains add ${productionUrl} --scope ${vercelOrgId} --token=${deployToken} --yes`, {
            stdio: 'inherit',
            cwd: process.cwd()
          });
          
          // 도메인 검증 및 결과 확인
          console.log(`🔍 도메인 검증 중...`);
          const verifyOutput = execSync(`npx vercel domains verify ${productionUrl} --token=${deployToken}`, {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: process.cwd()
          });
          
          console.log('\n도메인 검증 결과:');
          console.log(verifyOutput);
          
          // DNS 설정 확인
          console.log(`🔍 도메인 DNS 설정 확인 중...`);
          try {
            const dnsOutput = execSync(`npx vercel domains inspect ${productionUrl} --token=${deployToken}`, {
              encoding: 'utf8',
              stdio: 'pipe',
            });
            console.log('\nDNS 설정 정보:');
            console.log(dnsOutput);
          } catch (dnsError) {
            console.log(`⚠️ DNS 정보 조회 중 오류가 발생했습니다.`);
          }
        } else {
          console.log(`⚠️ VERCEL_PROJECT_ID 또는 VERCEL_ORG_ID가 설정되지 않아 도메인을 자동으로 연결할 수 없습니다.`);
          console.log(`💡 Vercel 대시보드에서 직접 도메인을 연결하세요.`);
        }
      } catch (domainError) {
        console.log(`ℹ️ 도메인 연결 중 오류가 발생했습니다. 이미 연결되어 있거나 권한이 없을 수 있습니다.`);
        console.log(`💡 Vercel 대시보드에서 직접 도메인을 연결하는 것을 시도해보세요.`);
        console.log(`   https://vercel.com/dashboard/domains`);
        console.log(`\n💡 DNS 설정 가이드:`);
        console.log(`   1. A 레코드: 76.76.21.21`);
        console.log(`   2. CNAME 레코드: cname.vercel-dns.com`);
      }
      
      console.log('✅ 배포가 성공적으로 완료되었습니다!');
    } catch (error) {
      console.error('❌ npx vercel 실행 중 오류가 발생했습니다:', error.message);
      console.log('\n💡 대체 방법을 시도합니다...');
      
      try {
        // 대체 방법: 글로벌 vercel 사용 시도
        execSync(`vercel --prod --token=${deployToken}`, { 
          stdio: 'inherit',
          cwd: process.cwd() 
        });
        console.log('✅ 배포가 성공적으로 완료되었습니다!');
      } catch (secondError) {
        console.error('❌ 모든 배포 시도가 실패했습니다. Vercel CLI를 전역으로 설치해 보세요:');
        console.log('npm install -g vercel');
        throw new Error('배포 실패');
      }
    }
  } catch (error) {
    console.error('❌ 배포 중 오류가 발생했습니다:', error.message);
  } finally {
    // 임시 디렉토리 정리
    try {
      fs.rmdirSync(tempDir, { recursive: true });
    } catch (cleanupError) {
      // 임시 파일 삭제 실패는 배포에 영향 없음
    }
    rl.close();
  }
}

deployProduction();
