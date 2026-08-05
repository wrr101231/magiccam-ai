import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: licensesData, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', session.userId)
      .order('purchase_date', { ascending: false });

    const { data: purchasesData, error: purError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (licError || purError) {
      throw new Error(licError?.message || purError?.message || 'Database error');
    }

    // Map keys to camelCase matching dashboard expected props
    const licenses = licensesData ? licensesData.map(l => ({
      id: l.id,
      key: l.key,
      plan: l.plan,
      status: l.status,
      purchaseDate: l.purchase_date,
      expirationDate: l.expiration_date,
      activatedDeviceName: l.device_name,
      activatedDeviceFingerprint: l.device_fingerprint,
      activationDate: l.activation_date,
    })) : [];

    const purchases = purchasesData ? purchasesData.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      paymentMethod: p.payment_method,
      gatewayRef: p.gateway_ref,
      createdAt: p.created_at,
    })) : [];

    return NextResponse.json({ licenses, purchases });
  } catch (error: any) {
    console.error('Fetch licenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching account licenses' },
      { status: 500 }
    );
  }
}
