import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RELEASES_DIR = path.join(process.cwd(), 'public', 'releases');

// Ensure releases directory exists
if (!fs.existsSync(RELEASES_DIR)) {
  fs.mkdirSync(RELEASES_DIR, { recursive: true });
}

// POST: Upload an installer file for a release (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const releaseId = formData.get('releaseId') as string | null;
    const os = formData.get('os') as string | null;

    if (!file || !releaseId || !os) {
      return NextResponse.json({ error: 'Missing required fields: file, releaseId, os' }, { status: 400 });
    }

    // Validate OS value
    const validOS = ['Windows', 'macOS', 'Linux'];
    if (!validOS.includes(os)) {
      return NextResponse.json({ error: `Invalid OS. Must be one of: ${validOS.join(', ')}` }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate release exists
    const { data: release, error: relError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (relError || !release) {
      return NextResponse.json({ error: 'Release not found.' }, { status: 404 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Calculate file size in MB
    const fileSizeMB = Math.round((buffer.length / (1024 * 1024)) * 100) / 100;

    // Create safe filename
    const ext = path.extname(file.name) || '.bin';
    const safeName = `MagicCamAI-${release.version}-${os}${ext}`.replace(/\s+/g, '-');
    const outputPath = path.join(RELEASES_DIR, safeName);

    // Write file to disk
    fs.writeFileSync(outputPath, buffer);

    // Create or update installer record in database
    const { data: existingInstaller } = await supabase
      .from('installers')
      .select('*')
      .eq('release_id', releaseId)
      .eq('os', os)
      .maybeSingle();

    let installer;
    if (existingInstaller) {
      const { data: updated, error: updError } = await supabase
        .from('installers')
        .update({
          file_url: `/releases/${safeName}`,
          file_size_mb: fileSizeMB,
          checksum,
          enabled: true,
        })
        .eq('id', existingInstaller.id)
        .select()
        .single();
      
      if (updError) throw updError;
      installer = updated;
    } else {
      const { data: created, error: insError } = await supabase
        .from('installers')
        .insert({
          release_id: releaseId,
          os,
          file_url: `/releases/${safeName}`,
          file_size_mb: fileSizeMB,
          checksum,
          enabled: true,
        })
        .select()
        .single();
      
      if (insError) throw insError;
      installer = created;
    }

    return NextResponse.json({
      success: true,
      installer: {
        id: installer.id,
        os: installer.os,
        fileUrl: installer.file_url,
        fileSizeMB: installer.file_size_mb,
        checksum: installer.checksum,
      },
    });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message || 'Upload failed.' }, { status: 500 });
  }
}
