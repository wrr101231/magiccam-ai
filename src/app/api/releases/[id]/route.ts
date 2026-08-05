import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string }>;
}

// PUT: Update a release details (ADMIN only)
export async function PUT(req: NextRequest, context: Context) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { version, buildNumber, status, releaseNotes, minSupportedVersion, aiModelCompatibility } = body;

    const supabase = await createClient();

    const { data: existing, error: findError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ success: false, message: 'Release not found' }, { status: 404 });
    }

    const { data: release, error: updateError } = await supabase
      .from('releases')
      .update({
        version: version || existing.version,
        build_number: buildNumber !== undefined ? buildNumber : existing.build_number,
        status: status || existing.status,
        release_notes: releaseNotes || existing.release_notes,
        min_supported_version: minSupportedVersion !== undefined ? minSupportedVersion : existing.min_supported_version,
        ai_model_compatibility: aiModelCompatibility !== undefined ? aiModelCompatibility : existing.ai_model_compatibility,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      action: 'update_release',
      details: `Updated software release details for version: ${release.version}`,
    });

    return NextResponse.json({ success: true, release });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE: Delete a release (ADMIN only)
export async function DELETE(req: NextRequest, context: Context) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = await createClient();

    const { data: existing, error: findError } = await supabase
      .from('releases')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ success: false, message: 'Release not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('releases')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      action: 'delete_release',
      details: `Deleted release version: ${existing.version}`,
    });

    return NextResponse.json({ success: true, message: 'Release deleted successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
