// server/src/routes/calls.ts
// Next.js API route handlers for call management

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { supabaseAdmin } from '../lib/supabase';
import { createDailyRoom, createDailyToken, deleteDailyRoom } from '../lib/daily';
import { Call, CreateCallRequest, CreateCallResponse, JoinCallResponse } from '../types';

/**
 * POST /api/calls - Create a new call
 * Creates a Daily.co room and a call record.
 */
export async function createCall(req: NextRequest): Promise<NextResponse> {
  try {
    // Extract user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body: CreateCallRequest = await req.json();
    const { contact_user_id } = body;

    // Get both users' profiles for language info
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: contactProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', contact_user_id)
      .single();

    if (!callerProfile || !contactProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create Daily.co room
    const roomName = `translate-r-${uuid().slice(0, 8)}`;
    const dailyRoom = await createDailyRoom(roomName);

    // Create call record
    const callId = uuid();
    const { data: call, error: insertError } = await supabaseAdmin
      .from('calls')
      .insert({
        id: callId,
        participant_a_id: user.id,
        participant_b_id: contact_user_id,
        daily_room_name: dailyRoom.name,
        daily_room_url: dailyRoom.url,
        status: 'ringing',
        language_a: callerProfile.primary_language,
        language_b: contactProfile.primary_language,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create call:', insertError);
      return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
    }

    // Generate Daily token for caller
    const dailyToken = await createDailyToken(
      dailyRoom.name,
      user.id,
      callerProfile.display_name || callerProfile.email
    );

    const response: CreateCallResponse = {
      call: call as Call,
      daily_token: dailyToken,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/calls/join - Join an existing call
 */
export async function joinCall(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { call_id } = await req.json();

    // Get the call
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is a participant
    if (call.participant_a_id !== user.id && call.participant_b_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Update call status to active
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', call_id);

    // Get user profile for display name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Generate Daily token
    const dailyToken = await createDailyToken(
      call.daily_room_name,
      user.id,
      profile?.display_name || profile?.email || 'User'
    );

    const response: JoinCallResponse = {
      call: call as Call,
      daily_token: dailyToken,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error joining call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/calls/end - End an active call
 */
export async function endCall(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { call_id } = await req.json();

    const { data: call } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .single();

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Update call status
    await supabaseAdmin
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', call_id);

    // Clean up Daily room
    if (call.daily_room_name) {
      try {
        await deleteDailyRoom(call.daily_room_name);
      } catch (e) {
        console.warn('Failed to delete Daily room:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/calls/[id] - Get a specific call
 */
export async function getCall(req: NextRequest, callId: string): Promise<NextResponse> {
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

    return NextResponse.json({ call });
  } catch (error) {
    console.error('Error getting call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
