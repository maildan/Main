interface Window {
  electronAPI?: ElectronAPI;
  restartAPI?: RestartAPI;
}

interface RestartAPI {
  getDarkMode: () => Promise<boolean>;
  restartApp: () => void;
  closeWindow: () => void;
}