import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: logsData, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(email, role)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Format to match frontend structure
    const logs = (logsData || []).map(l => ({
      ...l,
      user: {
        email: (l as any).profiles?.email,
        role: (l as any).profiles?.role,
      }
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Fetch admin audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error loading audit history' }, { status: 500 });
  }
}
