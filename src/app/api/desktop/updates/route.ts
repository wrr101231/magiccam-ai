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
    const clientVersion = searchParams.get('version') || '1.0.0';
    const os = searchParams.get('os') || 'Windows';

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
        updateAvailable: false,
        latestVersion: '1.0.0',
        releaseNotes: 'You are running the initial stable build.',
      });
    }

    const { data: installers } = await supabase
      .from('installers')
      .select('*')
      .eq('release_id', latestRelease.id)
      .eq('os', os)
      .eq('enabled', true);

    const installer = installers && installers.length > 0 ? installers[0] : null;

    const cleanCurrent = semver.clean(clientVersion) || '0.0.0';
    const cleanLatest = semver.clean(latestRelease.version) || '0.0.0';
    const updateAvailable = semver.gt(cleanLatest, cleanCurrent);

    return NextResponse.json({
      updateAvailable,
      latestVersion: latestRelease.version,
      releaseNotes: latestRelease.release_notes,
      downloadUrl: installer?.file_url || '',
      checksum: installer?.checksum || '',
    });
  } catch (error: any) {
    console.error('Fetch updates error:', error);
    return NextResponse.json(
      { error: 'Internal server error checking software updates' },
      { status: 500 }
    );
  }
}
