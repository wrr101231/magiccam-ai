import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const ENCRYPTION_KEY = crypto.scryptSync(os.hostname() || 'magiccam-secret', 'salt-key-magic-cam', 32);
const IV_LENGTH = 16;

const CONFIG_DIR = path.join(os.homedir(), '.magiccam');
const TOKEN_FILE = path.join(CONFIG_DIR, 'session.enc');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.enc');

// Ensure directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Encrypts string content using AES-256-CBC
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts string content using AES-256-CBC
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Saves the activation token securely
 */
export function saveActivationToken(token: string): void {
  const enc = encrypt(token);
  fs.writeFileSync(TOKEN_FILE, enc, 'utf8');
}

/**
 * Reads the activation token securely
 */
export function loadActivationToken(): string | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    const enc = fs.readFileSync(TOKEN_FILE, 'utf8');
    return decrypt(enc);
  } catch (e) {
    console.error('Failed to decrypt activation token:', e);
    return null;
  }
}

/**
 * Clears activation token on logout or revocation
 */
export function deleteActivationToken(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
  }
}

/**
 * Generates a stable hardware fingerprint utilizing system commands
 */
export function getHardwareFingerprint(): string {
  let hardwareInfo = '';

  try {
    if (process.platform === 'win32') {
      // Fetch CPU ID and Motherboard UUID on Windows
      const cpuId = execSync('wmic cpu get processorid').toString().replace(/ProcessorId/g, '').trim();
      const boardUuid = execSync('wmic csproduct get uuid').toString().replace(/UUID/g, '').trim();
      hardwareInfo = `${cpuId}-${boardUuid}`;
    } else if (process.platform === 'darwin') {
      // Fetch Hardware UUID on macOS
      const macUuid = execSync("system_profiler SPHardwareDataType | grep 'Hardware UUID' | awk -F: '{print $2}'").toString().trim();
      hardwareInfo = macUuid;
    } else {
      // Fallback for Linux or others
      hardwareInfo = execSync('cat /var/lib/dbus/machine-id 2>/dev/null || cat /etc/machine-id').toString().trim();
    }
  } catch (e) {
    console.warn('Failed to fetch hardware identifiers, generating static hash fallback:', e);
  }

  // If commands fail or return empty, fallback to MAC address + username
  if (!hardwareInfo) {
    const networkInterfaces = os.networkInterfaces();
    const macs = Object.values(networkInterfaces)
      .flat()
      .filter((info) => info && info.mac && info.mac !== '00:00:00:00:00:00')
      .map((info) => info!.mac);
    hardwareInfo = macs.join('-') || os.userInfo().username || 'default-workstation';
  }

  return crypto.createHash('sha256').update(hardwareInfo).digest('hex');
}
