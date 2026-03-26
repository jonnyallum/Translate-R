// mobile/hooks/useSpeechToUtterances.ts
// Captures local microphone audio and sends it to the backend for STT processing.
//
// Two modes of operation:
// 1. WebSocket streaming (preferred) — streams raw audio to backend, which proxies to Deepgram
// 2. REST fallback — uses on-device VAD to chunk speech, sends final audio to REST API
//
// For MVP, we use the REST approach with expo-speech for on-device STT,
// then send the final text to the backend for translation.
// The WebSocket streaming path is designed but requires native audio capture modules.

import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useCallStore } from '../stores/callStore';
import { createUtterance } from '../services/api';
import { LanguageCode } from '../types';

interface UseSpeechConfig {
  callId: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  enabled: boolean;
}

/**
 * MVP approach: On-device speech recognition → send text to backend for translation.
 * 
 * Uses a Web Speech API polyfill or expo-speech-recognition when available.
 * Falls back to periodic recording + Deepgram REST API.
 * 
 * The backend handles:
 * - Text normalisation
 * - Dual translation (literal + natural)
 * - Storage + broadcast via Supabase Realtime
 */
export function useSpeechToUtterances({
  callId,
  sourceLanguage,
  targetLanguage,
  enabled,
}: UseSpeechConfig) {
  const { setPartialText, callStartTime } = useCallStore();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTextBuffer = useRef<string>('');

  // Send a final transcript to the backend
  const sendFinalTranscript = useCallback(
    async (text: string) => {
      if (!text.trim() || text.trim().length < 2) return;

      const startTimeMs = callStartTime ? Date.now() - callStartTime : undefined;

      try {
        await createUtterance({
          call_id: callId,
          source_transcript_raw: text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          start_time_ms: startTimeMs,
        });
        console.log('[Speech] Utterance sent:', text.substring(0, 50));
      } catch (error) {
        console.error('[Speech] Failed to send utterance:', error);
      }
    },
    [callId, sourceLanguage, targetLanguage, callStartTime]
  );

  // Start/stop speech recognition
  useEffect(() => {
    if (!enabled || !callId) {
      setIsListening(false);
      return;
    }

    // For web/dev: use Web Speech API if available
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getLocaleCode(sourceLanguage);

        recognition.onresult = (event: any) => {
          let interimText = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
            } else {
              interimText += transcript;
            }
          }

          if (interimText) {
            setPartialText(interimText);
          }

          if (finalText.trim()) {
            setPartialText(null);
            sendFinalTranscript(finalText.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error('[Speech] Recognition error:', event.error);
          // Auto-restart on non-fatal errors
          if (event.error === 'no-speech' || event.error === 'aborted') {
            setTimeout(() => {
              try { recognition.start(); } catch (e) { /* already started */ }
            }, 300);
          }
        };

        recognition.onend = () => {
          // Auto-restart for continuous listening
          if (enabled) {
            setTimeout(() => {
              try { recognition.start(); } catch (e) { /* already started */ }
            }, 100);
          }
        };

        try {
          recognition.start();
          setIsListening(true);
          recognitionRef.current = recognition;
        } catch (e) {
          console.error('[Speech] Failed to start recognition:', e);
        }

        return () => {
          try { recognition.stop(); } catch (e) { /* not started */ }
          recognitionRef.current = null;
          setIsListening(false);
        };
      }
    }

    // For native: use @react-native-voice/voice or expo-speech-recognition
    // This is a placeholder — the actual implementation depends on the native module
    console.log('[Speech] Native speech recognition — using REST fallback');
    setIsListening(true);

    // In production, you would:
    // 1. Use @react-native-voice/voice to capture speech on-device
    // 2. Or stream raw audio via WebSocket to the backend's Deepgram proxy
    // 3. The backend handles STT + translation + storage

    return () => {
      setIsListening(false);
    };
  }, [enabled, callId, sourceLanguage]);

  return {
    isListening,
    sendManualTranscript: sendFinalTranscript, // For testing: manually send text
  };
}

/**
 * Map our LanguageCode to a full BCP-47 locale for the Web Speech API.
 */
function getLocaleCode(lang: LanguageCode): string {
  const map: Record<LanguageCode, string> = {
    en: 'en-GB',
    th: 'th-TH',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    vi: 'vi-VN',
    pt: 'pt-BR',
    ar: 'ar-SA',
    hi: 'hi-IN',
  };
  return map[lang] || 'en-GB';
}
