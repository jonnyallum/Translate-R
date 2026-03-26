// mobile/app/login.tsx
// Auth screen — sign in / sign up with language picker
// Warm, friendly design matching the language learning vibe

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  LANGUAGE_FLAGS,
} from '../types';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, setLanguage, isLoading } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [step, setStep] = useState<'auth' | 'language' | 'intro'>('auth');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, displayName.trim() || email.split('@')[0]);
        setStep('language');
      } else {
        await signIn(email.trim(), password);
        router.replace('/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed.');
    }
  };

  const handleLanguageSelect = async () => {
    try {
      await setLanguage(selectedLanguage);
      setStep('intro');
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  };

  const handleFinish = () => {
    router.replace('/home');
  };

  // Step 1: Auth form
  if (step === 'auth') {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / branding */}
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🌏</Text>
            <Text style={styles.appName}>Translate-R</Text>
            <Text style={styles.tagline}>
              Video calls with live translation{'\n'}and language learning
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create account' : 'Welcome back'}
            </Text>

            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="Display name"
                placeholderTextColor="#bbb"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: Language selection
  if (step === 'language') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>🗣️</Text>
          <Text style={styles.sectionTitle}>What language do you speak?</Text>
          <Text style={styles.sectionSubtitle}>
            This is your primary language — the one you'll speak during calls.
          </Text>
        </View>

        <View style={styles.languageGrid}>
          {(Object.entries(SUPPORTED_LANGUAGES) as [LanguageCode, string][]).map(
            ([code, name]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageCard,
                  selectedLanguage === code && styles.languageCardSelected,
                ]}
                onPress={() => setSelectedLanguage(code)}
                activeOpacity={0.7}
              >
                <Text style={styles.languageFlag}>{LANGUAGE_FLAGS[code]}</Text>
                <Text
                  style={[
                    styles.languageName,
                    selectedLanguage === code && styles.languageNameSelected,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLanguageSelect}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Feature intro
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.introSection}>
        <Text style={styles.introEmoji}>✨</Text>
        <Text style={styles.sectionTitle}>Two ways to see translations</Text>

        <View style={styles.introCard}>
          <Text style={styles.introCardEmoji}>📖</Text>
          <Text style={styles.introCardTitle}>Learning mode</Text>
          <Text style={styles.introCardDesc}>
            See how the other language is actually structured — word order, particles, and all. Great for understanding how sentences are formed.
          </Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>Thai → English (literal)</Text>
            <Text style={styles.exampleText}>
              "You eat rice already or not-yet [question]"
            </Text>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introCardEmoji}>💬</Text>
          <Text style={styles.introCardTitle}>Natural mode</Text>
          <Text style={styles.introCardDesc}>
            See a polished, natural translation — as if a native speaker said it. Perfect for understanding the meaning.
          </Text>
          <View style={styles.exampleBox}>
            <Text style={styles.exampleLabel}>Same Thai → English (natural)</Text>
            <Text style={styles.exampleText}>"Have you eaten yet?"</Text>
          </View>
        </View>

        <Text style={styles.introHint}>
          You can switch between modes any time during a call with a single tap.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleFinish}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Start using Translate-R</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e0d8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#FEFCF9',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#E8924A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#E8924A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#E8924A',
    fontSize: 14,
    fontWeight: '500',
  },
  // Language selection
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginVertical: 24,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
    minWidth: 140,
  },
  languageCardSelected: {
    borderColor: '#E8924A',
    backgroundColor: '#FFF3E6',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
  },
  languageNameSelected: {
    color: '#E8924A',
    fontWeight: '700',
  },
  // Intro
  introSection: {
    alignItems: 'center',
  },
  introEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  introCardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  introCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  introCardDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  exampleBox: {
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E8924A',
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 15,
    color: '#333',
    fontStyle: 'italic',
  },
  introHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
