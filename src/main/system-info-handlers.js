/**
 * 시스템 정보 관련 IPC 핸들러
 * 
 * 브라우저 정보, 디버그 정보 등 시스템 관련 정보를 제공하는 핸들러를 처리합니다.
 */
const { ipcMain, app } = require('electron');
const activeWin = require('active-win');
const { appState } = require('./constants');
const { debugLog } = require('./utils'); 