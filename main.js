import { setupAppEventListeners } from './src/main/app-lifecycle.js';
import { app, BrowserWindow } from 'electron';

// 앱 이벤트 리스너 설정
setupAppEventListeners();

// 이것으로 파일 끝. 모든 기능은 모듈화되어 필요한 파일에서 관리됩니다.
