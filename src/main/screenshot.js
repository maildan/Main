const { desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 스크린샷 캡처 모듈
 * Electron의 desktopCapturer를 사용하여 화면 캡처 기능을 제공합니다.
 */

// 스크린샷 저장 디렉토리 설정
const getScreenshotDir = (app) => {
  const userDataPath = app.getPath('userData');
  const screenshotDir = path.join(userDataPath, 'screenshots');
  
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  return screenshotDir;
};

// 스크린샷 파일명 생성 (현재 날짜/시간 기반)
const generateScreenshotFilename = () => {
  const date = new Date();
  const formatted = date.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
  
  return `screenshot_${formatted}.png`;
};

/**
 * 스크린샷 모듈 초기화 함수
 * @param {Electron.App} app - Electron 애플리케이션 인스턴스
 */
const initScreenshotModule = (app) => {
  const screenshotDir = getScreenshotDir(app);
  
  // 스크린샷 촬영 IPC 핸들러
  ipcMain.handle('take-screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 } // 실제 화면 크기로 캡처
      });
      
      if (sources.length === 0) {
        throw new Error('화면 소스를 찾을 수 없습니다.');
      }
      
      // 메인 화면 소스 선택
      const mainSource = sources[0];
      const filename = generateScreenshotFilename();
      const filePath = path.join(screenshotDir, filename);
      
      // 스크린샷 메타데이터 반환
      return {
        sourceId: mainSource.id,
        name: mainSource.name,
        filePath,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('스크린샷 캡처 중 오류:', error);
      throw error;
    }
  });
  
  // 스크린샷 저장 IPC 핸들러
  ipcMain.handle('save-screenshot', async (event, { dataURL, filePath }) => {
    try {
      // dataURL에서 base64 데이터 추출
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
      
      // 파일로 저장
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      
      return {
        success: true,
        filePath,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('스크린샷 저장 중 오류:', error);
      throw error;
    }
  });
  
  // 스크린샷 목록 조회 IPC 핸들러
  ipcMain.handle('get-screenshots', () => {
    try {
      const files = fs.readdirSync(screenshotDir)
        .filter(file => file.startsWith('screenshot_') && file.endsWith('.png'))
        .map(file => ({
          name: file,
          path: path.join(screenshotDir, file),
          timestamp: fs.statSync(path.join(screenshotDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      return files;
    } catch (error) {
      console.error('스크린샷 목록 조회 중 오류:', error);
      throw error;
    }
  });
};

module.exports = { initScreenshotModule };
