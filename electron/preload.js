const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (config) => ipcRenderer.send('launch-game', config),
  installInstance: (data) => ipcRenderer.invoke('install-instance', data),
  installMod: (modData) => ipcRenderer.invoke('install-mod', modData),
  installModpack: (packData) => ipcRenderer.invoke('install-modpack', packData),
  installDroppedContent: (data) => ipcRenderer.invoke('install-dropped-content', data),
  openContentLocation: (data) => ipcRenderer.invoke('open-content-location', data),
  toggleContent: (data) => ipcRenderer.invoke('toggle-content', data),
  removeContent: (data) => ipcRenderer.invoke('remove-content', data),
  uploadCustomMod: (profile) => ipcRenderer.invoke('upload-custom-mod', profile),
  exportInstanceBackup: (profile) => ipcRenderer.invoke('export-instance-backup', profile),
  importInstanceBackup: () => ipcRenderer.invoke('import-instance-backup'),
  repairProfile: (profile) => ipcRenderer.invoke('repair-profile', profile),
  installJavaRuntime: (majorVersion) => ipcRenderer.invoke('install-java-runtime', majorVersion),
  getCrashReports: (profile) => ipcRenderer.invoke('get-crash-reports', profile),
  openCrashReport: (profile, filename) => ipcRenderer.invoke('open-crash-report', profile, filename),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  stopGame: () => ipcRenderer.invoke('stop-game'),
  openStarClientFolder: () => ipcRenderer.invoke('open-starclient-folder'),
  scanJavaVersions: () => ipcRenderer.invoke('scan-java-versions'),
  getMinecraftVersions: () => ipcRenderer.invoke('get-minecraft-versions'),
  getInstalledMods: (version) => ipcRenderer.invoke('get-installed-mods', version),
  deleteMod: (data) => ipcRenderer.invoke('delete-mod', data),
  getStoreData: (key) => ipcRenderer.invoke('get-store-data', key),
  setStoreData: (key, value) => ipcRenderer.invoke('set-store-data', key, value),
  
  onConsoleLog: (callback) => {
    ipcRenderer.on('console-log', (event, log) => callback(log));
  },
  onGameClosed: (callback) => {
    ipcRenderer.on('game-closed', (event, code) => callback(code));
  },
  onGameStopped: (callback) => {
    ipcRenderer.on('game-stopped', () => callback());
  },
  removeConsoleListeners: () => {
    ipcRenderer.removeAllListeners('console-log');
    ipcRenderer.removeAllListeners('game-closed');
    ipcRenderer.removeAllListeners('game-stopped');
  },

  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});