/**
 * 앱 메뉴 관리 모듈
 *
 * Electron 앱의 메뉴바와 컨텍스트 메뉴 설정을 관리합니다.
 */

const { app, Menu, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const os = require('os');

/**
 * 메인 애플리케이션 메뉴 생성
 * @param {object} options 메뉴 구성 옵션
 * @returns {Electron.Menu} 생성된 메뉴
 */
function createApplicationMenu(options = {}) {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  const isDev = process.env.NODE_ENV === 'development';

  // 기본 옵션
  const defaultOptions = {
    showPreferences: true,
    showAbout: true,
    showQuit: true,
    showDevTools: isDev,
    enableAutoUpdates: true,
    appName: app.getName(),
  };

  // 옵션 병합
  const menuOptions = { ...defaultOptions, ...options };

  // 최근 파일 목록 (있는 경우)
  const recentFiles = options.recentFiles || [];

  // 애플리케이션 메뉴 템플릿
  const template = [];

  // 앱 메뉴 (macOS에서만 앱 이름 표시)
  if (isMac) {
    template.push({
      label: menuOptions.appName,
      submenu: [
        ...(menuOptions.showAbout ? [{ role: 'about' }] : []),
        { type: 'separator' },
        ...(menuOptions.showPreferences
          ? [
              {
                label: '환경설정...',
                accelerator: 'Command+,',
                click: () => {
                  // 설정 창 열기
                  for (const win of BrowserWindow.getAllWindows()) {
                    if (!win.isDestroyed()) {
                      win.webContents.send('menu-action', { action: 'open-settings' });
                    }
                  }
                },
              },
            ]
          : []),
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        ...(menuOptions.showQuit ? [{ role: 'quit' }] : []),
      ],
    });
  }

  // 파일 메뉴
  const fileMenu = {
    label: '파일',
    submenu: [
      {
        label: '새 창',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          // 새 창 생성
          const win = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(app.getAppPath(), 'preload.js'),
            },
          });

          // 앱 페이지 로드
          win.loadURL(`http://localhost:${process.env.PORT || 3000}`);
        },
      },
      { type: 'separator' },
      {
        label: '열기',
        accelerator: 'CmdOrCtrl+O',
        click: async () => {
          const mainWindow = BrowserWindow.getFocusedWindow();
          if (!mainWindow) return;

          const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: '모든 파일', extensions: ['*'] }],
          });

          if (!canceled && filePaths.length > 0) {
            mainWindow.webContents.send('menu-action', {
              action: 'file-opened',
              filePath: filePaths[0],
            });
          }
        },
      },
      // 최근 파일 하위 메뉴 (있는 경우)
      recentFiles.length > 0
        ? {
            label: '최근 파일',
            submenu: recentFiles.map(file => ({
              label: path.basename(file),
              click: () => {
                const mainWindow = BrowserWindow.getFocusedWindow();
                if (mainWindow) {
                  mainWindow.webContents.send('menu-action', {
                    action: 'file-opened',
                    filePath: file,
                  });
                }
              },
            })),
          }
        : null,
      { type: 'separator' },
      {
        label: '저장',
        accelerator: 'CmdOrCtrl+S',
        click: () => {
          const win = BrowserWindow.getFocusedWindow();
          if (win) {
            win.webContents.send('menu-action', { action: 'save' });
          }
        },
      },
      {
        label: '다른 이름으로 저장...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => {
          const win = BrowserWindow.getFocusedWindow();
          if (win) {
            win.webContents.send('menu-action', { action: 'save-as' });
          }
        },
      },
      { type: 'separator' },
      ...(isWindows
        ? [
            ...(menuOptions.showPreferences
              ? [
                  {
                    label: '환경설정',
                    accelerator: 'Ctrl+,',
                    click: () => {
                      // 설정 창 열기
                      for (const win of BrowserWindow.getAllWindows()) {
                        if (!win.isDestroyed()) {
                          win.webContents.send('menu-action', { action: 'open-settings' });
                        }
                      }
                    },
                  },
                ]
              : []),
            { type: 'separator' },
          ]
        : []),
      ...(!isMac && menuOptions.showQuit
        ? [
            {
              role: 'quit',
              accelerator: 'Alt+F4',
            },
          ]
        : []),
    ].filter(Boolean), // null 항목 제거
  };
  template.push(fileMenu);

  // 편집 메뉴
  template.push({
    label: '편집',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: '음성',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  });

  // 보기 메뉴
  template.push({
    label: '보기',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      ...(menuOptions.showDevTools ? [{ role: 'toggleDevTools' }] : []),
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { type: 'separator' },
      {
        label: '미니뷰',
        accelerator: 'CmdOrCtrl+M',
        click: () => {
          // 미니뷰 토글
          const win = BrowserWindow.getFocusedWindow();
          if (win) {
            win.webContents.send('menu-action', { action: 'toggle-mini-view' });
          }
        },
      },
    ],
  });

  // 창 메뉴
  template.push({
    label: '창',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
        : [{ role: 'close' }]),
    ],
  });

  // 도움말 메뉴
  const helpMenu = {
    role: 'help',
    submenu: [
      {
        label: '온라인 도움말',
        click: async () => {
          await shell.openExternal('https://help.loop.com');
        },
      },
      {
        label: '피드백 보내기',
        click: async () => {
          await shell.openExternal('https://loop.com/feedback');
        },
      },
      { type: 'separator' },
      ...(menuOptions.enableAutoUpdates
        ? [
            {
              label: '업데이트 확인',
              click: () => {
                // 업데이트 체크 이벤트 발행
                for (const win of BrowserWindow.getAllWindows()) {
                  if (!win.isDestroyed()) {
                    win.webContents.send('menu-action', { action: 'check-updates' });
                  }
                }
              },
            },
          ]
        : []),
      {
        label: '시스템 정보',
        click: () => {
          const systemInfo = {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            totalMemory: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
            freeMemory: Math.round(os.freemem() / (1024 * 1024)) + ' MB',
            cpus: os.cpus().length,
            uptime: Math.round(os.uptime() / 60) + ' 분',
            appVersion: app.getVersion(),
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome,
            nodeVersion: process.versions.node,
            v8Version: process.versions.v8,
          };

          // 시스템 정보 대화 상자
          dialog.showMessageBox({
            title: '시스템 정보',
            message: '시스템 정보',
            detail: Object.entries(systemInfo)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n'),
            buttons: ['확인'],
          });
        },
      },
      { type: 'separator' },
      ...(!isMac && menuOptions.showAbout
        ? [
            {
              label: `${menuOptions.appName} 정보`,
              click: () => {
                dialog.showMessageBox({
                  title: `${menuOptions.appName} 정보`,
                  message: menuOptions.appName,
                  detail: `버전: ${app.getVersion()}\n${app.getName()} - 현대적인 타이핑 분석 도구`,
                  buttons: ['확인'],
                });
              },
            },
          ]
        : []),
    ].filter(Boolean), // null 항목 제거
  };
  template.push(helpMenu);

  const menu = Menu.buildFromTemplate(template);
  return menu;
}

/**
 * 컨텍스트 메뉴 생성 (우클릭 메뉴)
 * @param {object} options 메뉴 구성 옵션
 * @returns {Electron.Menu} 생성된 컨텍스트 메뉴
 */
function createContextMenu(options = {}) {
  const template = [
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { type: 'separator' },
    { role: 'selectAll' },
    { type: 'separator' },
  ];

  // 추가 메뉴 항목 (제공된 경우)
  if (options.items && Array.isArray(options.items)) {
    template.push(...options.items);
  }

  // 기본 추가 항목
  if (options.showInspect !== false && process.env.NODE_ENV === 'development') {
    template.push(
      { type: 'separator' },
      {
        label: '요소 검사',
        click: (menuItem, browserWindow) => {
          if (browserWindow) {
            browserWindow.webContents.inspectElement(options.x || 0, options.y || 0);
          }
        },
      }
    );
  }

  return Menu.buildFromTemplate(template);
}

/**
 * 트레이 메뉴 생성
 * @param {object} options 메뉴 구성 옵션
 * @returns {Electron.Menu} 생성된 트레이 메뉴
 */
function createTrayMenu(options = {}) {
  const template = [
    {
      label: options.appName || app.getName(),
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '창 열기',
      click: () => {
        // 모든 윈도우를 보여줌
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.show();
          }
        }
      },
    },
    {
      label: '미니뷰 토글',
      click: () => {
        // 미니뷰 토글 이벤트 발행
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('menu-action', { action: 'toggle-mini-view' });
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '설정',
      click: () => {
        // 설정 열기 이벤트 발행
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.show();
            win.webContents.send('menu-action', { action: 'open-settings' });
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.quit();
      },
    },
  ];

  // 사용자 정의 메뉴 항목 추가 (제공된 경우)
  if (options.items && Array.isArray(options.items)) {
    // 종료 항목 바로 위에 추가
    template.splice(template.length - 1, 0, ...options.items);
  }

  return Menu.buildFromTemplate(template);
}

/**
 * 앱 메뉴 설정 적용
 * @param {object} options 메뉴 구성 옵션
 */
function setupApplicationMenu(options = {}) {
  const menu = createApplicationMenu(options);
  Menu.setApplicationMenu(menu);
}

/**
 * 전역 컨텍스트 메뉴 이벤트 설정
 */
function setupContextMenuEvents() {
  // 컨텍스트 메뉴 이벤트 리스너
  app.on('web-contents-created', (event, contents) => {
    contents.on('context-menu', (event, params) => {
      const { x, y, isEditable, selectionText, editFlags, linkURL } = params;

      // 기본 항목
      const menuItems = [];

      // 링크 항목 (링크 위에서 우클릭한 경우)
      if (linkURL) {
        menuItems.push(
          {
            label: '링크 열기',
            click: () => {
              shell.openExternal(linkURL);
            },
          },
          {
            label: '링크 복사',
            click: () => {
              require('electron').clipboard.writeText(linkURL);
            },
          },
          { type: 'separator' }
        );
      }

      // 선택 항목 (텍스트 선택한 경우)
      if (selectionText) {
        menuItems.push({
          label: '복사',
          click: () => {
            contents.copy();
          },
        });

        // 검색 기능
        if (selectionText.length < 50) {
          menuItems.push({
            label: `"${selectionText}" 검색`,
            click: () => {
              shell.openExternal(
                `https://www.google.com/search?q=${encodeURIComponent(selectionText)}`
              );
            },
          });
        }

        menuItems.push({ type: 'separator' });
      }

      // 편집 가능한 경우
      if (isEditable) {
        menuItems.push(
          {
            label: '잘라내기',
            enabled: editFlags.canCut,
            click: () => {
              contents.cut();
            },
          },
          {
            label: '복사',
            enabled: editFlags.canCopy,
            click: () => {
              contents.copy();
            },
          },
          {
            label: '붙여넣기',
            enabled: editFlags.canPaste,
            click: () => {
              contents.paste();
            },
          },
          { type: 'separator' }
        );
      }

      // 개발자 도구 (개발 모드에서만)
      if (process.env.NODE_ENV === 'development') {
        menuItems.push({
          label: '요소 검사',
          click: () => {
            contents.inspectElement(x, y);
          },
        });
      }

      // 메뉴가 비어있지 않으면 표시
      if (menuItems.length > 0) {
        const contextMenu = Menu.buildFromTemplate(menuItems);
        contextMenu.popup({ window: BrowserWindow.fromWebContents(contents) });
      }
    });
  });
}

module.exports = {
  createApplicationMenu,
  createContextMenu,
  createTrayMenu,
  setupApplicationMenu,
  setupContextMenuEvents,
};
