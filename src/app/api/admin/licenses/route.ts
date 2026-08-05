import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { generateLicenseKey, calculateExpirationDate } from '@/lib/license';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: licenses, error: licError } = await supabase
      .from('licenses')
      .select('*, profiles(email, role)')
      .order('purchase_date', { ascending: false });

    if (licError) throw licError;

    // Format to match frontend expected structure
    const formatted = (licenses || []).map(l => ({
      ...l,
      user: {
        email: (l as any).profiles?.email,
        role: (l as any).profiles?.role,
      }
    }));

    return NextResponse.json({ licenses: formatted });
  } catch (error) {
    console.error('Fetch admin licenses error:', error);
    return NextResponse.json({ error: 'Internal server error loading licenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, licenseId } = body;

    const supabase = await createClient();

    if (action === 'generate') {
      const { email, plan } = body;
      if (!email || !plan) {
        return NextResponse.json({ error: 'Email and Plan type are required' }, { status: 400 });
      }

      const { data: targetUser, error: usrError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (usrError || !targetUser) {
        return NextResponse.json({ error: 'Target user account not found' }, { status: 404 });
      }

      const key = generateLicenseKey();
      const expirationDate = calculateExpirationDate(plan);

      const { data: license, error: licError } = await supabase
        .from('licenses')
        .insert({
          key,
          plan,
          user_id: targetUser.id,
          expiration_date: expirationDate ? expirationDate.toISOString() : null,
        })
        .select()
        .single();

      if (licError) throw licError;

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_generate_license',
        details: `Generated license ${key} (${plan}) directly for user: ${email}`,
      });

      return NextResponse.json({ message: 'License generated successfully', license });
    }

    if (!licenseId) {
      return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
    }

    const { data: license, error: findError } = await supabase
      .from('licenses')
      .select('*, profiles(email)')
      .eq('id', licenseId)
      .single();

    if (findError || !license) {
      return NextResponse.json({ error: 'License key not found' }, { status: 404 });
    }

    if (action === 'status') {
      const { status } = body;
      if (!status || !['Unused', 'Activated', 'Expired', 'Suspended', 'Revoked'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status type specified' }, { status: 400 });
      }

      const { data: updated, error: updError } = await supabase
        .from('licenses')
        .update({ status })
        .eq('id', licenseId)
        .select()
        .single();

      if (updError) throw updError;

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_update_license_status',
        details: `Modified license status ${license.key} to: ${status}`,
      });

      return NextResponse.json({ message: 'License status updated successfully', license: updated });
    }

    if (action === 'reset_device') {
      const { data: updated, error: updError } = await supabase
        .from('licenses')
        .update({
          status: 'Unused',
          device_fingerprint: null,
          device_name: null,
          device_os: null,
          activation_date: null,
          last_validation_at: null,
        })
        .eq('id', licenseId)
        .select()
        .single();

      if (updError) throw updError;

      // Reset registry rows
      await supabase
        .from('device_registry')
        .delete()
        .eq('license_id', licenseId);

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_reset_device_binding',
        details: `Force un-bound active hardware machine for license key: ${license.key}`,
      });

      return NextResponse.json({ message: 'Hardware device binding reset successfully', license: updated });
    }

    if (action === 'renew') {
      const { months } = body;
      const val = parseInt(months || '12');

      const currentExpiry = license.expiration_date ? new Date(license.expiration_date) : new Date();
      currentExpiry.setMonth(currentExpiry.getMonth() + val);

      const { data: updated, error: updError } = await supabase
        .from('licenses')
        .update({
          expiration_date: currentExpiry.toISOString(),
          status: license.status === 'Expired' ? 'Unused' : license.status,
        })
        .eq('id', licenseId)
        .select()
        .single();

      if (updError) throw updError;

      await supabase.from('audit_logs').insert({
        user_id: session.userId,
        action: 'admin_renew_license',
        details: `Extended expiration date for license key ${license.key} by ${val} months`,
      });

      return NextResponse.json({ message: 'License expiration extended successfully', license: updated });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update license error:', error);
    return NextResponse.json({ error: 'Internal server error updating license' }, { status: 500 });
  }
}
