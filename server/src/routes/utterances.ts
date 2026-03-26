// server/src/routes/utterances.ts
// API route handlers for utterance management
// Core flow: receive final STT text → translate (literal + natural) → store → broadcast

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { supabaseAdmin } from '../lib/supabase';
import { OpenAITranslationService, normaliseTranscript } from '../services/TranslationService';
import { CreateUtteranceRequest, CreateUtteranceResponse, Utterance } from '../types';

const translationService = new OpenAITranslationService();

/**
 * POST /api/utterances - Create a new utterance
 * 
 * Pipeline:
 * 1. Receive final STT transcript from client
 * 2. Normalise the raw transcript
 * 3. Generate both literal and natural translations (single LLM call)
 * 4. Store in Supabase (triggers Realtime broadcast to both clients)
 * 5. Return the complete utterance
 */
export async function createUtterance(req: NextRequest): Promise<NextResponse> {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = (await req.json()) as CreateUtteranceRequest;
    const {
      call_id,
      source_transcript_raw,
      source_language,
      target_language,
      start_time_ms,
      end_time_ms,
    } = body;

    // Validate the call exists and user is a participant
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (call.participant_a_id !== user.id && call.participant_b_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 });
    }

    // Step 1: Normalise the raw transcript
    const sourceTranscriptClean = normaliseTranscript(source_transcript_raw);

    // Skip empty utterances
    if (!sourceTranscriptClean || sourceTranscriptClean.length <= 1) {
      return NextResponse.json({ error: 'Empty utterance' }, { status: 400 });
    }

    // Step 2: Get the next sequence number for this call
    const { count } = await supabaseAdmin
      .from('utterances')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', call_id);

    const sequenceNumber = (count ?? 0) + 1;

    // Step 3: Generate both translations in a single LLM call
    // If source and target are the same language, skip translation
    let literalTranslation: string;
    let naturalTranslation: string;

    if (source_language === target_language) {
      literalTranslation = sourceTranscriptClean;
      naturalTranslation = sourceTranscriptClean;
    } else {
      const translations = await translationService.translateBoth(
        sourceTranscriptClean,
        source_language,
        target_language
      );
      literalTranslation = translations.literal;
      naturalTranslation = translations.natural;
    }

    // Step 4: Store in Supabase
    // Supabase Realtime will automatically broadcast this INSERT to subscribed clients
    const utteranceId = uuid();
    const { data: utterance, error: insertError } = await supabaseAdmin
      .from('utterances')
      .insert({
        id: utteranceId,
        call_id,
        speaker_user_id: user.id,
        source_language,
        target_language,
        source_transcript_raw,
        source_transcript_clean: sourceTranscriptClean,
        literal_translation: literalTranslation,
        natural_translation: naturalTranslation,
        is_partial: false,
        sequence_number: sequenceNumber,
        start_time_ms: start_time_ms ?? null,
        end_time_ms: end_time_ms ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert utterance:', insertError);
      return NextResponse.json({ error: 'Failed to store utterance' }, { status: 500 });
    }

    const response: CreateUtteranceResponse = {
      utterance: utterance as Utterance,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating utterance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/utterances?call_id=xxx - List all utterances for a call
 * Used for transcript history screen.
 */
export async function listUtterances(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const callId = req.nextUrl.searchParams.get('call_id');
    if (!callId) {
      return NextResponse.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Verify user is a participant
    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (call.participant_a_id !== user.id && call.participant_b_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Fetch all utterances for this call, ordered by sequence
    const { data: utterances, error } = await supabaseAdmin
      .from('utterances')
      .select('*')
      .eq('call_id', callId)
      .eq('is_partial', false)
      .order('sequence_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch utterances' }, { status: 500 });
    }

    return NextResponse.json({ utterances: utterances as Utterance[] });
  } catch (error) {
    console.error('Error listing utterances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
