import { app, BrowserWindow } from 'electron';
import { loadActivationToken } from './security';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

import config from './config.json';

const PORTAL_URL = process.env.MAGICCAM_PORTAL_URL || config.portalUrl || 'http://localhost:3001';
const CURRENT_VERSION = app.isPackaged ? app.getVersion() : '1.0.0';
const DOWNLOADS_DIR = path.join(os.homedir(), '.magiccam', 'updates');

// Ensure update download directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string;
  releaseNotes: string;
  os: string;
  downloadUrl?: string;
  checksum?: string;
  fileSizeMB?: number;
  buildNumber?: string;
  minSupportedVersion?: string;
}

export interface DownloadProgress {
  percent: number;
  transferredMB: number;
  totalMB: number;
  bytesPerSecond: number;
}

let currentDownloadController: AbortController | null = null;
let downloadedInstallerPath: string | null = null;

/**
 * Checks the web portal server for software updates
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const token = loadActivationToken();
  const currentOS = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux';

  try {
    const res = await fetch(`${PORTAL_URL}/api/desktop/check-updates?currentVersion=${CURRENT_VERSION}&os=${currentOS}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        updateAvailable: data.updateAvailable || false,
        latestVersion: data.latestVersion || CURRENT_VERSION,
        releaseNotes: data.releaseNotes || 'No new updates found.',
        os: currentOS,
        downloadUrl: data.installer?.downloadUrl,
        checksum: data.installer?.checksum,
        fileSizeMB: data.installer?.fileSizeMB,
        buildNumber: data.buildNumber,
        minSupportedVersion: data.minSupportedVersion,
      };
    }
  } catch (e) {
    console.warn('Update check failed, server offline:', e);
  }

  return {
    updateAvailable: false,
    latestVersion: CURRENT_VERSION,
    releaseNotes: 'Offline check: you are on the latest version.',
    os: currentOS,
  };
}

/**
 * Downloads an update installer from the portal server with progress tracking
 */
export async function downloadUpdate(
  downloadUrl: string,
  expectedChecksum: string | undefined,
  onProgress: (progress: DownloadProgress) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  // Cancel any ongoing download
  if (currentDownloadController) {
    currentDownloadController.abort();
  }

  currentDownloadController = new AbortController();

  try {
    const token = loadActivationToken();
    const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${PORTAL_URL}${downloadUrl}`;

    const res = await fetch(fullUrl, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      signal: currentDownloadController.signal,
    });

    if (!res.ok) {
      return { success: false, error: `Download failed with status ${res.status}` };
    }

    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    const totalMB = contentLength / (1024 * 1024);

    // Determine file extension from content-disposition or URL
    const contentDisposition = res.headers.get('content-disposition') || '';
    let filename = 'MagicCamAI-Update';
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    } else {
      const ext = process.platform === 'win32' ? '.exe' : process.platform === 'darwin' ? '.dmg' : '.AppImage';
      filename = `MagicCamAI-Update${ext}`;
    }

    const outputPath = path.join(DOWNLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(outputPath);
    const hash = crypto.createHash('sha256');

    let transferred = 0;
    const startTime = Date.now();

    const reader = res.body?.getReader();
    if (!reader) {
      return { success: false, error: 'Failed to get response stream reader' };
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(value);
      hash.update(value);
      transferred += value.length;

      const elapsed = (Date.now() - startTime) / 1000;
      const bytesPerSecond = elapsed > 0 ? transferred / elapsed : 0;

      onProgress({
        percent: contentLength > 0 ? Math.round((transferred / contentLength) * 100) : 0,
        transferredMB: Math.round((transferred / (1024 * 1024)) * 100) / 100,
        totalMB: Math.round(totalMB * 100) / 100,
        bytesPerSecond: Math.round(bytesPerSecond),
      });
    }

    writeStream.end();

    // Wait for write to complete
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Verify checksum
    const computedChecksum = hash.digest('hex');
    if (expectedChecksum && computedChecksum !== expectedChecksum) {
      // Delete corrupted file
      fs.unlinkSync(outputPath);
      return {
        success: false,
        error: `Checksum verification failed. Expected: ${expectedChecksum.slice(0, 16)}... Got: ${computedChecksum.slice(0, 16)}...`,
      };
    }

    downloadedInstallerPath = outputPath;
    currentDownloadController = null;

    return { success: true, filePath: outputPath };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return { success: false, error: 'Download cancelled by user.' };
    }
    return { success: false, error: e.message || 'Unknown download error' };
  }
}

/**
 * Cancels the currently running download
 */
export function cancelDownload(): void {
  if (currentDownloadController) {
    currentDownloadController.abort();
    currentDownloadController = null;
  }
}

/**
 * Launches the downloaded installer and quits the application
 */
export function installUpdate(): { success: boolean; error?: string } {
  if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
    return { success: false, error: 'No downloaded update found. Please download the update first.' };
  }

  try {
    if (process.platform === 'win32') {
      // Launch NSIS installer in silent mode and quit
      spawn(downloadedInstallerPath, ['/S'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else if (process.platform === 'darwin') {
      // Open DMG on macOS
      spawn('open', [downloadedInstallerPath], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else {
      // Make AppImage executable and launch
      fs.chmodSync(downloadedInstallerPath, '755');
      spawn(downloadedInstallerPath, [], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    }

    // Quit app after a short delay to let the installer start
    setTimeout(() => {
      app.quit();
    }, 1500);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to launch installer' };
  }
}

/**
 * Returns the currently installed version
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

/**
 * Cleans up old update files from the downloads directory
 */
export function cleanupOldUpdates(): void {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) return;
    const files = fs.readdirSync(DOWNLOADS_DIR);
    for (const file of files) {
      const filePath = path.join(DOWNLOADS_DIR, file);
      const stat = fs.statSync(filePath);
      // Remove files older than 7 days
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) {
    console.warn('Failed to clean old updates:', e);
  }
}

/**
 * Schedules automatic update checks at regular intervals
 */
export function scheduleAutoUpdateCheck(
  intervalMinutes: number,
  mainWindow: BrowserWindow | null
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const result = await checkForUpdates();
      if (result.updateAvailable && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:updateAvailable', {
          version: result.latestVersion,
          releaseNotes: result.releaseNotes,
          downloadUrl: result.downloadUrl,
          checksum: result.checksum,
          fileSizeMB: result.fileSizeMB,
        });
      }
    } catch (e) {
      console.warn('Scheduled update check failed:', e);
    }
  }, intervalMinutes * 60 * 1000);
}
