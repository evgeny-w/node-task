const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProcList: (name) => ipcRenderer.invoke('getProcList', name),
  killProcByPID: (pid) => ipcRenderer.invoke('killProcByPID', pid),
});
