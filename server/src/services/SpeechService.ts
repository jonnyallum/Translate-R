// server/src/services/SpeechService.ts
// Vendor-agnostic Speech-to-Text interface
// Swap Deepgram for Google Cloud STT (or any other) by implementing this interface

import { LanguageCode, STTResult } from '../types';

/**
 * Abstract interface for streaming Speech-to-Text services.
 * 
 * Implementations must handle:
 * - Opening a persistent WebSocket/stream to the STT provider
 * - Accepting raw audio chunks and forwarding them
 * - Emitting partial and final transcript results
 * - Cleanup on session end
 * 
 * To add a new provider:
 * 1. Create a new class implementing SpeechService
 * 2. Register it in the STT factory (see sttFactory.ts)
 * 3. No mobile app changes needed — the backend proxy handles everything
 */
export interface SpeechService {
  /** Unique identifier for this provider */
  readonly provider: string;

  /**
   * Start a streaming STT session for a given language.
   * Returns a session ID that can be used to send audio and close the session.
   */
  startSession(config: STTSessionConfig): Promise<STTSession>;

  /**
   * Check if this provider supports a given language.
   */
  supportsLanguage(language: LanguageCode): boolean;

  /**
   * Get supported languages for this provider.
   */
  getSupportedLanguages(): LanguageCode[];
}

export interface STTSessionConfig {
  language: LanguageCode;
  sampleRate?: number;      // Default: 16000
  encoding?: AudioEncoding;  // Default: 'linear16'
  channels?: number;         // Default: 1
  interimResults?: boolean;  // Default: true
  punctuate?: boolean;       // Default: true
  smartFormat?: boolean;     // Default: true (Deepgram-specific but useful)
}

export type AudioEncoding = 'linear16' | 'opus' | 'flac' | 'mulaw';

export interface STTSession {
  /** Unique session identifier */
  sessionId: string;

  /**
   * Send an audio chunk to the STT provider.
   * Audio should be raw PCM or the encoding specified in config.
   */
  sendAudio(chunk: Buffer): void;

  /**
   * Register a callback for transcript results (partial + final).
   */
  onResult(callback: (result: STTResult) => void): void;

  /**
   * Register a callback for errors.
   */
  onError(callback: (error: Error) => void): void;

  /**
   * Register a callback for when the session closes.
   */
  onClose(callback: () => void): void;

  /**
   * Close the STT session and clean up resources.
   */
  close(): Promise<void>;

  /** Whether the session is currently active */
  isActive(): boolean;
}

/**
 * Factory to get the right SpeechService implementation.
 * Currently defaults to Deepgram; add more providers here.
 */
export type STTProvider = 'deepgram' | 'google' | 'native';

export function createSpeechService(provider: STTProvider = 'deepgram'): SpeechService {
  switch (provider) {
    case 'deepgram':
      // Lazy import to avoid loading unnecessary deps
      const { DeepgramSTTService } = require('./DeepgramSTTService');
      return new DeepgramSTTService();
    case 'google':
      throw new Error('Google Cloud STT not yet implemented. Use Deepgram for now.');
    case 'native':
      throw new Error('Native STT is handled on-device, not on the backend.');
    default:
      throw new Error(`Unknown STT provider: ${provider}`);
  }
}
