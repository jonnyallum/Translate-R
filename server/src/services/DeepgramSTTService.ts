// server/src/services/DeepgramSTTService.ts
// Deepgram Nova-3 Multilingual streaming STT implementation

import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { v4 as uuid } from 'uuid';
import {
  SpeechService,
  STTSession,
  STTSessionConfig,
  AudioEncoding,
} from './SpeechService';
import { LanguageCode, STTResult } from '../types';

// Deepgram language code mapping
const DEEPGRAM_LANGUAGE_MAP: Record<LanguageCode, string> = {
  en: 'en',
  th: 'th',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  vi: 'vi',
  pt: 'pt',
  ar: 'ar',
  hi: 'hi',
};

// Deepgram encoding mapping
const ENCODING_MAP: Record<AudioEncoding, string> = {
  linear16: 'linear16',
  opus: 'opus',
  flac: 'flac',
  mulaw: 'mulaw',
};

export class DeepgramSTTService implements SpeechService {
  readonly provider = 'deepgram';
  private client;

  constructor() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is required');
    }
    this.client = createClient(apiKey);
  }

  async startSession(config: STTSessionConfig): Promise<STTSession> {
    const sessionId = uuid();
    const dgLanguage = DEEPGRAM_LANGUAGE_MAP[config.language];

    if (!dgLanguage) {
      throw new Error(`Language ${config.language} not supported by Deepgram`);
    }

    const connection = this.client.listen.live({
      model: 'nova-3',
      language: dgLanguage,
      smart_format: config.smartFormat ?? true,
      punctuate: config.punctuate ?? true,
      interim_results: config.interimResults ?? true,
      utterance_end_ms: 1500,       // Detect end of utterance after 1.5s silence
      vad_events: true,              // Voice Activity Detection
      encoding: ENCODING_MAP[config.encoding ?? 'linear16'],
      sample_rate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
    });

    return new DeepgramSTTSession(sessionId, connection);
  }

  supportsLanguage(language: LanguageCode): boolean {
    return language in DEEPGRAM_LANGUAGE_MAP;
  }

  getSupportedLanguages(): LanguageCode[] {
    return Object.keys(DEEPGRAM_LANGUAGE_MAP) as LanguageCode[];
  }
}

class DeepgramSTTSession implements STTSession {
  sessionId: string;
  private connection: LiveClient;
  private active = false;
  private resultCallbacks: Array<(result: STTResult) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private closeCallbacks: Array<() => void> = [];

  constructor(sessionId: string, connection: LiveClient) {
    this.sessionId = sessionId;
    this.connection = connection;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.active = true;
      console.log(`[Deepgram] Session ${this.sessionId} opened`);
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0];
      if (!transcript || !transcript.transcript) return;

      const result: STTResult = {
        text: transcript.transcript,
        is_final: data.is_final ?? false,
        confidence: transcript.confidence,
        words: transcript.words?.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
      };

      this.resultCallbacks.forEach((cb) => cb(result));
    });

    // Utterance end event — marks definitive end of a spoken segment
    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      // This fires after silence threshold is met
      // The final transcript was already emitted via the Transcript event
      // We can use this as a signal to commit the utterance
      console.log(`[Deepgram] Session ${this.sessionId} utterance end detected`);
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`[Deepgram] Session ${this.sessionId} error:`, error);
      this.errorCallbacks.forEach((cb) => cb(new Error(String(error))));
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.active = false;
      console.log(`[Deepgram] Session ${this.sessionId} closed`);
      this.closeCallbacks.forEach((cb) => cb());
    });
  }

  sendAudio(chunk: Buffer): void {
    if (!this.active) {
      console.warn(`[Deepgram] Attempted to send audio to inactive session ${this.sessionId}`);
      return;
    }
    this.connection.send((chunk as unknown) as ArrayBuffer);
  }

  onResult(callback: (result: STTResult) => void): void {
    this.resultCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  async close(): Promise<void> {
    if (this.active) {
      this.connection.requestClose();
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }
}
