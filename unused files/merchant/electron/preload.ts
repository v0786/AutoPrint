import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  restartBackend: () => void;
  onBackendStatus: (callback: (data: { status: string; code?: number }) => void) => void;
  onBackendError: (callback: (data: { message: string; solutions?: string[] }) => void) => void;
}

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  restartBackend: () => ipcRenderer.send('restart-backend'),
  onBackendStatus: (callback) => ipcRenderer.on('backend-status', (_event, data) => callback(data)),
  onBackendError: (callback) => ipcRenderer.on('backend-error', (_event, data) => callback(data)),
};

contextBridge.exposeInMainWorld('electron', electronAPI);

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
