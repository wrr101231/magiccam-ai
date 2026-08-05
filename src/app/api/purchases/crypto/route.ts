import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { plan, amount, txHash, walletId } = body;

    if (!plan || !amount || !txHash || !walletId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Create the order in PENDING status
    const { error } = await supabase
      .from('orders')
      .insert([{
        user_id: session.userId,
        user_email: session.email,
        plan_name: plan,
        amount_usd: amount,
        tx_hash: txHash,
        wallet_id: walletId,
        status: 'PENDING'
      }]);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Crypto order error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
