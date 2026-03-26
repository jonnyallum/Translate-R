// server/app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout session for subscribing to Pro or Premium

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { createCheckoutSession, STRIPE_CONFIG } from '../../../../src/services/StripeService';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { price_id, success_url, cancel_url } = await req.json();

    // Validate price ID
    const validPrices = Object.values(STRIPE_CONFIG.prices);
    if (!validPrices.includes(price_id)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email!,
      price_id,
      success_url || 'translater://subscription-success',
      cancel_url || 'translater://subscription-cancel'
    );

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
