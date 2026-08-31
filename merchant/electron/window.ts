import { BrowserWindow, Menu } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

export function createWindow(development: boolean): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../resources/icons/icon.png'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const startUrl = development
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Production bundle

  console.log('[Window] Loading URL:', startUrl);
  window.loadURL(startUrl);

  if (development) {
    window.webContents.openDevTools();
  }

  return window;
}
