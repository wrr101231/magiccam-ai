import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { generateLicenseKey, calculateExpirationDate } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, amount } = await req.json();

    if (!plan || !amount) {
      return NextResponse.json({ error: 'Plan and amount are required' }, { status: 400 });
    }

    const licenseKey = generateLicenseKey();
    const purchaseDate = new Date();
    const expirationDate = calculateExpirationDate(plan, purchaseDate);

    const supabase = await createClient();

    // 1. Create License
    const { data: license, error: licError } = await supabase
      .from('licenses')
      .insert({
        key: licenseKey,
        plan,
        status: 'Unused',
        user_id: session.userId,
        purchase_date: purchaseDate.toISOString(),
        expiration_date: expirationDate ? expirationDate.toISOString() : null,
      })
      .select()
      .single();

    if (licError || !license) {
      throw new Error(licError?.message || 'Failed to create license');
    }

    // 2. Create Purchase record
    const gatewayRef = `MOCK-TX-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const { data: purchase, error: purError } = await supabase
      .from('purchases')
      .insert({
        user_id: session.userId,
        license_id: license.id,
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'PAID',
        payment_method: 'Mock Checkout Gateway',
        gateway_ref: gatewayRef,
      })
      .select()
      .single();

    if (purError) {
      // Rollback license creation (delete)
      await supabase.from('licenses').delete().eq('id', license.id);
      throw new Error(purError.message);
    }

    // 3. Log Audit Trail
    await supabase.from('audit_logs').insert({
      user_id: session.userId,
      action: 'purchase_license',
      details: `Purchased plan: ${plan}, key: ${licenseKey}, txRef: ${gatewayRef}`,
    });

    return NextResponse.json({
      message: 'License purchased successfully',
      licenseKey: license.key,
      plan: license.plan,
    });
  } catch (error: any) {
    console.error('Purchase creation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error processing purchase' },
      { status: 500 }
    );
  }
}
