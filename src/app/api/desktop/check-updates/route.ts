import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import semver from 'semver';

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currentVersion = searchParams.get('currentVersion');
    const os = searchParams.get('os') || 'Windows';

    if (!currentVersion) {
      return NextResponse.json({ success: false, message: 'Missing currentVersion parameter' }, { status: 400 });
    }

    const supabase = createAnonClient();

    const { data: latestRelease, error: relError } = await supabase
      .from('releases')
      .select('*')
      .eq('status', 'Stable')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (relError) throw relError;

    if (!latestRelease) {
      return NextResponse.json({
        success: true,
        updateAvailable: false,
        message: 'No stable release published yet.',
      });
    }

    const { data: installers } = await supabase
      .from('installers')
      .select('*')
      .eq('release_id', latestRelease.id)
      .eq('os', os)
      .eq('enabled', true);

    const { data: models } = await supabase
      .from('ai_model_packages')
      .select('*')
      .eq('release_id', latestRelease.id)
      .eq('enabled', true);

    const cleanCurrent = semver.clean(currentVersion) || '0.0.0';
    const cleanLatest = semver.clean(latestRelease.version) || '0.0.0';
    const updateAvailable = semver.gt(cleanLatest, cleanCurrent);

    const installer = installers && installers.length > 0 ? installers[0] : null;

    return NextResponse.json({
      success: true,
      updateAvailable,
      latestVersion: latestRelease.version,
      buildNumber: latestRelease.build_number,
      releaseNotes: latestRelease.release_notes,
      minSupportedVersion: latestRelease.min_supported_version,
      aiModelCompatibility: latestRelease.ai_model_compatibility,
      installer: installer ? {
        id: installer.id,
        fileSizeMB: installer.file_size_mb,
        checksum: installer.checksum,
        downloadUrl: `/api/downloads/file?token=`,
      } : null,
      models: models ? models.map((mod: any) => ({
        modelId: mod.model_id,
        name: mod.name,
        version: mod.version,
        fileSizeMB: mod.file_size_mb,
        checksum: mod.checksum,
      })) : [],
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currentVersion, os } = await req.json();
    const url = new URL(req.url);
    url.searchParams.set('currentVersion', currentVersion);
    url.searchParams.set('os', os || 'Windows');
    return GET(new NextRequest(url, { headers: req.headers }));
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
