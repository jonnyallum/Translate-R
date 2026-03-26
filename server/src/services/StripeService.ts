// server/src/services/StripeService.ts
// Handles Stripe customer creation, subscription management, and webhook processing.
// Updates Supabase profiles with subscription status.

import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

// ============================================
// Stripe Product/Price IDs (live)
// ============================================
export const STRIPE_CONFIG = {
  products: {
    pro: 'prod_UDnBIYi3KuMYB6',
    premium: 'prod_UDnBCAL9MbsEKq',
  },
  prices: {
    pro_monthly: 'price_1TFLbT2QwhwnIMuKo3V1u4vp',       // £9.99/mo
    pro_annual: 'price_1TFLbi2QwhwnIMuK9dNqO8bV',         // £99.99/yr
    premium_monthly: 'price_1TFLbd2QwhwnIMuKXQSPjLIj',    // £19.99/mo
    premium_annual: 'price_1TFLbl2QwhwnIMuKXcBBFX7U',     // £199.99/yr
  },
  paymentLinks: {
    pro_monthly: 'https://buy.stripe.com/00wbIU4sj2DK2AaeGQ8EM00',
    premium_monthly: 'https://buy.stripe.com/fZu3coe2Tdio7UuaqA8EM01',
    pro_annual: 'https://buy.stripe.com/6oU9AMcYPcek3Ee1U48EM02',
    premium_annual: 'https://buy.stripe.com/cNi7sEgb12DK5Mm9mw8EM03',
  },
} as const;

// Map price IDs to subscription tiers
const PRICE_TO_TIER: Record<string, string> = {
  [STRIPE_CONFIG.prices.pro_monthly]: 'pro',
  [STRIPE_CONFIG.prices.pro_annual]: 'pro',
  [STRIPE_CONFIG.prices.premium_monthly]: 'premium',
  [STRIPE_CONFIG.prices.premium_annual]: 'premium',
};

// ============================================
// Customer Management
// ============================================

/**
 * Get or create a Stripe customer for a Supabase user.
 */
export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Store customer ID in profile
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

/**
 * Create a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const customerId = await getOrCreateCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
    metadata: {
      supabase_user_id: userId,
    },
  });

  return session.url!;
}

/**
 * Create a Stripe billing portal session for managing subscriptions.
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error('No Stripe customer found for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });

  return session.url;
}

// ============================================
// Webhook Processing
// ============================================

/**
 * Verify and parse a Stripe webhook event.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Process a Stripe webhook event and update Supabase accordingly.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`[Stripe] Processing webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancelled(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('[Stripe] No supabase_user_id in checkout session metadata');
    return;
  }

  // Update customer ID if not already set
  if (session.customer) {
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', userId);
  }

  console.log(`[Stripe] Checkout complete for user ${userId}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    // Try metadata fallback
    const userId = subscription.metadata?.supabase_user_id;
    if (!userId) {
      console.error(`[Stripe] No user found for customer ${customerId}`);
      return;
    }
    await updateSubscriptionStatus(userId, subscription);
    return;
  }

  await updateSubscriptionStatus(profile.id, subscription);
}

async function updateSubscriptionStatus(
  userId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? PRICE_TO_TIER[priceId] || 'pro' : 'pro';

  let status: string;
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = tier;
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      status = 'cancelled';
      break;
    default:
      status = 'free';
  }

  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: status,
      subscription_end_date: endDate,
    })
    .eq('id', userId);

  console.log(`[Stripe] User ${userId} subscription updated: ${status} (until ${endDate})`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Set to cancelled — they keep access until period end
  const endDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_end_date: endDate,
    })
    .eq('id', profile.id);

  console.log(`[Stripe] User ${profile.id} subscription cancelled, access until ${endDate}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  console.log(`[Stripe] Payment failed for user ${profile.id} (${profile.email})`);
  // Future: send email notification, in-app alert, etc.
}

// ============================================
// Subscription Checks (used by API routes)
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface SubscriptionLimits {
  maxCallMinutesPerMonth: number;
  maxUtterancesPerCall: number;
  canAccessTranscriptHistory: boolean;
  canUseAdvancedLanguages: boolean;
  translationQuality: 'standard' | 'enhanced';
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxCallMinutesPerMonth: 30,
    maxUtterancesPerCall: 50,
    canAccessTranscriptHistory: false,
    canUseAdvancedLanguages: false,
    translationQuality: 'standard',
  },
  pro: {
    maxCallMinutesPerMonth: 300,
    maxUtterancesPerCall: 500,
    canAccessTranscriptHistory: true,
    canUseAdvancedLanguages: true,
    translationQuality: 'standard',
  },
  premium: {
    maxCallMinutesPerMonth: -1, // unlimited
    maxUtterancesPerCall: -1,
    canAccessTranscriptHistory: true,
    canUseAdvancedLanguages: true,
    translationQuality: 'enhanced',
  },
};

export function getTierLimits(tier: SubscriptionTier): SubscriptionLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Check if a user's subscription is active (including grace period).
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('subscription_status, subscription_end_date')
    .eq('id', userId)
    .single();

  if (!profile) return 'free';

  const status = profile.subscription_status;

  // If cancelled but still within period, keep access
  if (status === 'cancelled' && profile.subscription_end_date) {
    const endDate = new Date(profile.subscription_end_date);
    if (endDate > new Date()) {
      return 'pro'; // Maintain previous tier until end date
    }
    return 'free';
  }

  if (status === 'pro' || status === 'premium') {
    return status as SubscriptionTier;
  }

  return 'free';
}
