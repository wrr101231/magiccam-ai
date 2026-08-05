import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const COINBASE_API_URL = 'https://api.commerce.coinbase.com/charges';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { plan, amount } = body;

    if (!plan || !amount) {
      return NextResponse.json({ error: 'Missing plan or amount.' }, { status: 400 });
    }

    const coinbaseApiKey = process.env.COINBASE_API_KEY;
    if (!coinbaseApiKey) {
      console.error('Missing COINBASE_API_KEY environment variable');
      return NextResponse.json({ error: 'Coinbase Commerce API Key is not configured.' }, { status: 500 });
    }

    // Call Coinbase Commerce API to create a Charge
    const response = await fetch(COINBASE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': coinbaseApiKey,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify({
        name: `MagicCamAI - ${plan} License`,
        description: 'AI Camera and Video Generation software.',
        pricing_type: 'fixed_price',
        local_price: {
          amount: amount.toString(),
          currency: 'USD'
        },
        metadata: {
          userId: session.userId,
          plan: plan,
        },
        redirect_url: `${SITE_URL}/dashboard?success=true`,
        cancel_url: `${SITE_URL}/pricing?canceled=true`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Coinbase Error: ${data.error?.message || 'Failed to create charge'}`);
    }

    // Return the hosted URL so the user can be redirected to Coinbase Checkout
    const checkoutUrl = data.data.hosted_url;
    
    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Coinbase API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
