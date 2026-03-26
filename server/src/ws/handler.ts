// server/src/ws/handler.ts
// WebSocket handler for real-time STT streaming
//
// Flow:
// 1. Client opens WS connection with auth token + call info
// 2. Server opens a Deepgram STT session for the speaker's language
// 3. Client streams audio chunks → server forwards to Deepgram
// 4. Deepgram returns partial/final transcripts → server forwards to client
// 5. On final transcript → server calls translation API → stores utterance
//    (Supabase Realtime handles broadcasting to both clients)
//
// Note: For Vercel deployment, use a separate WebSocket server (e.g., on Railway/Render)
// or use Vercel's experimental WebSocket support. Alternative: use Supabase Edge Functions.

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { supabaseAdmin } from '../lib/supabase';
import { createSpeechService } from '../services/SpeechService';
import { OpenAITranslationService, normaliseTranscript } from '../services/TranslationService';
import { STTSession } from '../services/SpeechService';
import { LanguageCode } from '../types';
import { v4 as uuid } from 'uuid';

const translationService = new OpenAITranslationService();
const speechService = createSpeechService('deepgram');

interface ClientContext {
  userId: string;
  callId: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sttSession: STTSession | null;
  sequenceCounter: number;
}

/**
 * Set up the WebSocket server for STT streaming.
 * Attach to your HTTP server (not Vercel — use Railway/Render for WS).
 */
export function setupWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WS] New connection');

    let context: ClientContext | null = null;

    ws.on('message', async (data: Buffer | string) => {
      try {
        // First message must be JSON auth/config
        if (!context) {
          const message = JSON.parse(data.toString());

          if (message.type !== 'init') {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'First message must be init' } }));
            ws.close();
            return;
          }

          const { token, call_id, source_language, target_language } = message.payload;

          // Verify auth
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (error || !user) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid token' } }));
            ws.close();
            return;
          }

          // Verify call participation
          const { data: call } = await supabaseAdmin
            .from('calls')
            .select('*')
            .eq('id', call_id)
            .single();

          if (!call || (call.participant_a_id !== user.id && call.participant_b_id !== user.id)) {
            ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not a participant' } }));
            ws.close();
            return;
          }

          // Get current utterance count for sequencing
          const { count } = await supabaseAdmin
            .from('utterances')
            .select('*', { count: 'exact', head: true })
            .eq('call_id', call_id);

          context = {
            userId: user.id,
            callId: call_id,
            sourceLanguage: source_language,
            targetLanguage: target_language,
            sttSession: null,
            sequenceCounter: (count ?? 0) + 1,
          };

          // Start STT session
          const sttSession = await speechService.startSession({
            language: source_language,
            sampleRate: 16000,
            encoding: 'linear16',
            interimResults: true,
            punctuate: true,
          });

          context.sttSession = sttSession;

          // Handle STT results
          sttSession.onResult(async (result) => {
            if (result.is_final && result.text.trim()) {
              // Final transcript — translate and store
              await handleFinalTranscript(ws, context!, result.text);
            } else if (!result.is_final && result.text.trim()) {
              // Partial result — send to client for live preview
              ws.send(JSON.stringify({
                type: 'stt_partial',
                payload: {
                  call_id: context!.callId,
                  speaker_user_id: context!.userId,
                  text: result.text,
                },
              }));
            }
          });

          sttSession.onError((error) => {
            console.error('[WS] STT error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'STT error: ' + error.message },
            }));
          });

          sttSession.onClose(() => {
            console.log('[WS] STT session closed');
          });

          ws.send(JSON.stringify({ type: 'ready', payload: { session_id: sttSession.sessionId } }));
          console.log(`[WS] Session initialised for user ${user.id} on call ${call_id}`);
          return;
        }

        // Subsequent messages are audio chunks (binary)
        if (context.sttSession && Buffer.isBuffer(data)) {
          context.sttSession.sendAudio(data);
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Internal error processing message' },
        }));
      }
    });

    ws.on('close', async () => {
      console.log('[WS] Connection closed');
      if (context?.sttSession) {
        await context.sttSession.close();
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });
}

/**
 * Handle a final STT transcript:
 * 1. Normalise text
 * 2. Translate (literal + natural)
 * 3. Store in Supabase (triggers Realtime broadcast)
 * 4. Send confirmation to the speaking client
 */
async function handleFinalTranscript(
  ws: WebSocket,
  context: ClientContext,
  rawText: string
): Promise<void> {
  const cleanText = normaliseTranscript(rawText);
  if (!cleanText || cleanText.length <= 1) return;

  try {
    // Translate both modes in one call
    let literalTranslation: string;
    let naturalTranslation: string;

    if (context.sourceLanguage === context.targetLanguage) {
      literalTranslation = cleanText;
      naturalTranslation = cleanText;
    } else {
      const translations = await translationService.translateBoth(
        cleanText,
        context.sourceLanguage,
        context.targetLanguage
      );
      literalTranslation = translations.literal;
      naturalTranslation = translations.natural;
    }

    // Store utterance — Supabase Realtime broadcasts to both clients
    const utteranceId = uuid();
    const { data: utterance, error } = await supabaseAdmin
      .from('utterances')
      .insert({
        id: utteranceId,
        call_id: context.callId,
        speaker_user_id: context.userId,
        source_language: context.sourceLanguage,
        target_language: context.targetLanguage,
        source_transcript_raw: rawText,
        source_transcript_clean: cleanText,
        literal_translation: literalTranslation,
        natural_translation: naturalTranslation,
        is_partial: false,
        sequence_number: context.sequenceCounter++,
      })
      .select()
      .single();

    if (error) {
      console.error('[WS] Failed to store utterance:', error);
      return;
    }

    // Confirm to the speaking client
    ws.send(JSON.stringify({
      type: 'utterance_created',
      payload: { utterance },
    }));

    console.log(`[WS] Utterance ${utteranceId} created: "${cleanText}" → literal: "${literalTranslation}"`);
  } catch (error) {
    console.error('[WS] Error handling final transcript:', error);
  }
}
