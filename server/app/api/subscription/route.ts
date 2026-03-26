// server/app/api/subscription/route.ts
// Returns the user's subscription status, tier limits, and pricing info

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/supabase';
import { getUserTier, getTierLimits, STRIPE_CONFIG } from '../../../src/services/StripeService';

export async function GET(req: NextRequest): Promise<NextResponse> {
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

    const tier = await getUserTier(user.id);
    const limits = getTierLimits(tier);

    // Get profile for subscription details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      tier,
      limits,
      subscription: {
        status: profile?.subscription_status || 'free',
        end_date: profile?.subscription_end_date,
        has_stripe_customer: !!profile?.stripe_customer_id,
      },
      pricing: {
        pro: {
          monthly: { price_id: STRIPE_CONFIG.prices.pro_monthly, amount: 999, currency: 'gbp', link: STRIPE_CONFIG.paymentLinks.pro_monthly },
          annual: { price_id: STRIPE_CONFIG.prices.pro_annual, amount: 9999, currency: 'gbp', link: STRIPE_CONFIG.paymentLinks.pro_annual },
        },
        premium: {
          monthly: { price_id: STRIPE_CONFIG.prices.premium_monthly, amount: 1999, currency: 'gbp', link: STRIPE_CONFIG.paymentLinks.premium_monthly },
          annual: { price_id: STRIPE_CONFIG.prices.premium_annual, amount: 19999, currency: 'gbp', link: STRIPE_CONFIG.paymentLinks.premium_annual },
        },
      },
    });
  } catch (error) {
    console.error('[Subscription] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
