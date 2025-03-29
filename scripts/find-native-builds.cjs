const fs = require('fs');
const path = require('path');

// 프로젝트 루트 디렉토리 경로 수정
const projectRoot = path.resolve(__dirname, '..');
const targetDir = path.join(projectRoot, 'native-modules', 'target');

console.log('네이티브 모듈 빌드 파일 검색 중...');

function findFiles(dir, pattern) {
  if (!fs.existsSync(dir)) {
    console.log(`디렉토리가 존재하지 않음: ${dir}`);
    return [];
  }
  
  let results = [];
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      try {
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          results = results.concat(findFiles(itemPath, pattern));
        } else if (item.includes(pattern)) {
          results.push({
            path: itemPath,
            size: Math.round(stat.size / 1024) + 'KB',
            mtime: stat.mtime
          });
        }
      } catch (e) {
        // 권한 문제 등으로 파일/디렉토리 접근 실패 시 무시
      }
    }
  } catch (e) {
    console.error(`디렉토리 읽기 오류 (${dir}): ${e.message}`);
  }
  
  return results;
}

const extension = {
  'win32': '.dll',
  'darwin': '.dylib', 
  'linux': '.so'
}[process.platform];

console.log(`검색 중: '${extension}' 확장자 파일`);
console.log(`대상 디렉토리: ${targetDir}`);

// 디렉토리 존재 여부 확인 및 디버깅 정보 추가
if (!fs.existsSync(targetDir)) {
  console.log(`❌ 대상 디렉토리가 존재하지 않습니다: ${targetDir}`);
  
  // 상위 디렉토리 확인
  const nativeModulesDir = path.join(projectRoot, 'native-modules');
  if (fs.existsSync(nativeModulesDir)) {
    console.log(`✅ native-modules 디렉토리는 존재합니다: ${nativeModulesDir}`);
    console.log('native-modules 디렉토리 내용:');
    fs.readdirSync(nativeModulesDir).forEach(item => {
      console.log(`  - ${item}`);
    });
  } else {
    console.log(`❌ native-modules 디렉토리도 존재하지 않습니다: ${nativeModulesDir}`);
  }
}

const files = findFiles(targetDir, 'typing_stats');

if (files.length === 0) {
  console.log('관련 파일을 찾을 수 없습니다.');
} else {
  console.log('\n찾은 파일:');
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path} (${file.size}) - ${file.mtime}`);
  });
  
  console.log('\n수동 복사 명령:');
  if (process.platform === 'win32') {
    console.log(`copy "${files[0].path}" "${path.join(projectRoot, 'native-modules', 'typing_stats_native.node')}"`);
  } else {
    console.log(`cp "${files[0].path}" "${path.join(projectRoot, 'native-modules', 'typing_stats_native.node')}"`);
  }
}
