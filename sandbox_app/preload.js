const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getProcessList: (name) => ipcRenderer.invoke('getProcessList', name),
  killProcByPID: (pid) => ipcRenderer.invoke('killProcByPID', pid),
});
