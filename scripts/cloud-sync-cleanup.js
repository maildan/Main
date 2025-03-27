/**
 * 클라우드 동기화 후 정리 스크립트
 * 
 * 이 스크립트는 클라우드 동기화 후 발생할 수 있는 문제를 해결합니다.
 * - 손상된 패키지 정리
 * - Git 저장소 정리
 * - 임시 파일 제거
 * - npm 파일 잠금 해제
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 클라우드 동기화 후 정리 시작...');

try {
  // npm 캐시에서 손상된 파일 정리
  console.log('🧹 npm 캐시 정리 중...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  
  // npm 잠금 파일 확인 및 정리
  try {
    const npmCachePath = path.join(process.env.APPDATA || process.env.HOME, '.npm');
    if (fs.existsSync(npmCachePath)) {
      console.log('🔍 npm 캐시 파일 검사 중...');
      
      // _locks 디렉토리 정리
      const locksPath = path.join(npmCachePath, '_locks');
      if (fs.existsSync(locksPath)) {
        fs.readdirSync(locksPath).forEach(file => {
          try {
            fs.unlinkSync(path.join(locksPath, file));
          } catch (err) {
            // 잠금 파일 삭제 실패는 무시
          }
        });
        console.log('✅ npm 잠금 파일이 정리되었습니다.');
      }
      
      // _cacache/tmp 디렉토리 정리
      const tmpPath = path.join(npmCachePath, '_cacache', 'tmp');
      if (fs.existsSync(tmpPath)) {
        fs.readdirSync(tmpPath).forEach(file => {
          try {
            fs.unlinkSync(path.join(tmpPath, file));
          } catch (err) {
            // 임시 파일 삭제 실패는 무시
          }
        });
        console.log('✅ npm 캐시 임시 파일이 정리되었습니다.');
      }
    }
  } catch (err) {
    console.warn('⚠️ npm 캐시 확인 중 오류가 발생했습니다:', err.message);
  }
  
  // 손상된 package-lock.json 검사 및 복원
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  const backupPath = path.join(process.cwd(), 'package-lock.json.backup');
  
  if (fs.existsSync(packageLockPath)) {
    try {
      // 파일 크기가 0이거나 JSON 파싱 불가능한 경우 손상된 것으로 간주
      const stats = fs.statSync(packageLockPath);
      let isCorrupted = stats.size === 0;
      
      if (!isCorrupted) {
        try {
          JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
        } catch (e) {
          isCorrupted = true;
        }
      }
      
      if (isCorrupted && fs.existsSync(backupPath)) {
        console.log('⚠️ 손상된 package-lock.json 발견. 백업에서 복원합니다...');
        fs.copyFileSync(backupPath, packageLockPath);
        console.log('✅ package-lock.json이 복원되었습니다.');
      }
    } catch (err) {
      console.warn('⚠️ package-lock.json 검사 중 오류가 발생했습니다:', err.message);
    }
  }
  
  // Git 저장소 정리
  try {
    console.log('🔧 Git 저장소 정리 중...');
    execSync('git gc', { stdio: 'inherit' });
    execSync('git fsck', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ Git 저장소 정리 중 오류가 발생했습니다:', err.message);
  }
  
  // 임시 파일 정리
  const tempFolders = [
    '.cache',
    '.npm',
    '.eslintcache',
    'tmp'  // 추가 임시 폴더
  ];
  
  for (const folder of tempFolders) {
    const folderPath = path.join(process.cwd(), folder);
    if (fs.existsSync(folderPath)) {
      try {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`✅ ${folder} 폴더가 정리되었습니다.`);
      } catch (err) {
        console.warn(`⚠️ ${folder} 폴더 정리 중 오류가 발생했습니다:`, err.message);
      }
    }
  }

  console.log('✅ 클라우드 동기화 후 정리가 완료되었습니다.');
  console.log('💡 문제가 지속되는 경우 "npm run sync:fix-npm" 명령으로 패키지를 재설치하세요.');
} catch (error) {
  console.error('❌ 클라우드 동기화 후 정리 중 오류가 발생했습니다:', error);
  process.exit(1);
}
