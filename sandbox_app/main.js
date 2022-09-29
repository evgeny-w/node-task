const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const tasklib = require('../lib');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(() => {
  ipcMain.handle('getProcessList', tasklib.getProcessList);
  ipcMain.handle('killProcByPID', async (evt, pid) => tasklib.killProcByPID(pid));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
