/**
 * 클라우드 동기화 준비 스크립트
 * 
 * 이 스크립트는 프로젝트를 클라우드 동기화에 적합하도록 준비합니다.
 * - 불필요한 빌드 아티팩트 제거
 * - .gdignore 파일 생성
 * - 클라우드 동기화 관련 설정 추가
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 클라우드 동기화 준비 시작...');

try {
  // 클라우드 동기화에서 제외할 폴더들
  const foldersToExclude = [
    'node_modules',
    'native-modules/target',
    '.next',
    'out',
    'dist',
    '.git',
    '.npm',
    '.cache',
    'tmp'  // 임시 폴더 추가
  ];

  // .gdignore 파일 생성
  const gdignorePath = path.join(process.cwd(), '.gdignore');
  const gdignoreContent = `# Google Drive 동기화 제외 설정\n${foldersToExclude.join('/\n')}/\n`;
  
  fs.writeFileSync(gdignorePath, gdignoreContent, 'utf8');
  console.log('✅ .gdignore 파일이 생성되었습니다.');

  // npm-pacakge-lock.json 백업
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    const backupPath = path.join(process.cwd(), 'package-lock.json.backup');
    fs.copyFileSync(packageLockPath, backupPath);
    console.log('✅ package-lock.json 파일이 백업되었습니다.');
  }

  // 빌드 아티팩트 정리
  try {
    if (fs.existsSync(path.join(process.cwd(), 'native-modules/target'))) {
      console.log('🧹 Rust 빌드 아티팩트 정리 중...');
      execSync('cd native-modules && cargo clean', { stdio: 'inherit' });
    }
  } catch (err) {
    console.warn('⚠️ Rust 빌드 아티팩트 정리 중 오류가 발생했습니다:', err.message);
  }

  // npm 캐시 임시 잠금 해제 (파일 접근 충돌 방지)
  try {
    const npmCacheLockPath = path.join(process.env.APPDATA || process.env.HOME, '.npm/_locks');
    if (fs.existsSync(npmCacheLockPath)) {
      console.log('🔓 npm 캐시 잠금 파일 확인 중...');
      // 파일 잠금 해제를 시도하지만 오류 무시 (읽기 전용인 경우 있음)
      fs.readdirSync(npmCacheLockPath).forEach(file => {
        try {
          fs.unlinkSync(path.join(npmCacheLockPath, file));
        } catch (e) {
          // 오류 무시
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ npm 캐시 잠금 해제 중 오류가 발생했습니다:', err.message);
  }

  // .gitignore 업데이트 체크
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    let updated = false;
    
    // 필요한 항목들이 모두 포함되어 있는지 확인
    const necessaryEntries = [
      'native-modules/target/',
      '**/.rustc_info.json',
      '**/.fingerprint/',
      '**/*.lock.json',
      'package-lock.json.backup' // 백업 파일 추가
    ];
    
    for (const entry of necessaryEntries) {
      if (!gitignoreContent.includes(entry)) {
        gitignoreContent += `\n${entry}`;
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
      console.log('✅ .gitignore 파일이 업데이트되었습니다.');
    } else {
      console.log('✓ .gitignore 파일이 이미 최신 상태입니다.');
    }
  }

  console.log('✅ 클라우드 동기화 준비가 완료되었습니다.');
  console.log('💡 팁: 동기화 문제가 발생하면 "npm run sync:fix-npm"을 실행하세요.');
} catch (error) {
  console.error('❌ 클라우드 동기화 준비 중 오류가 발생했습니다:', error);
  process.exit(1);
}
