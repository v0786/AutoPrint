import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { createWindow } from './window';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendPath = isDev
      ? path.join(__dirname, '../backend/dist/server.js')
      : path.join(process.resourcesPath, 'backend', 'dist', 'server.js');

    console.log('[Backend] Starting:', backendPath);

    backendProcess = spawn('node', [backendPath], {
      stdio: 'inherit',
      shell: true,
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend] Failed to start:', err);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log('[Backend] Exited with code', code);
      mainWindow?.webContents.send('backend-status', { status: 'offline', code });
    });

    // Give backend time to start, then check /health endpoint
    setTimeout(() => {
      fetch('http://localhost:4100/health')
        .then(() => {
          console.log('[Backend] Health check passed');
          resolve();
        })
        .catch((err) => {
          console.error('[Backend] Health check failed:', err);
          reject(err);
        });
    }, 2000);
  });
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('[Backend] Terminating...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

async function initialize(): Promise<void> {
  try {
    console.log('[Electron] Initializing...');
    await startBackend();
    mainWindow = createWindow(isDev);
    mainWindow.on('closed', () => {
      mainWindow = null;
      stopBackend();
      app.quit();
    });
  } catch (error) {
    console.error('[Electron] Initialization failed:', error);
    mainWindow?.webContents.send('backend-error', {
      message: error instanceof Error ? error.message : 'Backend failed to start',
      solutions: [
        'Check that Node.js is installed: node --version',
        'Verify port 4100 is not in use: netstat -ano | find ":4100"',
        'Check D:\\QRPrint\\data\\merchant.db exists',
        'Review logs at C:\\Users\\{User}\\AppData\\Roaming\\QRPrint\\logs',
      ],
    });
  }
}

app.on('ready', initialize);

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    initialize();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.on('restart-backend', () => {
  console.log('[IPC] Restart backend requested');
  stopBackend();
  startBackend()
    .then(() => mainWindow?.webContents.send('backend-status', { status: 'online' }))
    .catch((err) => mainWindow?.webContents.send('backend-error', { message: err.message }));
});

// Create application menu
const createMenu = (): void => {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => require('electron').shell.openExternal('https://qrprint.example.com/help'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

app.on('ready', createMenu);
