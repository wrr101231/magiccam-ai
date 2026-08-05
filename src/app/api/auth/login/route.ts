import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Log login action (best-effort)
    try {
      const adminClient = tryCreateAdminClient();
      if (adminClient) {
        await adminClient.from('audit_logs').insert({
          user_id: data.user.id,
          action: 'login',
          details: 'User logged in successfully',
        });
      } else {
        // Fall back to user client — RLS INSERT policy on audit_logs allows this
        await supabase.from('audit_logs').insert({
          user_id: data.user.id,
          action: 'login',
          details: 'User logged in successfully',
        });
      }
    } catch (auditErr) {
      console.warn('Post-login audit log skipped:', auditErr);
    }

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'USER',
        profile: profile,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
