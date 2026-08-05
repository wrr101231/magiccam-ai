import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

// GET: Retrieve download logs list
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    let query = supabase.from('download_history').select('*');

    if (session.role !== 'ADMIN') {
      query = query.eq('user_id', session.userId);
    }

    const { data: historyData, error } = await query.order('downloaded_at', { ascending: false });

    if (error) throw error;

    const history = historyData ? historyData.map(h => ({
      id: h.id,
      filename: h.filename,
      version: h.version,
      os: h.os,
      status: h.status,
      downloadedAt: h.downloaded_at,
    })) : [];

    return NextResponse.json({ success: true, history });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
