// 이 파일은 src/main/main.js를 불러오는 엔트리 포인트 역할을 합니다
try {
  // NODE_ENV 환경변수 출력
  console.log(`[${new Date().toISOString()}] 환경: ${process.env.NODE_ENV || '미설정'}`);
  console.log(`[${new Date().toISOString()}] 애플리케이션 시작 중...`);
  
  // 개발 모드에서 모듈 캐시 무효화 (재시작 시 일관성을 위해)
  if (process.env.NODE_ENV === 'development') {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('/src/') && !key.includes('node_modules')) {
        delete require.cache[key];
      }
    });
    console.log(`[${new Date().toISOString()}] 개발 모드: 소스 모듈 캐시 무효화 완료`);
  }
  
  // 메인 프로세스 로드
  require('./src/main/main.js');
} catch (error) {
  console.error('메인 프로세스 로드 중 오류 발생:', error);
  
  // 오류가 발생할 경우 electron 모듈을 직접 불러와 오류 대화상자 표시
  try {
    const { app, dialog } = require('electron');
    dialog.showErrorBox(
      '앱 초기화 오류',
      `메인 프로세스를 로드하는 중 오류가 발생했습니다: ${error.message}\n\n${error.stack}`
    );
    app.quit();
  } catch (e) {
    // electron 모듈을 불러올 수 없는 경우 콘솔에만 오류 기록
    console.error('Electron 모듈을 불러올 수 없습니다:', e);
  }
}
