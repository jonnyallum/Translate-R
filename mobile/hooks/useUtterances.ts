// mobile/hooks/useUtterances.ts
// Subscribes to Supabase Realtime to receive live utterance updates
// Both clients on a call receive new utterances instantly via Postgres changes

import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useCallStore } from '../stores/callStore';
import { Utterance } from '../types';

export function useUtterances(callId: string | undefined) {
  const { addUtterance, utterances } = useCallStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!callId) return;

    // Subscribe to INSERT events on the utterances table for this call
    const channel = supabase
      .channel(`utterances:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'utterances',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const newUtterance = payload.new as Utterance;

          // Only add finalised utterances (not partials)
          if (!newUtterance.is_partial) {
            addUtterance(newUtterance);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useUtterances] Subscription status for call ${callId}:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [callId]);

  return { utterances };
}
