const { app, BrowserWindow } = require('electron');
require('./surf_server');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 1000,
    autoHideMenuBar: true,
    backgroundColor: '#0a0f0d',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadURL('http://localhost:3002/dashboard.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
