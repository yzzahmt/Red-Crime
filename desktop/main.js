/* RED CRIME - Masaüstü (Electron) giriş noktası: Steam için Windows / macOS / Linux */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');

// Steam katmanı (overlay) ve Linux uyumluluğu
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('disable-direct-composition');
}
// Steam, Linux'ta dosyaları setuid olmadan çıkarır; chrome-sandbox bu yüzden açılamaz
if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: !process.argv.includes('--windowed'),
    backgroundColor: '#05060f',
    title: 'Red Crime',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'dist', 'web', 'index.html'));

  // F11 / Alt+Enter: tam ekran · F12: geliştirici araçları (yalnızca paketlenmemişken)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.key === 'F12' && !app.isPackaged) {
      win.webContents.toggleDevTools();
    }
  });
  // Oyun içinden dış bağlantı açılmasın
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

ipcMain.on('rc:quit', () => app.quit());
ipcMain.on('rc:fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
// Yalnızca kendi sitemiz sistem tarayıcısında açılabilir
const EXTERNAL_OK = /^https:\/\/(www\.)?yazify\.net(\/|$)/;
ipcMain.on('rc:open', (e, url) => {
  if (typeof url === 'string' && EXTERNAL_OK.test(url)) shell.openExternal(url);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
