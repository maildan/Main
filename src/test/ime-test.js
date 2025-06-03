const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { composeHangul, decomposeHangul, processJamo, finishComposition } = require('../main/keyboard');

// 테스트 데이터
const testCases = [
  { input: ['ㄱ', 'ㅏ', 'ㄴ'], expected: '간' },
  { input: ['ㄴ', 'ㅏ', 'ㅂ'], expected: '납' },
  { input: ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ'], expected: '한글' },
  { input: ['ㅌ', 'ㅔ', 'ㅅ', 'ㅡ', 'ㅌ', 'ㅡ'], expected: '테스트' },
  { input: ['ㅇ', 'ㅖ', 'ㅅ', 'ㅣ'], expected: '예시' },
];

// 테스트 실행 함수
async function runImeTest() {
  console.log('===== 한글 IME 테스트 시작 =====');
  
  // 개별 자모 조합 테스트
  console.log('\n1. 개별 자모 조합 테스트');
  console.log('----------------------');
  
  testCases.forEach((testCase, index) => {
    console.log(`\n테스트 케이스 #${index + 1}: ${testCase.input.join('')} -> ${testCase.expected}`);
    
    let result = '';
    testCase.input.forEach(jamo => {
      // processJamo 함수는 상태를 관리하기 때문에 결과 누적
      const processed = processJamo(jamo);
      if (processed.result) {
        result += processed.result;
      }
    });
    
    // 마지막으로 조합 완료
    const finalChar = finishComposition();
    if (finalChar) {
      result += finalChar;
    }
    
    console.log(`결과: ${result}`);
    console.log(`통과 여부: ${result === testCase.expected ? '✅ 성공' : '❌ 실패'}`);
  });
  
  // 직접 조합 테스트
  console.log('\n2. 직접 조합 테스트');
  console.log('----------------------');
  
  const directTests = [
    { cho: 'ㄱ', jung: 'ㅏ', jong: 'ㄴ', expected: '간' },
    { cho: 'ㄴ', jung: 'ㅏ', jong: 'ㅂ', expected: '납' },
    { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ', expected: '한' },
  ];
  
  directTests.forEach((test, index) => {
    const result = composeHangul(test.cho, test.jung, test.jong);
    console.log(`직접 조합 #${index + 1}: ${test.cho}+${test.jung}+${test.jong} -> ${result}`);
    console.log(`통과 여부: ${result === test.expected ? '✅ 성공' : '❌ 실패'}`);
  });
  
  // 한글 분해 테스트
  console.log('\n3. 한글 분해 테스트');
  console.log('----------------------');
  
  const decomposeTests = ['가', '나', '다', '한', '글', '입', '력', '테', '스', '트'];
  
  decomposeTests.forEach((char, index) => {
    const result = decomposeHangul(char);
    console.log(`분해 테스트 #${index + 1}: ${char} -> 초성: ${result.cho}, 중성: ${result.jung}, 종성: ${result.jong || '(없음)'}`);
  });
  
  console.log('\n===== 한글 IME 테스트 완료 =====');
}

// 앱이 준비되면 테스트 시작
app.whenReady().then(async () => {
  await runImeTest();
  
  // 테스트 완료 후 앱 종료
  app.quit();
});

// 모든 창이 닫히면 앱 종료
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { runImeTest }; 