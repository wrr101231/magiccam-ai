import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, secure IPC API methods to the renderer window context
contextBridge.exposeInMainWorld('api', {
  licensing: {
    activate: (email: string, key: string) => ipcRenderer.invoke('license:activate', email, key),
    validate: () => ipcRenderer.invoke('license:validate'),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    checkLocalStatus: () => ipcRenderer.invoke('license:checkLocalStatus'),
  },
  hardware: {
    getProfile: () => ipcRenderer.invoke('hardware:getProfile'),
  },
  models: {
    getStatus: () => ipcRenderer.invoke('models:getStatus'),
    download: (id: string) => ipcRenderer.invoke('models:download', id),
    repair: (id: string) => ipcRenderer.invoke('models:repair', id),
    getStats: () => ipcRenderer.invoke('models:getStats'),
    onDownloadProgress: (callback: (data: { modelId: string; progress: number }) => void) => {
      ipcRenderer.removeAllListeners('models:downloadProgress');
      ipcRenderer.on('models:downloadProgress', (_, data) => callback(data));
    },
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: (url: string, checksum?: string) => ipcRenderer.invoke('updater:downloadUpdate', url, checksum),
    cancelDownload: () => ipcRenderer.invoke('updater:cancelDownload'),
    installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onDownloadProgress: (callback: (data: { percent: number; transferredMB: number; totalMB: number; bytesPerSecond: number }) => void) => {
      ipcRenderer.removeAllListeners('updater:downloadProgress');
      ipcRenderer.on('updater:downloadProgress', (_, data) => callback(data));
    },
    onUpdateAvailable: (callback: (data: { version: string; releaseNotes: string; downloadUrl: string; checksum: string; fileSizeMB: number }) => void) => {
      ipcRenderer.removeAllListeners('updater:updateAvailable');
      ipcRenderer.on('updater:updateAvailable', (_, data) => callback(data));
    },
  },
  app: {
    exit: () => ipcRenderer.send('app:exit'),
    minimize: () => ipcRenderer.send('app:minimize'),
  },
  // Phase 4, 5 & 6: Filesystem Libraries, Custom Identities & Models Actions
  library: {
    selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
    selectModelFile: () => ipcRenderer.invoke('dialog:selectModelFile'),
    importFace: (filePath: string) => ipcRenderer.invoke('library:importFace', filePath),
    getFaces: () => ipcRenderer.invoke('library:getFaces'),
    deleteFace: (name: string) => ipcRenderer.invoke('library:deleteFace', name),
    importBackground: (filePath: string) => ipcRenderer.invoke('library:importBackground', filePath),
    getBackgrounds: () => ipcRenderer.invoke('library:getBackgrounds'),
    deleteBackground: (name: string) => ipcRenderer.invoke('library:deleteBackground', name),
    generateBackground: (prompt: string) => ipcRenderer.invoke('library:generateBackground', prompt),
    saveVideo: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('recording:saveVideo', arrayBuffer),
    saveProjects: (projectsJson: string) => ipcRenderer.invoke('projects:save', projectsJson),
    loadProjects: () => ipcRenderer.invoke('projects:load'),
    importIdentity: (filePath: string) => ipcRenderer.invoke('library:importIdentity', filePath),
    getIdentities: () => ipcRenderer.invoke('library:getIdentities'),
    deleteIdentity: (name: string) => ipcRenderer.invoke('library:deleteIdentity', name),
    importAIModel: (filePath: string) => ipcRenderer.invoke('models:importAIModel', filePath),
    readFileBase64: (filePath: string) => ipcRenderer.invoke('library:readFileBase64', filePath),
    
    // Phase 6 optimizations:
    log: (level: string, category: string, message: string) => ipcRenderer.send('logger:log', level, category, message),
    getLogs: () => ipcRenderer.invoke('logger:getLogs'),
    clearLogs: () => ipcRenderer.invoke('logger:clearLogs'),
    saveSession: (stateJson: string) => ipcRenderer.invoke('session:save', stateJson),
    loadSession: () => ipcRenderer.invoke('session:load'),
    getResourceMetrics: () => ipcRenderer.invoke('resource:getMetrics'),
    clearCache: () => ipcRenderer.invoke('resource:clearCache'),
  }
});
