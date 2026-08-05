import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';

export interface HardwareProfile {
  os: string;
  cpu: string;
  ramTotalGB: number;
  gpuVendor: string;
  gpuName: string;
  vramMB: number;
  diskFreeGB: number;
  bestInferenceMode: 'Dedicated GPU' | 'Integrated GPU' | 'CPU';
  isCompatible: boolean;
  warnings: string[];
}

/**
 * Detects system specifications and evaluates compatibility limits
 */
export function detectHardware(): HardwareProfile {
  const profile: HardwareProfile = {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model || 'Unknown CPU',
    ramTotalGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    gpuVendor: 'Generic',
    gpuName: 'Software Rasterizer',
    vramMB: 0,
    diskFreeGB: 0,
    bestInferenceMode: 'CPU',
    isCompatible: true,
    warnings: [],
  };

  // 1. Calculate free disk space (mock/simplified using stats or node checks)
  try {
    if (process.platform === 'win32') {
      const output = execSync('wmic logicaldisk get size,freespace,deviceid').toString();
      const lines = output.trim().split('\n');
      const cDrive = lines.find((l) => l.includes('C:'));
      if (cDrive) {
        const parts = cDrive.trim().split(/\s+/);
        const freeBytes = parseInt(parts[1]);
        profile.diskFreeGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      }
    } else {
      const output = execSync("df -k / | tail -1 | awk '{print $4}'").toString().trim();
      const freeKB = parseInt(output);
      profile.diskFreeGB = Math.round(freeKB / (1024 * 1024));
    }
  } catch (e) {
    profile.diskFreeGB = 20; // safe fallback
  }

  // 2. Query GPU and VRAM
  try {
    if (process.platform === 'win32') {
      const gpuOutput = execSync('wmic path win32_VideoController get name,adapterram').toString();
      const lines = gpuOutput.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s{2,}/);
        if (parts.length >= 2) {
          profile.gpuName = parts[1];
          const bytes = parseInt(parts[0]);
          profile.vramMB = Math.round(bytes / (1024 * 1024)) || 4096;
        } else {
          profile.gpuName = parts[0];
          profile.vramMB = 4096; // windows fallback
        }
      }
    } else if (process.platform === 'darwin') {
      const gpuOutput = execSync("system_profiler SPDisplaysDataType | grep -E 'Chipset Model|VRAM'").toString();
      const lines = gpuOutput.trim().split('\n');
      if (lines.length > 0) {
        const modelLine = lines.find((l) => l.includes('Chipset Model'));
        if (modelLine) {
          profile.gpuName = modelLine.split(':')[1]?.trim() || 'Apple Graphics';
        }
        const vramLine = lines.find((l) => l.includes('VRAM'));
        if (vramLine) {
          const vramStr = vramLine.split(':')[1]?.trim() || '';
          profile.vramMB = parseInt(vramStr) || 4096;
        } else {
          profile.vramMB = 4096; // apple silicon shared fallback
        }
      }
    }
  } catch (e) {
    console.warn('Failed to detect GPU details, using default soft rendering profiles:', e);
  }

  // Define Vendor
  const gpuLower = profile.gpuName.toLowerCase();
  if (gpuLower.includes('nvidia')) {
    profile.gpuVendor = 'NVIDIA';
    profile.bestInferenceMode = 'Dedicated GPU';
  } else if (gpuLower.includes('amd') || gpuLower.includes('radeon')) {
    profile.gpuVendor = 'AMD';
    profile.bestInferenceMode = 'Dedicated GPU';
  } else if (gpuLower.includes('intel')) {
    profile.gpuVendor = 'Intel';
    profile.bestInferenceMode = 'Integrated GPU';
  } else if (gpuLower.includes('apple') || os.platform() === 'darwin') {
    profile.gpuVendor = 'Apple';
    profile.bestInferenceMode = 'Dedicated GPU'; // Apple Unified Memory acts as high perf VRAM
  }

  // 3. System Compatibility checks
  if (profile.ramTotalGB < 4) {
    profile.isCompatible = false;
    profile.warnings.push('Insufficient RAM: MagicCamAI requires at least 4 GB RAM.');
  }

  if (profile.diskFreeGB < 5) {
    profile.isCompatible = false;
    profile.warnings.push('Insufficient Disk Space: MagicCamAI requires at least 5 GB free disk space.');
  }

  return profile;
}
