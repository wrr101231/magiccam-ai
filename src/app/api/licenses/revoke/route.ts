import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { licenseId } = await req.json();
    if (!licenseId) {
      return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify ownership and state
    const { data: license, error: findError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .eq('user_id', session.userId)
      .single();

    if (findError || !license) {
      return NextResponse.json({ error: 'License not found or access denied' }, { status: 404 });
    }

    if (license.status !== 'Activated') {
      return NextResponse.json({ error: 'License is not currently active on any device' }, { status: 400 });
    }

    const deviceName = license.device_name || 'Unknown Device';
    const fingerprint = license.device_fingerprint || 'Unknown Fingerprint';

    // 2. Perform database update using Admin Client (bypassing user RLS constraints for write-backs)
    const admin = createAdminClient();

    // Reset license fields
    const { error: updateError } = await admin
      .from('licenses')
      .update({
        status: 'Unused',
        device_fingerprint: null,
        device_name: null,
        device_os: null,
        activation_date: null,
        last_validation_at: null,
      })
      .eq('id', licenseId);

    if (updateError) throw updateError;

    // Delete device registry entry
    await admin
      .from('device_registry')
      .delete()
      .eq('license_id', licenseId);

    // Log in audit log
    await admin.from('audit_logs').insert({
      user_id: session.userId,
      action: 'deactivate_license',
      details: `De-activated device "${deviceName}" (fingerprint: ${fingerprint}) for license: ${license.key}`,
    });

    return NextResponse.json({
      message: 'Device binding successfully removed. The license key can now be used on another computer.',
    });
  } catch (error: any) {
    console.error('Revoke license error:', error);
    return NextResponse.json(
      { error: 'Internal server error de-activating device' },
      { status: 500 }
    );
  }
}
