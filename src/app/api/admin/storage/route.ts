import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

// GET: Retrieve Storage Configurations
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      config: {
        backend: 'supabase',
        status: 'connected',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Save Storage Configurations
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      action: 'update_storage_config',
      details: 'Updated storage backend settings to: supabase',
    });

    return NextResponse.json({
      success: true,
      config: {
        backend: 'supabase',
        status: 'connected',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
