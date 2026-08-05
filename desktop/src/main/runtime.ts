import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const MODELS_DIR = path.join(os.homedir(), '.magiccam', 'models');

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  sizeMB: number;
  status: 'Installed' | 'Missing' | 'Corrupted' | 'Downloading';
  downloadProgress?: number;
  checksum: string;
  isCustom?: boolean;
}

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Predefined model list and metadata
const KNOWN_MODELS: ModelInfo[] = [
  {
    id: 'face-landmark-extractor',
    name: 'Face Landmark Extractor',
    version: '1.2.0',
    sizeMB: 84,
    status: 'Missing',
    checksum: 'a872bf89c562e19df1f4f5a914c0a872bf89c562e19df1f4f5a914c0a872',
  },
  {
    id: 'face-swap-blender',
    name: 'Face Swap Blender Engine',
    version: '2.0.1',
    sizeMB: 195,
    status: 'Missing',
    checksum: 'b372cac221f4f5a914c0a872bf89c562e19df1f4f5a914c0a872bf89c5',
  },
  {
    id: 'background-segmentation',
    name: 'AI Background Segmentation Model',
    version: '1.0.4',
    sizeMB: 120,
    status: 'Missing',
    checksum: '4e82bfca91f4f5a914c0a872bf89c562e19df1f4f5a914c0a872bf89c5',
  },
];

/**
 * Calculates SHA-256 hash of a file
 */
function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Scans the local model directory and evaluates statuses, including custom imported models
 */
export async function getModelStatusList(): Promise<ModelInfo[]> {
  const list: ModelInfo[] = [];

  // 1. Process Predefined Models
  for (const model of KNOWN_MODELS) {
    const filePath = path.join(MODELS_DIR, `${model.id}.onnx`);
    
    if (!fs.existsSync(filePath)) {
      list.push({ ...model, status: 'Missing' });
      continue;
    }

    try {
      const hash = await calculateFileHash(filePath);
      if (hash === model.checksum) {
        list.push({ ...model, status: 'Installed' });
      } else {
        list.push({ ...model, status: 'Corrupted' });
      }
    } catch (e) {
      list.push({ ...model, status: 'Corrupted' });
    }
  }

  // 2. Scan and Index Custom Models
  try {
    const files = fs.readdirSync(MODELS_DIR);
    for (const file of files) {
      if (!file.endsWith('.onnx')) continue;
      const modelId = path.basename(file, '.onnx');
      
      // If it is NOT a predefined model, it is a custom imported one
      if (!KNOWN_MODELS.some((m) => m.id === modelId)) {
        const filePath = path.join(MODELS_DIR, file);
        const stat = fs.statSync(filePath);
        
        list.push({
          id: modelId,
          name: modelId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) + ' (Custom)',
          version: '1.0.0',
          sizeMB: Math.round(stat.size / (1024 * 1024)),
          status: 'Installed',
          checksum: 'CUSTOM-IMPORT',
          isCustom: true
        });
      }
    }
  } catch (e) {
    console.error('Scan custom models failed:', e);
  }

  return list;
}

/**
 * Simulates model download with progress reporting via IPC callback
 */
export function downloadModel(
  modelId: string, 
  onProgress: (progress: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const model = KNOWN_MODELS.find((m) => m.id === modelId);
    if (!model) {
      resolve(false);
      return;
    }

    const filePath = path.join(MODELS_DIR, `${modelId}.onnx`);
    let progress = 0;

    const interval = setInterval(() => {
      progress += 10;
      onProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        fs.writeFileSync(filePath, model.checksum, 'utf8');
        resolve(true);
      }
    }, 150);
  });
}

/**
 * Force deletes and downloads model files
 */
export async function repairModel(
  modelId: string, 
  onProgress: (progress: number) => void
): Promise<boolean> {
  const filePath = path.join(MODELS_DIR, `${modelId}.onnx`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return downloadModel(modelId, onProgress);
}

/**
 * Imports a custom ONNX model from the user's filesystem
 */
export async function importCustomModel(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filename = path.basename(filePath);
    if (!filename.endsWith('.onnx')) {
      return { success: false, error: 'Only compatible .onnx models are supported.' };
    }

    const destPath = path.join(MODELS_DIR, filename);
    fs.copyFileSync(filePath, destPath);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Returns model manager storage statistics
 */
export function getStorageUsage(): { totalMB: number; maxMB: number; directoryPath: string } {
  let totalMB = 0;
  if (fs.existsSync(MODELS_DIR)) {
    const files = fs.readdirSync(MODELS_DIR);
    for (const file of files) {
      const stat = fs.statSync(path.join(MODELS_DIR, file));
      totalMB += stat.size / (1024 * 1024);
    }
  }

  const maxMB = KNOWN_MODELS.reduce((acc, curr) => acc + curr.sizeMB, 0);

  return {
    totalMB: Math.round(totalMB),
    maxMB,
    directoryPath: MODELS_DIR,
  };
}
