import { app, BrowserWindow, ipcMain, dialog, systemPreferences } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { activateLicense, validateLicenseOnline, deactivateLicenseLocal } from './licensing';
import { loadActivationToken, encrypt, decrypt } from './security';
import { detectHardware } from './hardware';
import { getModelStatusList, downloadModel, repairModel, getStorageUsage, importCustomModel } from './runtime';
import { checkForUpdates, downloadUpdate, cancelDownload, installUpdate, getCurrentVersion, cleanupOldUpdates, scheduleAutoUpdateCheck } from './updater';
import config from './config.json';

console.log(`Starting MagicCamAI Desktop. Bundle models mode: ${config.bundleModels}`);

let mainWindow: BrowserWindow | null = null;
let pythonBackendProcess: any = null;

// Library paths
const CONFIG_DIR = path.join(os.homedir(), '.magiccam');
const FACES_DIR = path.join(CONFIG_DIR, 'faces');
const IDENTITIES_DIR = path.join(CONFIG_DIR, 'identities');
const BACKGROUNDS_DIR = path.join(CONFIG_DIR, 'backgrounds');
const PROJECTS_FILE = path.join(CONFIG_DIR, 'projects.json');
const LOGS_FILE = path.join(CONFIG_DIR, 'logs.json');
const SESSION_FILE = path.join(CONFIG_DIR, 'last_session.json');

// Ensure directories exist
[FACES_DIR, IDENTITIES_DIR, BACKGROUNDS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Setup Initial log file
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, '[]', 'utf8');
}

/**
 * Appends a log line structured format to logs.json
 */
function appendLog(level: string, category: string, message: string) {
  try {
    let logs = [];
    if (fs.existsSync(LOGS_FILE)) {
      const content = fs.readFileSync(LOGS_FILE, 'utf8');
      logs = JSON.parse(content || '[]');
    }
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      category,
      message
    });
    if (logs.length > 500) logs.shift();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Log write failed:', e);
  }
}

// Log initial boot state
appendLog('INFO', 'STARTUP', 'Application started. Core settings and configurations loaded.');

function createWindow() {
  const appRoot = app.getAppPath();

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 950,
    minHeight: 650,
    frame: false, // frameless custom visual style matching professional apps
    backgroundColor: '#0a0a0c',
    webPreferences: {
      preload: path.join(appRoot, 'dist', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: false,
    },
  });

  mainWindow.loadFile(path.join(appRoot, 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    appendLog('INFO', 'SHUTDOWN', 'Application window closed.');
    mainWindow = null;
  });
}

// Lifecycle events
app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('camera');
    if (status !== 'granted') {
      appendLog('INFO', 'STARTUP', 'Requesting macOS camera permissions...');
      await systemPreferences.askForMediaAccess('camera');
    }
  }

  createWindow();

  // Spawn AI Backend
  const appRoot = app.getAppPath();
  const isPackaged = app.isPackaged;
  
  let pythonExecutable = '';
  let scriptPath = '';

  if (isPackaged) {
    // In production, we assume ai-backend is copied to resources folder
    pythonExecutable = path.join(process.resourcesPath, 'ai-backend', 'venv', 'bin', 'python');
    scriptPath = path.join(process.resourcesPath, 'ai-backend', 'main.py');
  } else {
    pythonExecutable = path.join(appRoot, 'ai-backend', 'venv', 'bin', 'python');
    scriptPath = path.join(appRoot, 'ai-backend', 'main.py');
  }

  appendLog('INFO', 'BACKEND', `Spawning AI backend: ${pythonExecutable} ${scriptPath}`);
  
  try {
    const { spawn } = require('child_process');
    // Use bash to activate the venv and run python to avoid symlink/hardened runtime ENOENT issues
    const activateScript = path.join(path.dirname(scriptPath), 'venv', 'bin', 'activate');
    pythonBackendProcess = spawn('/bin/bash', ['-c', `source "${activateScript}" && python "${scriptPath}"`], {
      cwd: path.dirname(scriptPath),
      detached: false
    });

    pythonBackendProcess.stdout.on('data', (data: any) => {
      console.log(`[AI Backend]: ${data.toString().trim()}`);
    });

    pythonBackendProcess.stderr.on('data', (data: any) => {
      console.error(`[AI Backend Error]: ${data.toString().trim()}`);
    });

    pythonBackendProcess.on('close', (code: number) => {
      appendLog('WARNING', 'BACKEND', `AI backend exited with code ${code}`);
    });
  } catch (e: any) {
    appendLog('ERROR', 'BACKEND', `Failed to spawn AI backend: ${e.message}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  if (pythonBackendProcess) {
    appendLog('INFO', 'SHUTDOWN', 'Killing AI backend process');
    pythonBackendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC IPC Listeners Mapping ---

// Window Controls
ipcMain.on('app:exit', () => {
  appendLog('INFO', 'SHUTDOWN', 'App exit triggered by user command.');
  app.quit();
});

ipcMain.on('app:minimize', () => {
  mainWindow?.minimize();
});

// Licensing & Activation Channels
ipcMain.handle('license:activate', async (_, email: string, key: string) => {
  appendLog('INFO', 'ACTIVATION', `Activation attempt for email: ${email}`);
  const result = await activateLicense(email, key);
  if (result.success) {
    appendLog('INFO', 'ACTIVATION', 'Activation succeeded. Session token signed.');
  } else {
    appendLog('WARNING', 'ACTIVATION', `Activation failed: ${result.message}`);
  }
  return result;
});

ipcMain.handle('license:validate', async () => {
  return validateLicenseOnline();
});

ipcMain.handle('license:deactivate', async () => {
  appendLog('INFO', 'ACTIVATION', 'Deactivation triggered on local machine.');
  deactivateLicenseLocal();
  return { success: true };
});

ipcMain.handle('license:checkLocalStatus', async () => {
  const token = loadActivationToken();
  return { activated: !!token };
});

// Hardware Profile
ipcMain.handle('hardware:getProfile', async () => {
  return detectHardware();
});

// Model Inventory Controls
ipcMain.handle('models:getStatus', async () => {
  return getModelStatusList();
});

ipcMain.handle('models:download', async (_, id: string) => {
  appendLog('INFO', 'MODELS', `Downloading model weight pack: ${id}`);
  return downloadModel(id, (progress) => {
    mainWindow?.webContents.send('models:downloadProgress', { modelId: id, progress });
  });
});

ipcMain.handle('models:repair', async (_, id: string) => {
  appendLog('INFO', 'MODELS', `Repairing model weight: ${id}`);
  return repairModel(id, (progress) => {
    mainWindow?.webContents.send('models:downloadProgress', { modelId: id, progress });
  });
});

ipcMain.handle('models:getStats', async () => {
  return getStorageUsage();
});

// Software Updates
ipcMain.handle('updater:checkForUpdates', async () => {
  appendLog('INFO', 'UPDATES', 'Checking for software updates...');
  return checkForUpdates();
});

ipcMain.handle('updater:downloadUpdate', async (_, url: string, checksum?: string) => {
  appendLog('INFO', 'UPDATES', `Downloading update from: ${url}`);
  return downloadUpdate(url, checksum, (progress) => {
    mainWindow?.webContents.send('updater:downloadProgress', progress);
  });
});

ipcMain.handle('updater:cancelDownload', async () => {
  appendLog('INFO', 'UPDATES', 'Update download cancelled by user.');
  cancelDownload();
  return { success: true };
});

ipcMain.handle('updater:installUpdate', async () => {
  appendLog('INFO', 'UPDATES', 'Installing update and restarting...');
  return installUpdate();
});

ipcMain.handle('updater:getVersion', async () => {
  return { version: getCurrentVersion() };
});

// Clean up old update files on startup
cleanupOldUpdates();

// Schedule automatic update checks every 60 minutes
scheduleAutoUpdateCheck(60, mainWindow);

// --- Phase 4 & 5 Library & File IPC Actions ---

// Native image file open dialog selector
ipcMain.handle('dialog:selectFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Native ONNX model file selector
ipcMain.handle('dialog:selectModelFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'ONNX Models', extensions: ['onnx'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Import local image to face library
ipcMain.handle('library:importFace', async (_, filePath: string) => {
  try {
    const filename = `face-${Date.now()}${path.extname(filePath)}`;
    const destPath = path.join(FACES_DIR, filename);
    fs.copyFileSync(filePath, destPath);
    return { success: true, name: filename };
  } catch (e: any) {
    appendLog('ERROR', 'RENDERING', `Import face failed: ${e.message}`);
    return { success: false, error: e.message };
  }
});

// Retrieve uploaded faces
ipcMain.handle('library:getFaces', async () => {
  try {
    const files = fs.readdirSync(FACES_DIR);
    return files.map((file) => ({
      name: file,
      url: `file://${path.join(FACES_DIR, file)}`
    }));
  } catch (e) {
    return [];
  }
});

// Delete face from library
ipcMain.handle('library:deleteFace', async (_, name: string) => {
  try {
    const target = path.join(FACES_DIR, name);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Import custom background to library
ipcMain.handle('library:importBackground', async (_, filePath: string) => {
  try {
    const filename = `bg-${Date.now()}${path.extname(filePath)}`;
    const destPath = path.join(BACKGROUNDS_DIR, filename);
    fs.copyFileSync(filePath, destPath);
    appendLog('INFO', 'RENDERING', `Imported background: ${filename}`);
    return { success: true, name: filename };
  } catch (e: any) {
    appendLog('ERROR', 'RENDERING', `Import background failed: ${e.message}`);
    return { success: false, error: e.message };
  }
});

// Retrieve custom backgrounds list
ipcMain.handle('library:getBackgrounds', async () => {
  try {
    const files = fs.readdirSync(BACKGROUNDS_DIR);
    return files.map((file) => ({
      name: file,
      url: `file://${path.join(BACKGROUNDS_DIR, file)}`
    }));
  } catch (e) {
    return [];
  }
});

// Delete background from library
ipcMain.handle('library:deleteBackground', async (_, name: string) => {
  try {
    const target = path.join(BACKGROUNDS_DIR, name);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Export recorded WebM buffer to local Downloads folder
ipcMain.handle('recording:saveVideo', async (_, arrayBuffer: ArrayBuffer) => {
  try {
    const buffer = Buffer.from(arrayBuffer);
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const filename = `MagicCamAI-Record-${Date.now()}.webm`;
    const outputPath = path.join(downloadsDir, filename);
    fs.writeFileSync(outputPath, buffer);
    appendLog('INFO', 'RECORDING', `Exported recording file to downloads: ${filename}`);
    return { success: true, path: outputPath };
  } catch (e: any) {
    appendLog('ERROR', 'RECORDING', `Save recorded video failed: ${e.message}`);
    return { success: false, error: e.message };
  }
});

// Save Project configurations (Phase 7: Encrypted Local configs saves)
ipcMain.handle('projects:save', async (_, projectsJson: string) => {
  try {
    const enc = encrypt(projectsJson);
    fs.writeFileSync(PROJECTS_FILE, enc, 'utf8');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Load Project configurations (Phase 7: Decrypted Local configs loader)
ipcMain.handle('projects:load', async () => {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return '[]';
    const content = fs.readFileSync(PROJECTS_FILE, 'utf8');
    
    // Check if the content is encrypted (contains colon separation)
    if (content.includes(':')) {
      return decrypt(content);
    }
    return content; // backward compatibility
  } catch (e) {
    return '[]';
  }
});

// --- Phase 5 Identity & Custom Model Import IPC Actions ---

// Import local image to Identity Library
ipcMain.handle('library:importIdentity', async (_, filePath: string) => {
  try {
    const filename = `identity-${Date.now()}${path.extname(filePath)}`;
    const destPath = path.join(IDENTITIES_DIR, filename);
    fs.copyFileSync(filePath, destPath);
    appendLog('INFO', 'RENDERING', `Imported Identity: ${filename}`);
    return { success: true, name: filename };
  } catch (e: any) {
    appendLog('ERROR', 'RENDERING', `Import identity failed: ${e.message}`);
    return { success: false, error: e.message };
  }
});

// Retrieve custom full-body identities
ipcMain.handle('library:getIdentities', async () => {
  try {
    const files = fs.readdirSync(IDENTITIES_DIR);
    return files.map((file) => ({
      name: file,
      url: `file://${path.join(IDENTITIES_DIR, file)}`
    }));
  } catch (e) {
    return [];
  }
});

// Delete identity from library
ipcMain.handle('library:deleteIdentity', async (_, name: string) => {
  try {
    const target = path.join(IDENTITIES_DIR, name);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Generate AI Background using OpenAI
ipcMain.handle('library:generateBackground', async (_, prompt: string, apiKey: string) => {
  if (!apiKey) return { success: false, error: 'OpenAI API Key is missing in Settings.' };
  appendLog('INFO', 'LIBRARY', `Generating AI background for prompt: "${prompt}"`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      })
    });
    
    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errData}`);
    }
    
    const data = await response.json();
    const imageUrl = data.data[0].url;
    
    // Download image and save to backgrounds directory
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    
    const filename = `ai_bg_${Date.now()}.jpg`;
    const targetPath = path.join(BACKGROUNDS_DIR, filename);
    fs.writeFileSync(targetPath, buffer);
    
    appendLog('INFO', 'LIBRARY', `AI Background generated successfully: ${filename}`);
    return { success: true, path: targetPath };
  } catch (e: any) {
    appendLog('ERROR', 'LIBRARY', `AI Background generation failed: ${e.message}`);
    return { success: false, error: e.message };
  }
});

// Import custom ONNX models
ipcMain.handle('models:importAIModel', async (_, filePath: string) => {
  appendLog('INFO', 'MODELS', `Importing custom ONNX model from: ${filePath}`);
  const res = importCustomModel(filePath);
  return res;
});

// --- Phase 6 Optimizer & Logger IPC Actions ---

// Structured logger channel
ipcMain.on('logger:log', (_, level: string, category: string, message: string) => {
  appendLog(level, category, message);
});

// Fetch log logs list
ipcMain.handle('logger:getLogs', async () => {
  try {
    if (!fs.existsSync(LOGS_FILE)) return [];
    const content = fs.readFileSync(LOGS_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (e) {
    return [];
  }
});

// Clear log logs list
ipcMain.handle('logger:clearLogs', async () => {
  try {
    fs.writeFileSync(LOGS_FILE, '[]', 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false };
  }
});

// Save session workspace state (Phase 7: Encrypted last_session saves)
ipcMain.handle('session:save', async (_, stateJson: string) => {
  try {
    const enc = encrypt(stateJson);
    fs.writeFileSync(SESSION_FILE, enc, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false };
  }
});

// Load session workspace state (Phase 7: Decrypted last_session loads)
ipcMain.handle('session:load', async () => {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const content = fs.readFileSync(SESSION_FILE, 'utf8');
    if (content.includes(':')) {
      return decrypt(content);
    }
    return content; // backward compatibility
  } catch (e) {
    return null;
  }
});

// Resources Metrics
ipcMain.handle('resource:getMetrics', async () => {
  try {
    const processMemRSS = process.memoryUsage().rss / (1024 * 1024);
    
    let freeDiskGB = 120;
    try {
      const stats = fs.statfsSync(CONFIG_DIR);
      freeDiskGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);
    } catch (e) {
      // Fallback
    }

    let cacheSizeMB = 0;
    if (fs.existsSync(LOGS_FILE)) {
      cacheSizeMB += fs.statSync(LOGS_FILE).size / (1024 * 1024);
    }

    return {
      success: true,
      processMemoryMB: Math.round(processMemRSS),
      freeDiskGB: Math.round(freeDiskGB),
      cacheSizeMB: Math.round(cacheSizeMB * 100) / 100
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Clear temp files cache
ipcMain.handle('resource:clearCache', async () => {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      fs.writeFileSync(LOGS_FILE, '[]', 'utf8');
    }
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});
