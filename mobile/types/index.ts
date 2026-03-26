// mobile/types/index.ts

export type LanguageCode = 'en' | 'th' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'zh' | 'vi' | 'pt' | 'ar' | 'hi';
export type TranslationMode = 'learning' | 'natural';
export type CallStatus = 'pending' | 'ringing' | 'active' | 'ended' | 'missed';

export const SUPPORTED_LANGUAGES: Record<LanguageCode, string> = {
  en: 'English',
  th: 'Thai',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  vi: 'Vietnamese',
  pt: 'Portuguese',
  ar: 'Arabic',
  hi: 'Hindi',
};

export const LANGUAGE_FLAGS: Record<LanguageCode, string> = {
  en: '🇬🇧', th: '🇹🇭', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪',
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳', pt: '🇧🇷',
  ar: '🇸🇦', hi: '🇮🇳',
};

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  primary_language: LanguageCode;
  default_mode: TranslationMode;
  show_original_text: boolean;
  font_size: 'small' | 'medium' | 'large';
  stripe_customer_id: string | null;
  subscription_status: 'free' | 'pro' | 'premium' | 'cancelled';
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Call {
  id: string;
  participant_a_id: string;
  participant_b_id: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  status: CallStatus;
  language_a: LanguageCode;
  language_b: LanguageCode | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Utterance {
  id: string;
  call_id: string;
  speaker_user_id: string;
  source_language: LanguageCode;
  target_language: LanguageCode;
  source_transcript_raw: string | null;
  source_transcript_clean: string | null;
  literal_translation: string | null;
  natural_translation: string | null;
  is_partial: boolean;
  sequence_number: number;
  start_time_ms: number | null;
  end_time_ms: number | null;
  created_at: string;
}

export const FONT_SIZES = {
  small: { subtitle: 14, original: 11 },
  medium: { subtitle: 17, original: 13 },
  large: { subtitle: 20, original: 15 },
} as const;
