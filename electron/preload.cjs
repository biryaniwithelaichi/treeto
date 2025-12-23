const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke('ping'),
  systemAudio: {
    getStatus: () => ipcRenderer.invoke('system-audio:getStatus'),
    verifySetup: () => ipcRenderer.invoke('system-audio:verifySetup'),
    install: () => ipcRenderer.invoke('system-audio:install'),
    openPrefs: (which) => ipcRenderer.invoke('system-audio:openPrefs', which),
    openAudioMidiSetup: () => ipcRenderer.invoke('system-audio:openAudioMidiSetup'),
  }
});