// mobile/app/pricing.tsx
// Subscription pricing screen — shows Free/Pro/Premium tiers
// Opens Stripe payment links or Checkout sessions for subscription

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { getSubscription, SubscriptionInfo, createPortalSession } from '../services/api';

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await getSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (link: string) => {
    try {
      await Linking.openURL(link);
    } catch (error) {
      Alert.alert('Error', 'Could not open payment page. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await createPortalSession();
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open billing portal.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#E8924A" />
      </View>
    );
  }

  const currentTier = subscription?.tier || 'free';
  const pricing = subscription?.pricing;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited translated video calls
        </Text>
      </View>

      {/* Billing toggle */}
      <View style={styles.billingToggle}>
        <TouchableOpacity
          style={[styles.billingBtn, billingPeriod === 'monthly' && styles.billingBtnActive]}
          onPress={() => setBillingPeriod('monthly')}
        >
          <Text style={[styles.billingText, billingPeriod === 'monthly' && styles.billingTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.billingBtn, billingPeriod === 'annual' && styles.billingBtnActive]}
          onPress={() => setBillingPeriod('annual')}
        >
          <Text style={[styles.billingText, billingPeriod === 'annual' && styles.billingTextActive]}>
            Annual
          </Text>
          <View style={styles.saveBadge}>
            <Text style={styles.saveText}>Save 17%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Free tier */}
      <View style={[styles.planCard, currentTier === 'free' && styles.planCardCurrent]}>
        {currentTier === 'free' && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current plan</Text></View>}
        <Text style={styles.planName}>Free</Text>
        <Text style={styles.planPrice}>£0</Text>
        <Text style={styles.planPeriod}>forever</Text>
        <View style={styles.featuresBlock}>
          <FeatureRow text="30 min calls per month" />
          <FeatureRow text="50 utterances per call" />
          <FeatureRow text="Learning + Natural modes" />
          <FeatureRow text="6 core languages" />
          <FeatureRow text="No transcript history" muted />
        </View>
      </View>

      {/* Pro tier */}
      <View style={[styles.planCard, styles.planCardHighlight, currentTier === 'pro' && styles.planCardCurrent]}>
        {currentTier === 'pro' && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current plan</Text></View>}
        <View style={styles.popularBadge}><Text style={styles.popularText}>Most popular</Text></View>
        <Text style={styles.planName}>Pro</Text>
        <Text style={styles.planPrice}>
          {billingPeriod === 'monthly' ? '£9.99' : '£99.99'}
        </Text>
        <Text style={styles.planPeriod}>
          per {billingPeriod === 'monthly' ? 'month' : 'year'}
          {billingPeriod === 'annual' ? ' (£8.33/mo)' : ''}
        </Text>
        <View style={styles.featuresBlock}>
          <FeatureRow text="5 hours of calls per month" highlight />
          <FeatureRow text="500 utterances per call" highlight />
          <FeatureRow text="Learning + Natural modes" />
          <FeatureRow text="All 12 languages" highlight />
          <FeatureRow text="Full transcript history" highlight />
        </View>
        {currentTier !== 'pro' && currentTier !== 'premium' && pricing && (
          <TouchableOpacity
            style={styles.subscribeBtn}
            onPress={() => handleSubscribe(
              billingPeriod === 'monthly'
                ? pricing.pro.monthly.link
                : pricing.pro.annual.link
            )}
            activeOpacity={0.8}
          >
            <Text style={styles.subscribeBtnText}>Subscribe to Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Premium tier */}
      <View style={[styles.planCard, currentTier === 'premium' && styles.planCardCurrent]}>
        {currentTier === 'premium' && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current plan</Text></View>}
        <Text style={styles.planName}>Premium</Text>
        <Text style={styles.planPrice}>
          {billingPeriod === 'monthly' ? '£19.99' : '£199.99'}
        </Text>
        <Text style={styles.planPeriod}>
          per {billingPeriod === 'monthly' ? 'month' : 'year'}
          {billingPeriod === 'annual' ? ' (£16.66/mo)' : ''}
        </Text>
        <View style={styles.featuresBlock}>
          <FeatureRow text="Unlimited calls" highlight />
          <FeatureRow text="Unlimited utterances" highlight />
          <FeatureRow text="Learning + Natural modes" />
          <FeatureRow text="All 12 languages" />
          <FeatureRow text="Full transcript history" />
          <FeatureRow text="Enhanced translation quality" highlight />
          <FeatureRow text="Priority support" highlight />
        </View>
        {currentTier !== 'premium' && pricing && (
          <TouchableOpacity
            style={[styles.subscribeBtn, styles.subscribeBtnPremium]}
            onPress={() => handleSubscribe(
              billingPeriod === 'monthly'
                ? pricing.premium.monthly.link
                : pricing.premium.annual.link
            )}
            activeOpacity={0.8}
          >
            <Text style={styles.subscribeBtnText}>Subscribe to Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Manage subscription link */}
      {currentTier !== 'free' && (
        <TouchableOpacity style={styles.manageBtn} onPress={handleManageSubscription}>
          <Text style={styles.manageBtnText}>Manage subscription</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Payments processed securely by Stripe. Cancel any time.
      </Text>
    </ScrollView>
  );
}

function FeatureRow({ text, highlight, muted }: { text: string; highlight?: boolean; muted?: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureCheck}>{muted ? '—' : '✓'}</Text>
      <Text style={[styles.featureText, highlight && styles.featureHighlight, muted && styles.featureMuted]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8F0' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' },
  header: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#888', marginTop: 6 },
  billingToggle: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  billingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e0d8',
  },
  billingBtnActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  billingText: { fontSize: 14, fontWeight: '600', color: '#888' },
  billingTextActive: { color: '#fff' },
  saveBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  saveText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  planCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 14,
    borderWidth: 1, borderColor: '#e8e0d8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  planCardHighlight: { borderColor: '#E8924A', borderWidth: 2 },
  planCardCurrent: { borderColor: '#4CAF50', borderWidth: 2 },
  currentBadge: { backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32', textTransform: 'uppercase', letterSpacing: 0.5 },
  popularBadge: { backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  popularText: { fontSize: 11, fontWeight: '700', color: '#E65100', textTransform: 'uppercase', letterSpacing: 0.5 },
  planName: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  planPrice: { fontSize: 36, fontWeight: '800', color: '#1a1a1a', marginTop: 4 },
  planPeriod: { fontSize: 14, color: '#888', marginBottom: 16 },
  featuresBlock: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureCheck: { fontSize: 14, color: '#4CAF50', fontWeight: '700', width: 18 },
  featureText: { fontSize: 14, color: '#555', flex: 1 },
  featureHighlight: { color: '#1a1a1a', fontWeight: '600' },
  featureMuted: { color: '#bbb', fontStyle: 'italic' },
  subscribeBtn: {
    backgroundColor: '#E8924A', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#E8924A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  subscribeBtnPremium: { backgroundColor: '#1a1a1a', shadowColor: '#000' },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  manageBtn: { alignItems: 'center', paddingVertical: 16 },
  manageBtnText: { fontSize: 15, color: '#E8924A', fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 12 },
});
