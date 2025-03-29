import { promises as fsPromises, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..');
const targetDir = join(projectRoot, 'native-modules', 'target');

console.log('네이티브 모듈 빌드 파일 검색 중...');

function findFiles(dir, pattern) {
  if (!existsSync(dir)) {
    console.log(`디렉토리가 존재하지 않음: ${dir}`);
    return [];
  }
  
  let results = [];
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const itemPath = join(dir, item);
      try {
        const stat = statSync(itemPath);
        
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
    console.log(`copy "${files[0].path}" "${join(projectRoot, 'native-modules', 'typing_stats_native.node')}"`);
  } else {
    console.log(`cp "${files[0].path}" "${join(projectRoot, 'native-modules', 'typing_stats_native.node')}"`);
  }
}
