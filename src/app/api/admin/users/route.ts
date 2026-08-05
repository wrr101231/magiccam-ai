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

    // Fetch all profiles — RLS is_admin() grants full access
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profError) throw profError;

    // Fetch all licenses to attach
    const { data: licenses, error: licError } = await supabase
      .from('licenses')
      .select('id, key, plan, status, user_id');

    if (licError) throw licError;

    // Map profiles into user structure
    const users = (profiles || []).map(p => ({
      id: p.id,
      email: p.email,
      role: p.role,
      createdAt: p.created_at,
      profile: {
        name: p.display_name,
        company: p.company,
        country: p.country,
        avatar: p.avatar_url,
      },
      licenses: licenses ? licenses.filter(l => l.user_id === p.id) : [],
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch admin users error:', error);
    return NextResponse.json({ error: 'Internal server error loading users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, action, role } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and Action are required' }, { status: 400 });
    }

    if (userId === session.userId && action === 'delete') {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const supabase = await createClient();

    if (action === 'update_role') {
      if (!role || !['USER', 'ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
      }

      const { data: profile, error: updError } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updError) throw updError;

      // Audit log (best-effort)
      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_update_user_role',
        details: `Changed role of user ${profile.email} to: ${role}`,
      });

      return NextResponse.json({
        message: 'User role updated successfully',
        user: { id: profile.id, email: profile.email, role: profile.role }
      });
    }

    if (action === 'suspend') {
      const { data: profile, error: updError } = await supabase
        .from('profiles')
        .update({ account_status: 'Suspended', updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updError) throw updError;

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_suspend_user',
        details: `Suspended user account: ${profile.email}`,
      });

      return NextResponse.json({ message: 'User account suspended successfully' });
    }

    if (action === 'activate') {
      const { data: profile, error: updError } = await supabase
        .from('profiles')
        .update({ account_status: 'Active', updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updError) throw updError;

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_activate_user',
        details: `Reactivated user account: ${profile.email}`,
      });

      return NextResponse.json({ message: 'User account activated successfully' });
    }

    if (action === 'delete') {
      // Note: Full user deletion (from auth.users) requires the service role key.
      // For now, we mark them as deleted and remove their profile data.
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const email = profile?.email || 'Unknown User';

      // Delete related data
      await supabase.from('device_registry').delete().eq('user_id', userId);
      await supabase.from('licenses').delete().eq('user_id', userId);
      await supabase.from('purchases').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_delete_user',
        details: `Deleted user account: ${email}`,
      });

      return NextResponse.json({ message: 'User account deleted successfully' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error updating user' }, { status: 500 });
  }
}
