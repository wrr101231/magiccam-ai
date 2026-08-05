import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia',
});

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

    // Map plans to Stripe Price Objects
    // In production, you would create these Products/Prices in the Stripe Dashboard
    // and pass price IDs. For this dynamic flow, we use price_data.
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: session.email,
      client_reference_id: session.userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MagicCamAI - ${plan} License`,
              description: 'AI Camera and Video Generation software.',
            },
            unit_amount: amount * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${SITE_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.userId,
        plan: plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
