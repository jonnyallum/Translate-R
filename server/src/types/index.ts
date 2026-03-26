// server/src/types/index.ts
// Shared types for Translate-R

// ============================================
// Language & Translation
// ============================================

export type LanguageCode = 'en' | 'th' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'zh' | 'vi' | 'pt' | 'ar' | 'hi';

export type TranslationMode = 'learning' | 'natural';

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

// ============================================
// User / Profile
// ============================================

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  primary_language: LanguageCode;
  default_mode: TranslationMode;
  show_original_text: boolean;
  font_size: 'small' | 'medium' | 'large';
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname: string | null;
  created_at: string;
  profile?: Profile; // joined
}

// ============================================
// Call / Conversation
// ============================================

export type CallStatus = 'pending' | 'ringing' | 'active' | 'ended' | 'missed';

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

// ============================================
// Utterance (the core subtitle unit)
// ============================================

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

// ============================================
// API Request / Response types
// ============================================

export interface CreateCallRequest {
  contact_user_id: string;
}

export interface CreateCallResponse {
  call: Call;
  daily_token: string;
}

export interface JoinCallRequest {
  call_id: string;
}

export interface JoinCallResponse {
  call: Call;
  daily_token: string;
}

export interface CreateUtteranceRequest {
  call_id: string;
  source_transcript_raw: string;
  source_language: LanguageCode;
  target_language: LanguageCode;
  start_time_ms?: number;
  end_time_ms?: number;
}

export interface CreateUtteranceResponse {
  utterance: Utterance;
}

// ============================================
// WebSocket message types
// ============================================

export type WSMessageType =
  | 'audio_chunk'
  | 'stt_partial'
  | 'stt_final'
  | 'utterance_created'
  | 'utterance_updated'
  | 'call_status_changed'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}

export interface WSAudioChunk {
  type: 'audio_chunk';
  payload: {
    call_id: string;
    speaker_user_id: string;
    source_language: LanguageCode;
    target_language: LanguageCode;
    audio: string; // base64 encoded audio chunk
  };
}

export interface WSSTTPartial {
  type: 'stt_partial';
  payload: {
    call_id: string;
    speaker_user_id: string;
    text: string;
  };
}

export interface WSSTTFinal {
  type: 'stt_final';
  payload: {
    call_id: string;
    speaker_user_id: string;
    text: string;
  };
}

export interface WSUtteranceCreated {
  type: 'utterance_created';
  payload: {
    utterance: Utterance;
  };
}

// ============================================
// Translation service types
// ============================================

export interface TranslationResult {
  literal: string;
  natural: string;
}

export interface STTResult {
  text: string;
  is_final: boolean;
  confidence?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}
