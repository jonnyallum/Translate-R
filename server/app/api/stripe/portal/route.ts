// server/app/api/stripe/portal/route.ts
// Creates a Stripe billing portal session for managing subscriptions

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';
import { createPortalSession } from '../../../../src/services/StripeService';

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

    const { return_url } = (await req.json().catch(() => ({}))) as any;

    const portalUrl = await createPortalSession(
      user.id,
      return_url || 'translater://settings'
    );

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('[Portal] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create portal session' }, { status: 500 });
  }
}
