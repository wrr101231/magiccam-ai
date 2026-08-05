import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign up using Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          display_name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'User registration failed' }, { status: 400 });
    }

    let role = 'USER';
    try {
      // Set first registered user to ADMIN
      const adminClient = tryCreateAdminClient();
      const client = adminClient || supabase;

      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (count === 1) { // Current user is the first profile
        role = 'ADMIN';
        await client
          .from('profiles')
          .update({ role: 'ADMIN' })
          .eq('id', data.user.id);
      }

      // Log registration
      await client.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'register',
        details: `User registered successfully with role: ${role}`,
      });
    } catch (adminErr) {
      console.warn('Admin post-registration tasks skipped:', adminErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
