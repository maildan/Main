/**
 * 브랜치 병합 스크립트
 * 
 * main 브랜치를 rust 브랜치에 병합하고 충돌이 있으면 해결 가이드를 제공합니다
 */

const { execSync } = require('child_process');
const readline = require('readline');

// 터미널 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function mergeBranches() {
  console.log('🚀 브랜치 병합 시작...');

  try {
    // 현재 브랜치 확인
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`ℹ️ 현재 Git 브랜치: ${currentBranch}`);

    // rust 브랜치로 전환
    if (currentBranch !== 'rust') {
      console.log('🔄 rust 브랜치로 전환 중...');
      try {
        execSync('git checkout rust', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ rust 브랜치로 전환 실패:', error.message);
        console.log('💡 rust 브랜치가 존재하는지 확인하세요. 새로 만들려면:');
        console.log('   git checkout -b rust');
        process.exit(1);
      }
    }

    // 작업 중인 변경사항 확인
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim() !== '') {
        console.log('⚠️ 커밋되지 않은 변경사항이 있습니다:');
        console.log(status);
        
        const answer = await new Promise(resolve => {
          rl.question('계속 진행하시겠습니까? 변경사항이 병합에 포함될 수 있습니다. (y/N): ', resolve);
        });

        if (answer.toLowerCase() !== 'y') {
          console.log('🛑 병합이 취소되었습니다. 변경사항을 먼저 커밋하거나 스태시하세요.');
          process.exit(0);
        }
      }
    } catch (error) {
      console.error('❌ Git 상태 확인 중 오류 발생:', error.message);
    }

    // main 브랜치를 rust 브랜치로 병합
    console.log('🔄 main 브랜치를 rust 브랜치로 병합 중...');
    
    try {
      execSync('git merge main', { stdio: 'inherit' });
      console.log('✅ main 브랜치가 rust 브랜치로 성공적으로 병합되었습니다!');
    } catch (error) {
      console.log('⚠️ 병합 중 충돌이 발생했습니다.');
      console.log('💡 충돌을 해결하려면:');
      console.log('   1. 충돌 파일을 편집해 <<<<<< 및 >>>>>> 마커를 해결하세요');
      console.log('   2. 해결된 파일을 add 하세요: git add <충돌_파일_경로>');
      console.log('   3. 병합을 완료하세요: git commit -m "Merge main into rust"');
      console.log('   4. 또는 병합을 취소하세요: git merge --abort');
      process.exit(1);
    }

    // Vercel에 배포 확인
    const deployAnswer = await new Promise(resolve => {
      rl.question('rust 브랜치를 Vercel에 배포하시겠습니까? (y/N): ', resolve);
    });

    if (deployAnswer.toLowerCase() === 'y') {
      console.log('🚀 Vercel에 배포 중...');
      try {
        execSync('npm run deploy:prod', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ 배포 중 오류 발생:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ 병합 과정에서 오류가 발생했습니다:', error.message);
  } finally {
    rl.close();
  }
}

mergeBranches();
