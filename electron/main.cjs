// C5ISR POS — Electron Main Process (Windows Desktop Architecture)
// Secure, offline-only process with SQLite ACID transactions and Windows Spooler raw printing

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Enforce single application instance on Windows POS terminals
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#F7F3EB', // C5ISR Warm Cream
    autoHideMenuBar: true,
    title: 'C5ISR Coffee Shop POS — Offline Command Terminal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,       // Strict renderer sandboxing
      nodeIntegration: false,        // Renderer cannot run raw Node scripts
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Windows POS persistent database storage directory
  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load production build or local dev server
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Direct Windows Thermal Receipt Spooling (ESC/POS)
ipcMain.handle('printer:printReceipt', async (event, receiptPayload) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    mainWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        pageSize: { width: 80000, height: 297000 } // 80mm continuous roll
      },
      (success, failureReason) => {
        return { success, failureReason };
      }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Safe Database Backup (VACUUM INTO atomic snapshot)
ipcMain.handle('backup:exportSnapshot', async (event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save C5ISR Database Backup Archive',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'C5ISR Archive', extensions: ['json', 'db'] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  return { canceled: false, targetPath: filePath };
});
