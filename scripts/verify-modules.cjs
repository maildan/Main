const fs = require('fs');
const path = require('path');

// 확인할 파일 목록
const filesToCheck = [
  path.join(__dirname, '..', 'src', 'main', 'app-lifecycle.cjs'),
  path.join(__dirname, '..', 'src', 'main', 'window.cjs'),
  path.join(__dirname, '..', 'src', 'main', 'constants.cjs')
];

console.log('파일 존재 여부 확인:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '존재함 ✅' : '존재하지 않음 ❌'}`);
  
  if (exists) {
    // 파일 내용 일부 확인
    try {
      const content = fs.readFileSync(file, 'utf8').slice(0, 200);
      console.log(`  첫 200자: ${content.replace(/\n/g, '\\n')}`);
    } catch (err) {
      console.error(`  파일 읽기 오류: ${err.message}`);
    }
  }
});
