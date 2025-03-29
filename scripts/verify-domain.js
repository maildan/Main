/**
 * 도메인 소유권 확인 및 설정 스크립트
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 환경 변수 로드
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
} catch (err) {
  // dotenv 모듈이 없는 경우 무시
}

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

async function verifyDomain() {
  try {
    console.log('🔍 도메인 확인 및 설정 도구 실행 중...\n');
    
    // 도메인 정보
    let domain = process.env.PRODUCTION_URL;
    if (!domain) {
      domain = await question('연결할 도메인을 입력하세요 (예: example.com): ');
      if (!domain) {
        console.log('❌ 도메인을 입력하지 않았습니다. 종료합니다.');
        return;
      }
    }
    
    console.log(`\n도메인: ${domain}\n`);
    console.log(`도메인 소유권을 증명하고 설정하려면 다음 단계를 따르세요:\n`);
    
    // 1. Vercel 프로젝트 정보 확인
    console.log('1️⃣ Vercel 프로젝트 정보 확인 중...');
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    const vercelOrgId = process.env.VERCEL_ORG_ID;
    
    if (!vercelProjectId || !vercelOrgId) {
      console.log('⚠️ VERCEL_PROJECT_ID 또는 VERCEL_ORG_ID가 설정되지 않았습니다.');
      console.log('💡 vercel link 명령을 실행하여 프로젝트를 연결하세요.');
      return;
    }
    
    console.log(`✓ 프로젝트 정보 확인됨: ${vercelOrgId}/${vercelProjectId}\n`);

    // 2. 현재 프로젝트 조회
    try {
      console.log('2️⃣ 현재 프로젝트 정보 조회 중...');
      const projectInfo = execSync('vercel project ls', { encoding: 'utf8' });
      console.log(projectInfo);
    } catch (error) {
      console.warn('⚠️ 프로젝트 조회 실패:', error.message);
    }
    
    // 3. 소유권 확인 방법 안내
    console.log('3️⃣ 도메인 소유권 확인 방법:');
    
    console.log('\n방법 1: DNS 레코드 추가');
    console.log('다음 DNS 레코드를 도메인 제공업체 대시보드에서 추가하세요:');
    console.log('- A 레코드: @ → 76.76.21.21');
    console.log('- CNAME 레코드: www → cname.vercel-dns.com\n');

    // 4. 수동으로 웹 대시보드에서 추가하는 방법 안내
    console.log('\n방법 2: Vercel 웹 대시보드에서 도메인 추가');
    console.log('1. https://vercel.com/dashboard 에 로그인하세요');
    console.log('2. 해당 프로젝트를 선택하세요');
    console.log('3. "Settings" > "Domains" 섹션으로 이동하세요');
    console.log('4. "Add" 버튼을 클릭하고 도메인을 추가하세요');
    console.log('5. 제시된 DNS 설정을 따르세요\n');
    
    // 5. 도메인 확인 방법 (CLI)
    console.log('\n방법 3: 명령줄에서 다음 명령을 실행하여 도메인 추가를 시도하세요:');
    console.log(`vercel domains add ${domain} --force`);
    
    // 6. 도메인 추가 자동 시도 확인
    const tryCommand = await question('\n명령줄에서 도메인 추가를 자동으로 시도할까요? (y/N): ');
    
    if (tryCommand.toLowerCase() === 'y') {
      try {
        console.log(`\n🔄 도메인 추가 시도 중: ${domain}...`);
        // --force 옵션을 추가하여 소유권 확인을 강제합니다
        execSync(`vercel domains add ${domain} --force`, { stdio: 'inherit' });
        console.log('✅ 도메인 추가 요청이 완료되었습니다.');
        
        // 도메인 인증 상태 확인
        console.log('\n🔍 도메인 인증 상태 확인 중...');
        execSync(`vercel domains inspect ${domain}`, { stdio: 'inherit' });
      } catch (error) {
        console.error('\n❌ 도메인 추가 중 오류가 발생했습니다:', error.message);
        console.log('\n💡 --force 옵션을 사용해도 실패한 경우, Vercel 웹 대시보드를 통해 직접 추가하는 것이 좋습니다.');
      }
    }
    
    // 7. kro.kr 도메인 특별 안내
    if (domain.endsWith('kro.kr')) {
      console.log('\n🔍 kro.kr 도메인 특별 안내:');
      console.log('- kro.kr은 무료 도메인으로, DNS 설정이 제한적일 수 있습니다');
      console.log('- https://domain.kro.kr/ 에서 다음과 같이 설정하세요:');
      console.log('  1. A 레코드: 76.76.21.21');
      console.log('  2. CNAME 레코드: "www"를 "cname.vercel-dns.com"으로 설정');
      console.log('- 일부 무료 DNS 제공업체는 Vercel의 도메인 확인 방식을 지원하지 않을 수 있습니다');
      console.log('- 이 경우, 대안으로 Vercel 기본 도메인(your-project.vercel.app)을 사용하는 것도 고려해보세요');
    }
    
    console.log('\n✅ 도메인 설정 가이드가 완료되었습니다.');
    console.log('💡 도메인 설정 후 DNS 전파에는 최대 48시간이 걸릴 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 도메인 확인 중 오류가 발생했습니다:', error);
  } finally {
    rl.close();
  }
}

verifyDomain();
