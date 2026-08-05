/**
 * MagicCamAI Supabase Release Seed Script
 * 
 * Automatically creates a Release record and Installer records in Supabase
 * after building the desktop application.
 * 
 * Usage: node scripts/seed-release.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually from .env.local
const dotenvPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(dotenvPath)) {
  const envConfig = fs.readFileSync(dotenvPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('⚠ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const VERSION = '1.0.0';
const BUILD_NUMBER = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
const RELEASES_DIR = path.join(__dirname, '..', 'public', 'releases');
const DESKTOP_RELEASE_DIR = path.join(__dirname, '..', 'desktop', 'release');

// Ensure releases directory exists
if (!fs.existsSync(RELEASES_DIR)) {
  fs.mkdirSync(RELEASES_DIR, { recursive: true });
}

function findAndCopyArtifacts() {
  const artifacts = [];

  // macOS DMG
  const dmgFiles = findFilesTopLevel(DESKTOP_RELEASE_DIR, '.dmg');
  if (dmgFiles.length > 0) {
    const src = dmgFiles[0];
    const destName = `MagicCamAI-${VERSION}-macOS.dmg`;
    const destPath = path.join(RELEASES_DIR, destName);
    fs.copyFileSync(src, destPath);
    const sizeMB = getFileSizeMB(destPath);
    const checksum = calculateChecksum(destPath);
    artifacts.push({ os: 'macOS', fileUrl: `/releases/${destName}`, fileSizeMB: sizeMB, checksum });
    console.log(`  ✓ macOS DMG: ${destName} (${sizeMB} MB)`);
  }

  // Fallback macOS ZIP
  if (dmgFiles.length === 0) {
    const appDir = path.join(DESKTOP_RELEASE_DIR, 'mac', 'MagicCamAI.app');
    if (fs.existsSync(appDir)) {
      const destName = `MagicCamAI-${VERSION}-macOS.zip`;
      const destPath = path.join(RELEASES_DIR, destName);
      const { execSync } = require('child_process');
      try {
        execSync(`ditto -c -k --sequesterRsrc --keepParent "${appDir}" "${destPath}"`, { stdio: 'pipe' });
        const sizeMB = getFileSizeMB(destPath);
        const checksum = calculateChecksum(destPath);
        artifacts.push({ os: 'macOS', fileUrl: `/releases/${destName}`, fileSizeMB: sizeMB, checksum });
        console.log(`  ✓ macOS ZIP: ${destName} (${sizeMB} MB)`);
      } catch (e) {
        console.warn(`  ⚠ Failed to zip .app: ${e.message}`);
      }
    }
  }

  // Windows EXE
  const setupExe = path.join(DESKTOP_RELEASE_DIR, `MagicCamAI-Setup-${VERSION}.exe`);
  if (fs.existsSync(setupExe)) {
    const destName = `MagicCamAI-Setup-${VERSION}.exe`;
    const destPath = path.join(RELEASES_DIR, destName);
    fs.copyFileSync(setupExe, destPath);
    const sizeMB = getFileSizeMB(destPath);
    const checksum = calculateChecksum(destPath);
    artifacts.push({ os: 'Windows', fileUrl: `/releases/${destName}`, fileSizeMB: sizeMB, checksum });
    console.log(`  ✓ Windows EXE: ${destName} (${sizeMB} MB)`);
  }

  return artifacts;
}

function findFilesTopLevel(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext) && fs.statSync(path.join(dir, f)).isFile())
    .map(f => path.join(dir, f));
}

function getFileSizeMB(filePath) {
  const stat = fs.statSync(filePath);
  return Math.round((stat.size / (1024 * 1024)) * 100) / 100;
}

function calculateChecksum(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  console.log('\n🚀 MagicCamAI Supabase Release Seed\n');
  console.log('Scanning for build artifacts...');
  
  const artifacts = findAndCopyArtifacts();

  if (artifacts.length === 0) {
    console.log('\n⚠ No build artifacts found. Run "npm run pack" or "npm run dist" in the desktop/ directory first.');
    console.log('  Expected location:', DESKTOP_RELEASE_DIR);
    process.exit(1);
  }

  console.log(`\nFound ${artifacts.length} artifact(s). Seeding Supabase...\n`);

  // Clean stale releases
  const { data: staleReleases } = await supabase
    .from('releases')
    .select('*, installers(*)');

  if (staleReleases) {
    for (const stale of staleReleases) {
      if (stale.version !== VERSION) {
        // Delete release if installers have fake references
        const hasRealFiles = stale.installers.some(i => {
          const realPath = path.join(__dirname, '..', 'public', i.file_url);
          return fs.existsSync(realPath);
        });
        if (!hasRealFiles) {
          await supabase.from('installers').delete().eq('release_id', stale.id);
          await supabase.from('releases').delete().eq('id', stale.id);
          console.log(`  ✗ Removed stale placeholder release: v${stale.version}`);
        }
      }
    }
  }

  // Upsert the Release record
  const { data: existingRelease } = await supabase
    .from('releases')
    .select('id')
    .eq('version', VERSION)
    .maybeSingle();

  let releaseId;
  const releaseNotes = `MagicCamAI v${VERSION} — Initial commercial release.\n\nFeatures:\n• Real-time AI face swap powered by local models\n• AI background replacement\n• Full-body identity replacement\n• Professional streamlined workspace\n• Identity & background libraries\n• Hardware-accelerated GPU inference\n• Automatic update system`;

  if (existingRelease) {
    const { data: updated } = await supabase
      .from('releases')
      .update({
        build_number: BUILD_NUMBER,
        status: 'Stable',
        release_notes: releaseNotes,
      })
      .eq('id', existingRelease.id)
      .select()
      .single();
    
    releaseId = updated.id;
    console.log(`  ✓ Updated existing release: v${VERSION}`);
  } else {
    const { data: created } = await supabase
      .from('releases')
      .insert({
        version: VERSION,
        build_number: BUILD_NUMBER,
        status: 'Stable',
        release_notes: releaseNotes,
        min_supported_version: '1.0.0',
        ai_model_compatibility: 'v1-compatible',
      })
      .select()
      .single();
    
    releaseId = created.id;
    console.log(`  ✓ Created new release: v${VERSION}`);
  }

  // Clear current installers for this release
  await supabase.from('installers').delete().eq('release_id', releaseId);

  // Insert fresh installers
  for (const artifact of artifacts) {
    const { error } = await supabase
      .from('installers')
      .insert({
        release_id: releaseId,
        os: artifact.os,
        file_url: artifact.fileUrl,
        file_size_mb: artifact.fileSizeMB,
        checksum: artifact.checksum,
        enabled: true,
      });

    if (error) {
      console.error(`  ✗ Failed to seed ${artifact.os} installer:`, error.message);
    } else {
      console.log(`  ✓ Created ${artifact.os} installer (${artifact.fileSizeMB} MB)`);
    }
  }

  console.log('\n✅ Supabase Release seeded successfully!');
  console.log(`   Version: ${VERSION}`);
  console.log(`   Build: ${BUILD_NUMBER}`);
  console.log(`   Artifacts: ${artifacts.map(a => a.os).join(', ')}`);
  console.log('\n   Customers can now download from the Dashboard → Download Center.\n');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
