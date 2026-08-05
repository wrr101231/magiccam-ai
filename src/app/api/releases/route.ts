import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

// GET: Retrieve all published releases list (public — no auth required)
export async function GET() {
  try {
    const supabase = await createClient();
    
    // RLS allows anyone to view releases, installers, and ai_model_packages
    const { data: releases, error: relError } = await supabase
      .from('releases')
      .select('*')
      .order('created_at', { ascending: false });

    if (relError) throw relError;

    // Fetch related installers and models for all releases
    const releaseIds = (releases || []).map(r => r.id);
    
    const { data: installers, error: instError } = await supabase
      .from('installers')
      .select('*')
      .in('release_id', releaseIds);

    const { data: models, error: modError } = await supabase
      .from('ai_model_packages')
      .select('*')
      .in('release_id', releaseIds);

    if (instError || modError) throw instError || modError;

    // Map installers and models back to releases matching camelCase
    const populatedReleases = (releases || []).map(r => ({
      id: r.id,
      version: r.version,
      buildNumber: r.build_number,
      status: r.status,
      releaseNotes: r.release_notes,
      createdAt: r.created_at,
      minSupportedVersion: r.min_supported_version,
      aiModelCompatibility: r.ai_model_compatibility,
      installers: installers
        ? installers
            .filter((i: any) => i.release_id === r.id)
            .map((i: any) => ({
              id: i.id,
              os: i.os,
              fileUrl: i.file_url,
              fileSizeMB: Number(i.file_size_mb),
              checksum: i.checksum,
              downloadCount: i.download_count,
              enabled: i.enabled,
            }))
        : [],
      models: models
        ? models
            .filter((m: any) => m.release_id === r.id)
            .map((m: any) => ({
              id: m.id,
              modelId: m.model_id,
              name: m.name,
              version: m.version,
              fileUrl: m.file_url,
              fileSizeMB: Number(m.file_size_mb),
              checksum: m.checksum,
              downloadCount: m.download_count,
              enabled: m.enabled,
            }))
        : [],
    }));

    return NextResponse.json({ success: true, releases: populatedReleases });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Create a new release (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      version,
      buildNumber,
      status,
      releaseNotes,
      minSupportedVersion,
      aiModelCompatibility,
      installers = [],
      models = [],
    } = body;

    if (!version || !releaseNotes) {
      return NextResponse.json({ success: false, message: 'Missing version or release notes' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check unique version
    const { data: existing } = await supabase
      .from('releases')
      .select('id')
      .eq('version', version)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, message: 'Version number already exists' }, { status: 400 });
    }

    // Insert Release
    const { data: release, error: relError } = await supabase
      .from('releases')
      .insert({
        version,
        build_number: buildNumber,
        status: status || 'Stable',
        release_notes: releaseNotes,
        min_supported_version: minSupportedVersion,
        ai_model_compatibility: aiModelCompatibility,
      })
      .select()
      .single();

    if (relError || !release) throw relError;

    // Insert Installers
    if (installers.length > 0) {
      const installerRows = installers.map((ins: any) => ({
        release_id: release.id,
        os: ins.os,
        file_url: ins.fileUrl || ins.file_url,
        file_size_mb: parseFloat(ins.fileSizeMB || ins.file_size_mb) || 0,
        checksum: ins.checksum || 'sha256-pending',
        enabled: ins.enabled !== false,
      }));

      const { error: instError } = await supabase.from('installers').insert(installerRows);
      if (instError) throw instError;
    }

    // Insert AI Models
    if (models.length > 0) {
      const modelRows = models.map((mod: any) => ({
        release_id: release.id,
        model_id: mod.modelId || mod.model_id,
        name: mod.name,
        version: mod.version || '1.0.0',
        file_url: mod.fileUrl || mod.file_url,
        file_size_mb: parseFloat(mod.fileSizeMB || mod.file_size_mb) || 0,
        checksum: mod.checksum || 'sha256-pending',
        enabled: mod.enabled !== false,
      }));

      const { error: modError } = await supabase.from('ai_model_packages').insert(modelRows);
      if (modError) throw modError;
    }

    // Log admin action
    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      action: 'create_release',
      details: `Published software release version: ${version} (${status})`,
    });

    // Retrieve fully populated release
    const { data: finalInstallers } = await supabase.from('installers').select('*').eq('release_id', release.id);
    const { data: finalModels } = await supabase.from('ai_model_packages').select('*').eq('release_id', release.id);

    return NextResponse.json({
      success: true,
      release: {
        id: release.id,
        version: release.version,
        buildNumber: release.build_number,
        status: release.status,
        releaseNotes: release.release_notes,
        createdAt: release.created_at,
        minSupportedVersion: release.min_supported_version,
        aiModelCompatibility: release.ai_model_compatibility,
        installers: finalInstallers ? finalInstallers.map((i: any) => ({
          id: i.id,
          os: i.os,
          fileUrl: i.file_url,
          fileSizeMB: Number(i.file_size_mb),
          checksum: i.checksum,
          downloadCount: i.download_count,
          enabled: i.enabled,
        })) : [],
        models: finalModels ? finalModels.map((m: any) => ({
          id: m.id,
          modelId: m.model_id,
          name: m.name,
          version: m.version,
          fileUrl: m.file_url,
          fileSizeMB: Number(m.file_size_mb),
          checksum: m.checksum,
          downloadCount: m.download_count,
          enabled: m.enabled,
        })) : [],
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
