import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'magiccamai-default-local-super-secret-key-12345';

// POST: Request secure time-limited download token
export async function POST(req: NextRequest) {
  try {
    // 1. Verify user session
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication expired' }, { status: 401 });
    }

    const supabase = await createClient();

    // 2. Verify active license eligibility
    const { data: licenses, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', session.userId)
      .in('status', ['Unused', 'Activated']);

    if (licError) throw licError;

    if ((!licenses || licenses.length === 0) && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Active license required to download desktop installer packages' }, { status: 403 });
    }

    const body = await req.json();
    const { installerId, modelId } = body;

    if (!installerId && !modelId) {
      return NextResponse.json({ success: false, message: 'Please specify an installer or AI model package to download' }, { status: 400 });
    }

    // 3. Generate secure download token valid for 5 minutes
    const token = jwt.sign(
      {
        userId: session.userId,
        installerId: installerId || null,
        modelId: modelId || null,
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/downloads/file?token=${token}`,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
