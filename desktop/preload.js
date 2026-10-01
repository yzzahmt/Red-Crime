/* Oyun sayfasına yalnızca gerekli masaüstü işlevlerini açar */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('RCDesktop', {
  platform: process.platform,
  quit: () => ipcRenderer.send('rc:quit'),
  toggleFullscreen: () => ipcRenderer.send('rc:fullscreen'),
  openURL: (url) => ipcRenderer.send('rc:open', url),
});
