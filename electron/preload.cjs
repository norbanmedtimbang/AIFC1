// C5ISR POS — Electron Sandboxed Preload Script
// Exposes only strictly whitelisted methods via contextBridge to protect the renderer

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('c5isrAPI', {
  isElectron: true,
  platform: process.platform,

  // Thermal Printing
  printReceipt: (receiptData) => ipcRenderer.invoke('printer:printReceipt', receiptData),

  // Native Backup File Chooser
  exportSnapshot: (defaultName) => ipcRenderer.invoke('backup:exportSnapshot', defaultName)
});
