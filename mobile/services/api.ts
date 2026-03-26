// mobile/services/api.ts
// REST API client for the Translate-R backend

import Constants from 'expo-constants';
import { supabase } from './supabase';
import { Call, Utterance, LanguageCode } from '../types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Calls
// ============================================

export async function createCall(contactUserId: string): Promise<{ call: Call; daily_token: string }> {
  return apiFetch('/api/calls', {
    method: 'POST',
    body: JSON.stringify({ contact_user_id: contactUserId }),
  });
}

export async function joinCall(callId: string): Promise<{ call: Call; daily_token: string }> {
  return apiFetch('/api/calls/join', {
    method: 'POST',
    body: JSON.stringify({ call_id: callId }),
  });
}

export async function endCall(callId: string): Promise<void> {
  await apiFetch('/api/calls/end', {
    method: 'POST',
    body: JSON.stringify({ call_id: callId }),
  });
}

export async function getCall(callId: string): Promise<{ call: Call }> {
  return apiFetch(`/api/calls/${callId}`);
}

// ============================================
// Utterances
// ============================================

export async function createUtterance(params: {
  call_id: string;
  source_transcript_raw: string;
  source_language: LanguageCode;
  target_language: LanguageCode;
  start_time_ms?: number;
  end_time_ms?: number;
}): Promise<{ utterance: Utterance }> {
  return apiFetch('/api/utterances', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listUtterances(callId: string): Promise<{ utterances: Utterance[] }> {
  return apiFetch(`/api/utterances?call_id=${callId}`);
}

// ============================================
// Profiles
// ============================================

export async function searchUsers(query: string): Promise<{ profiles: any[] }> {
  // Search via Supabase directly (RLS allows reading profiles)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return { profiles: data || [] };
}

// ============================================
// Subscriptions
// ============================================

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'premium';
  limits: {
    maxCallMinutesPerMonth: number;
    maxUtterancesPerCall: number;
    canAccessTranscriptHistory: boolean;
    canUseAdvancedLanguages: boolean;
    translationQuality: string;
  };
  subscription: {
    status: string;
    end_date: string | null;
    has_stripe_customer: boolean;
  };
  pricing: {
    pro: { monthly: PriceInfo; annual: PriceInfo };
    premium: { monthly: PriceInfo; annual: PriceInfo };
  };
}

export interface PriceInfo {
  price_id: string;
  amount: number;
  currency: string;
  link: string;
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  return apiFetch('/api/subscription');
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  return apiFetch('/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({
      price_id: priceId,
      success_url: 'translater://subscription-success',
      cancel_url: 'translater://subscription-cancel',
    }),
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return apiFetch('/api/stripe/portal', {
    method: 'POST',
    body: JSON.stringify({ return_url: 'translater://settings' }),
  });
}
