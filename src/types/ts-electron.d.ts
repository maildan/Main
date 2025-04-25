/**
 * Electron 타입 정의 파일
 * 타입스크립트에서 Electron 관련 타입을 사용할 수 있게 합니다.
 */

declare namespace Electron {
  interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    send(channel: string, ...args: any[]): void;
    on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    removeListener(channel: string, listener: (...args: any[]) => void): this;
    removeAllListeners(channel: string): this;
  }

  interface IpcRendererEvent {
    preventDefault: () => void;
    sender: IpcRenderer;
    ports: MessagePort[];
    frameId: number;
  }

  interface WebContents {
    send(channel: string, ...args: any[]): void;
  }
}

interface Window {
  electron: {
    ipcRenderer: Electron.IpcRenderer;
    sendNotification: (title: string, body: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    setFullScreen: (flag: boolean) => void;
    isFullScreen: () => Promise<boolean>;
    reload: () => void;
  };
}
