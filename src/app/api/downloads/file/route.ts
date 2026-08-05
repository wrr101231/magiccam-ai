import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'magiccamai-default-local-super-secret-key-12345';

// GET: Verifies token and serves actual file binary streams
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Missing download token' }, { status: 400 });
    }

    // 1. Verify JWT download credentials
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, message: 'Download token expired or invalid' }, { status: 401 });
    }

    const { userId, installerId, modelId } = decoded;

    let filename = '';
    let version = '';
    let osName = 'Universal';
    let fileUrl = '';

    // Use admin client if available, otherwise fall back to server client
    const admin = tryCreateAdminClient();
    const supabase = admin || await createClient();

    // 2. Query target entity
    if (installerId) {
      const { data: installer, error: instError } = await supabase
        .from('installers')
        .select('*, releases(*)')
        .eq('id', installerId)
        .single();

      if (instError || !installer || !installer.enabled) {
        return NextResponse.json({ success: false, message: 'This installer version is not currently available. Please download the latest available release or contact support.' }, { status: 404 });
      }

      // Supabase auto-resolves joined object key names based on schema
      const release = (installer as any).releases;
      version = release?.version || '1.0.0';
      osName = installer.os;
      fileUrl = installer.file_url;
      filename = fileUrl.split('/').pop() || `MagicCamAI-${version}-${osName}${osName === 'Windows' ? '.exe' : '.dmg'}`;

      // Update count
      await supabase
        .from('installers')
        .update({ download_count: (installer.download_count || 0) + 1 })
        .eq('id', installer.id);
    } else if (modelId) {
      const { data: model, error: modError } = await supabase
        .from('ai_model_packages')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modError || !model || !model.enabled) {
        return NextResponse.json({ success: false, message: 'This model package is not currently available.' }, { status: 404 });
      }

      version = model.version;
      fileUrl = model.file_url;
      filename = `${model.model_id}-v${version}.onnx`;

      await supabase
        .from('ai_model_packages')
        .update({ download_count: (model.download_count || 0) + 1 })
        .eq('id', model.id);
    } else {
      return NextResponse.json({ success: false, message: 'No installer or model specified.' }, { status: 400 });
    }

    // 3. Record download history
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    await supabase
      .from('download_history')
      .insert({
        user_id: userId,
        filename,
        version,
        os: osName,
        ip_address: ip,
        status: 'Completed',
      });

    // 4. Serve the real file from disk
    const filePath = path.join(process.cwd(), 'public', fileUrl);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        message: 'This version is not currently available. Please download the latest available release or contact support.',
      }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const stat = fs.statSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
