import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const supabase = await createClient();
  
  await supabase.auth.signOut();

  const response = NextResponse.json({
    message: 'Logged out successfully',
  });

  if (session) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'logout',
        details: 'User logged out',
      });
    } catch (e) {
      console.error('Failed to write logout audit log:', e);
    }
  }

  return response;
}
