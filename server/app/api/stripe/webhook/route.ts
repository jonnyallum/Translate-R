// server/app/api/stripe/webhook/route.ts
// Stripe webhook endpoint — receives subscription events and updates user tiers
//
// Configure in Stripe Dashboard → Webhooks → Add endpoint:
//   URL: https://your-vercel-url.vercel.app/api/stripe/webhook
//   Events: checkout.session.completed, customer.subscription.created,
//           customer.subscription.updated, customer.subscription.deleted,
//           invoice.payment_failed

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleWebhookEvent } from '../../../../src/services/StripeService';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Verify webhook signature and parse event
    let event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Process the event
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Stripe webhooks need the raw body — disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};
