import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function generateLicenseKey() {
  return 'MC-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function verifySignature(rawBody: string, signature: string, sharedSecret: string) {
  const hmac = crypto.createHmac('sha256', sharedSecret);
  hmac.update(rawBody);
  const calculatedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-cc-webhook-signature');
    const sharedSecret = process.env.COINBASE_WEBHOOK_SECRET;

    if (!signature || !sharedSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    if (!verifySignature(rawBody, signature, sharedSecret)) {
      console.error('Coinbase webhook signature verification failed.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    
    // We only care when the charge is confirmed or resolved (fully paid)
    if (event.event?.type === 'charge:confirmed' || event.event?.type === 'charge:resolved') {
      const charge = event.event.data;
      const metadata = charge.metadata || {};
      const userId = metadata.userId;
      const planName = metadata.plan;

      if (!userId || !planName) {
        console.error('Webhook missing userId or plan in metadata');
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 1. Initialize Supabase Admin Client
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS in webhooks
      );

      // 2. Generate new License Key
      const licenseKey = generateLicenseKey();

      // 3. Update the user's active plan and license key
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          active_plan: planName,
          license_key: licenseKey
        })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      // Optional: Insert record into `orders` table
      await supabaseAdmin.from('orders').insert([{
        user_id: userId,
        plan_name: planName,
        amount_usd: parseFloat(charge.pricing.local.amount),
        status: 'APPROVED',
        tx_hash: charge.code // Store the coinbase charge code
      }]);

      console.log(`Successfully provisioned license for user ${userId} for plan ${planName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Coinbase Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
